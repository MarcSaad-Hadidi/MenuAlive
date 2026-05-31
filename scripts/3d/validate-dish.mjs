#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { unzlibSync } from "fflate";

import {
  asArray,
  defaultDishManifestPath,
  parseArgs,
  publicUrlToFilePath,
  readJsonFile,
  setExitCodeForResult,
  writeStdout
} from "./shared/file-utils.mjs";
import { mergeValidationResults } from "./shared/validators/file-exists.mjs";
import { validateGlbBasic } from "./shared/validators/glb-basic.mjs";
import { validateDishManifest } from "./shared/manifest-schema.mjs";
import { addFail, createValidationResult, validateFileExists } from "./shared/validators/file-exists.mjs";
import { validateSha256 } from "./shared/validators/sha256.mjs";
import { validateUsdzBasic } from "./shared/validators/usdz-basic.mjs";

const VISUAL_RATIO_EPSILON = 0.000001;

function variantRole(key) {
  if (key === "iosUsdz") return "iosUsdz";
  if (key === "arLite") return "arLite";
  return key;
}

export function collectManifestAssets(manifest) {
  return Object.entries(manifest.variants ?? {}).map(([key, variant]) => ({
    role: variantRole(key),
    url: variant.url,
    label: `${manifest.restaurantSlug}/${manifest.menuSlug}/${manifest.dishSlug}/${key}`,
    productionQuickLook: key === "iosUsdz"
  }));
}

function validateFileMatchesManifest({ filePath, variant, label }) {
  const result = createValidationResult({
    name: "manifest-file-integrity",
    metrics: {
      filePath,
      expectedBytes: variant.bytes,
      actualBytes: 0,
      expectedSha256: variant.sha256
    }
  });
  const exists = validateFileExists({ filePath, label });
  result.warnings.push(...exists.warnings);
  result.fails.push(...exists.fails);
  result.evidence.push(...exists.evidence);
  result.metrics.actualBytes = exists.metrics.bytes;
  if (!exists.ok) {
    result.ok = false;
    return result;
  }
  if (Number(variant.bytes) !== exists.metrics.bytes) {
    addFail(result, `${label}: manifest bytes do not match local file bytes`, {
      filePath,
      expectedBytes: variant.bytes,
      actualBytes: exists.metrics.bytes
    });
  }
  const hash = validateSha256({ filePath, expectedSha256: variant.sha256, label });
  result.warnings.push(...hash.warnings);
  result.fails.push(...hash.fails);
  result.evidence.push(...hash.evidence);
  if (!hash.ok) result.ok = false;
  return result;
}

function evidenceReference(value) {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  return String(value.path ?? value.url ?? value.href ?? "").trim();
}

function resolveEvidencePath(reference, rootDir) {
  const ref = evidenceReference(reference);
  if (
    !ref ||
    ref.startsWith("/") ||
    ref.startsWith("\\") ||
    ref.startsWith("//") ||
    ref.includes("\\") ||
    /[?#]/.test(ref) ||
    /^(?:https?|data|file|javascript):/i.test(ref)
  ) {
    return null;
  }
  const root = normalize(resolve(rootDir));
  const fullPath = normalize(resolve(rootDir, ref));
  if (fullPath !== root && !fullPath.startsWith(`${root}${sep}`)) return null;
  return fullPath;
}

function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function paethPredictor(left, up, upperLeft) {
  const estimate = left + up - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) return left;
  if (upDistance <= upperLeftDistance) return up;
  return upperLeft;
}

function unfilterPngScanline(filter, scanline, previous, bytesPerPixel) {
  const output = Buffer.alloc(scanline.length);
  for (let index = 0; index < scanline.length; index += 1) {
    const raw = scanline[index];
    const left = index >= bytesPerPixel ? output[index - bytesPerPixel] : 0;
    const up = previous?.[index] ?? 0;
    const upperLeft = index >= bytesPerPixel ? previous?.[index - bytesPerPixel] ?? 0 : 0;
    if (filter === 0) output[index] = raw;
    else if (filter === 1) output[index] = (raw + left) & 0xff;
    else if (filter === 2) output[index] = (raw + up) & 0xff;
    else if (filter === 3) output[index] = (raw + Math.floor((left + up) / 2)) & 0xff;
    else if (filter === 4) output[index] = (raw + paethPredictor(left, up, upperLeft)) & 0xff;
    else throw new Error(`PNG uses unsupported filter type ${filter}`);
  }
  return output;
}

function parsePngImage(bytes) {
  if (!bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))) {
    throw new Error("image must be a PNG for strict visual evidence");
  }
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let sawIdat = false;
  let sawIend = false;
  const idatParts = [];
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.subarray(offset + 4, offset + 8).toString("ascii");
    const start = offset + 8;
    const end = start + length;
    if (end + 4 > bytes.length) throw new Error("PNG chunk exceeds file bounds");
    const data = bytes.subarray(start, end);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      sawIdat = true;
      idatParts.push(data);
    } else if (type === "IEND") {
      sawIend = true;
      break;
    }
    offset = end + 4;
  }
  if (!width || !height) throw new Error("PNG IHDR dimensions are missing");
  if (!sawIdat || !sawIend) throw new Error("PNG must include IDAT and IEND chunks");
  if (bitDepth !== 8 || ![2, 6].includes(colorType)) {
    throw new Error("PNG strict visual evidence must use 8-bit RGB or RGBA pixels");
  }
  const channels = colorType === 6 ? 4 : 3;
  const raw = Buffer.from(unzlibSync(Buffer.concat(idatParts)));
  const stride = width * channels;
  if (raw.length !== (stride + 1) * height) throw new Error("PNG pixel buffer has unexpected size");
  const pixels = Buffer.alloc(width * height * 4);
  let previous = Buffer.alloc(stride);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (stride + 1);
    const row = unfilterPngScanline(raw[rowStart], raw.subarray(rowStart + 1, rowStart + 1 + stride), previous, channels);
    for (let x = 0; x < width; x += 1) {
      const source = x * channels;
      const target = (y * width + x) * 4;
      pixels[target] = row[source];
      pixels[target + 1] = row[source + 1];
      pixels[target + 2] = row[source + 2];
      pixels[target + 3] = channels === 4 ? row[source + 3] : 255;
    }
    previous = row;
  }
  return { format: "png", width, height, pixels };
}

function imageSignatureFormat(filePath) {
  const bytes = readFileSync(filePath);
  if (bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))) return "png";
  if (bytes.subarray(0, 3).equals(Buffer.from("ffd8ff", "hex"))) return "jpeg";
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }
  return "";
}

function relativeDifference(before, after) {
  if (before.width !== after.width || before.height !== after.height) {
    throw new Error("visual comparison images must share dimensions");
  }
  let changed = 0;
  let absoluteDelta = 0;
  const pixelCount = before.width * before.height;
  for (let index = 0; index < before.pixels.length; index += 4) {
    const dr = Math.abs(before.pixels[index] - after.pixels[index]);
    const dg = Math.abs(before.pixels[index + 1] - after.pixels[index + 1]);
    const db = Math.abs(before.pixels[index + 2] - after.pixels[index + 2]);
    const delta = dr + dg + db;
    if (delta > 0) changed += 1;
    absoluteDelta += delta / (255 * 3);
  }
  const meanDelta = absoluteDelta / pixelCount;
  return {
    diffRatio: changed / pixelCount,
    perceptualScore: 1 - meanDelta
  };
}

function visibleDiffCoverage(image) {
  let visible = 0;
  const pixelCount = image.width * image.height;
  for (let index = 0; index < image.pixels.length; index += 4) {
    const alpha = image.pixels[index + 3];
    const hasVisibleColor = image.pixels[index] > 0 || image.pixels[index + 1] > 0 || image.pixels[index + 2] > 0;
    if (alpha > 0 && hasVisibleColor) visible += 1;
  }
  return visible / pixelCount;
}

function simpleSsim(before, after) {
  if (before.width !== after.width || before.height !== after.height) return 0;
  const valuesA = [];
  const valuesB = [];
  for (let index = 0; index < before.pixels.length; index += 4) {
    valuesA.push((0.2126 * before.pixels[index] + 0.7152 * before.pixels[index + 1] + 0.0722 * before.pixels[index + 2]) / 255);
    valuesB.push((0.2126 * after.pixels[index] + 0.7152 * after.pixels[index + 1] + 0.0722 * after.pixels[index + 2]) / 255);
  }
  const meanA = valuesA.reduce((sum, value) => sum + value, 0) / valuesA.length;
  const meanB = valuesB.reduce((sum, value) => sum + value, 0) / valuesB.length;
  let varianceA = 0;
  let varianceB = 0;
  let covariance = 0;
  for (let index = 0; index < valuesA.length; index += 1) {
    varianceA += (valuesA[index] - meanA) ** 2;
    varianceB += (valuesB[index] - meanB) ** 2;
    covariance += (valuesA[index] - meanA) * (valuesB[index] - meanB);
  }
  varianceA /= valuesA.length;
  varianceB /= valuesB.length;
  covariance /= valuesA.length;
  const c1 = 0.01 ** 2;
  const c2 = 0.03 ** 2;
  return ((2 * meanA * meanB + c1) * (2 * covariance + c2)) /
    ((meanA ** 2 + meanB ** 2 + c1) * (varianceA + varianceB + c2));
}

function validateLocalEvidenceFile({ reference, rootDir, label, image = false }) {
  const result = createValidationResult({
    name: "visual-evidence-file",
    metrics: {
      reference: evidenceReference(reference),
      filePath: "",
      image
    }
  });
  const filePath = resolveEvidencePath(reference, rootDir);
  result.metrics.filePath = filePath ?? "";
  if (!filePath) {
    return addFail(result, `${label}: visual evidence path must be a local relative path under the workspace`);
  }
  const exists = validateFileExists({ filePath, label });
  result.warnings.push(...exists.warnings);
  result.fails.push(...exists.fails);
  result.evidence.push(...exists.evidence);
  if (!exists.ok) {
    result.ok = false;
    return result;
  }
  const bytes = readFileSync(filePath);
  const actualSha256 = sha256Bytes(bytes);
  result.metrics.sha256 = actualSha256;
  const expectedSha256 = typeof reference === "object" && reference ? reference.sha256 : "";
  if (!expectedSha256 || expectedSha256 !== actualSha256) {
    addFail(result, `${label}: visual evidence sha256 must match the referenced file`);
  }
  if (image) {
    let imageInfo;
    try {
      imageInfo = parsePngImage(bytes);
    } catch (error) {
      addFail(result, `${label}: ${error.message}`);
      return result;
    }
    result.metrics.width = imageInfo.width;
    result.metrics.height = imageInfo.height;
    if (imageInfo.width < 64 || imageInfo.height < 64) {
      addFail(result, `${label}: visual evidence image must be at least 64x64 pixels`);
    }
    const expectedWidth = typeof reference === "object" && reference ? reference.width : undefined;
    const expectedHeight = typeof reference === "object" && reference ? reference.height : undefined;
    if (expectedWidth !== imageInfo.width || expectedHeight !== imageInfo.height) {
      addFail(result, `${label}: visual evidence dimensions must match the referenced file`);
    }
  }
  return result;
}

function validateRenderedComparisonTriplet({ triplet, rootDir, label, expected = {} }) {
  const result = createValidationResult({
    name: "visual-render-comparison",
    metrics: { label }
  });
  try {
    const refs = ["before", "after", "diff"].map((key) => ({
      key,
      ref: triplet?.[key],
      filePath: resolveEvidencePath(triplet?.[key], rootDir)
    }));
    if (refs.some((item) => !item.filePath)) return result;
    const decoded = Object.fromEntries(
      refs.map((item) => [item.key, parsePngImage(readFileSync(item.filePath))])
    );
    const hashes = Object.fromEntries(
      refs.map((item) => [item.key, sha256Bytes(readFileSync(item.filePath))])
    );
    if (new Set(Object.values(hashes)).size !== 3) {
      addFail(result, `${label}: before, after, and diff images must be distinct files`);
    }
    const comparison = relativeDifference(decoded.before, decoded.after);
    if (decoded.before.width !== decoded.diff.width || decoded.before.height !== decoded.diff.height) {
      throw new Error("visual comparison images must share dimensions");
    }
    const ssim = simpleSsim(decoded.before, decoded.after);
    result.metrics.maxDiffRatio = comparison.diffRatio;
    result.metrics.perceptualScore = comparison.perceptualScore;
    result.metrics.ssim = ssim;
    if (Number.isFinite(expected.maxDiffRatio) && comparison.diffRatio > expected.maxDiffRatio + VISUAL_RATIO_EPSILON) {
      addFail(result, `${label}: recomputed diff ratio exceeds reported threshold`);
    }
    if (Number.isFinite(expected.perceptualScore) && comparison.perceptualScore + VISUAL_RATIO_EPSILON < expected.perceptualScore) {
      addFail(result, `${label}: recomputed perceptual score is below the report`);
    }
    if (Number.isFinite(expected.ssim) && ssim + VISUAL_RATIO_EPSILON < expected.ssim) {
      addFail(result, `${label}: recomputed SSIM is below the report`);
    }
    const diffCoverage = visibleDiffCoverage(decoded.diff);
    result.metrics.diffImageCoverage = diffCoverage;
    if (diffCoverage === 0) {
      addFail(result, `${label}: diff image must not be blank`);
    }
    if (comparison.diffRatio === 0 && diffCoverage > VISUAL_RATIO_EPSILON) {
      addFail(result, `${label}: diff image marks changes when before and after are identical`);
    }
    const coverageTolerance = Math.max(VISUAL_RATIO_EPSILON, 1 / (decoded.diff.width * decoded.diff.height));
    if (comparison.diffRatio > 0 && Math.abs(diffCoverage - comparison.diffRatio) > coverageTolerance) {
      addFail(result, `${label}: diff image coverage must match the recomputed before/after delta`);
    }
  } catch (error) {
    addFail(result, `${label}: unable to recompute rendered comparison metrics: ${error.message}`);
  }
  return result;
}

function visualEvidenceChecks({ manifest, rootDir }) {
  const checks = [];
  const visualQuality = manifest.visualQuality ?? {};
  if (visualQuality.report) {
    checks.push(
      validateLocalEvidenceFile({
        reference: visualQuality.report,
        rootDir,
        label: "visualQuality.report"
      })
    );
  }

  for (const [variantKey, triplet] of Object.entries(visualQuality.reportArtifacts ?? {})) {
    for (const role of ["before", "after", "diff"]) {
      checks.push(
        validateLocalEvidenceFile({
          reference: triplet?.[role],
          rootDir,
          label: `visualQuality.reportArtifacts.${variantKey}.${role}`,
          image: true
        })
      );
    }
    checks.push(
      validateRenderedComparisonTriplet({
        triplet,
        rootDir,
        label: `visualQuality.reportArtifacts.${variantKey}`,
        expected: visualQuality
      })
    );
  }

  for (const [index, angleReport] of (visualQuality.angleReports ?? []).entries()) {
    for (const role of ["before", "after", "diff"]) {
      checks.push(
        validateLocalEvidenceFile({
          reference: angleReport?.[role],
          rootDir,
          label: `visualQuality.angleReports[${index}].${role}`,
          image: true
        })
      );
    }
    checks.push(
      validateRenderedComparisonTriplet({
        triplet: angleReport,
        rootDir,
        label: `visualQuality.angleReports[${index}]`,
        expected: angleReport
      })
    );
  }
  return checks;
}

function validatePosterImage({ filePath, label }) {
  const result = createValidationResult({
    name: "poster-image",
    metrics: {
      filePath
    }
  });
  const format = imageSignatureFormat(filePath);
  if (!format) {
    addFail(result, `${label}: poster image must be PNG, JPEG, or WebP`);
  }
  if (String(filePath).toLowerCase().endsWith(".webp") && format !== "webp") {
    addFail(result, `${label}: poster extension and image signature must match`);
  }
  if (String(filePath).toLowerCase().endsWith(".png") && format !== "png") {
    addFail(result, `${label}: poster extension and image signature must match`);
  }
  if (format === "png") {
    try {
      const image = parsePngImage(readFileSync(filePath));
      result.metrics.width = image.width;
      result.metrics.height = image.height;
      if (image.width < 64 || image.height < 64) {
        addFail(result, `${label}: poster image must be at least 64x64 pixels`);
      }
    } catch (error) {
      addFail(result, `${label}: ${error.message}`);
    }
  }
  return result;
}

function validateStrictUsdzFootprint({ filePath, label }) {
  const result = createValidationResult({
    name: "strict-usdz-footprint",
    metrics: {
      filePath,
      bytes: 0
    }
  });
  const bytes = readFileSync(filePath);
  result.metrics.bytes = bytes.length;
  if (bytes.length < 50_000) {
    addFail(result, `${label}: faithful production USDZ evidence must not be a tiny proxy package`);
  }
  return result;
}

export function validateDishManifestPipeline({
  manifest,
  manifestPath = "",
  context = "production",
  requireFiles = false,
  rootDir = process.cwd(),
  strict = false
} = {}) {
  const checks = [validateDishManifest(manifest, { context })];

  if (context === "production" && strict && ["approved", "published"].includes(manifest?.status)) {
    if (manifest?.schemaVersion !== 2) {
      checks.push({
        name: "strict-production-schema",
        ok: false,
        warnings: [],
        fails: ["schemaVersion: production publish requires schemaVersion 2"],
        metrics: { schemaVersion: manifest?.schemaVersion },
        evidence: []
      });
    }
    checks.push(...visualEvidenceChecks({ manifest, rootDir }));
  }

  if (requireFiles) {
    for (const [key, variant] of Object.entries(manifest.variants ?? {})) {
      const filePath = publicUrlToFilePath(variant.url, rootDir);
      const label = `${manifestPath || manifest.dishSlug} variants.${key}`;
      if (!filePath || !existsSync(filePath)) {
        checks.push({
          name: "file-required",
          ok: false,
          warnings: [],
          fails: [`${label}: referenced file is required but missing`],
          metrics: { filePath, url: variant.url },
          evidence: [{ filePath, url: variant.url }]
        });
        continue;
      }
      checks.push(validateFileMatchesManifest({ filePath, variant, label }));
      if (key === "iosUsdz") {
        checks.push(
          validateUsdzBasic({
            filePath,
            url: variant.url,
            label,
            expectedSha256: variant.sha256
          })
        );
        if (strict && ["approved", "published"].includes(manifest?.status)) {
          checks.push(validateStrictUsdzFootprint({ filePath, label }));
        }
      } else if (["web", "mobile", "arLite"].includes(key)) {
        checks.push(
          validateGlbBasic({
            filePath,
            role: key,
            label,
            expectedSha256: variant.sha256,
            production: context === "production"
          })
        );
      } else if (key === "poster" && strict && ["approved", "published"].includes(manifest?.status)) {
        checks.push(validatePosterImage({ filePath, label }));
      }
    }
  }

  const result = mergeValidationResults(checks, {
    name: "3d-validate-dish",
    metrics: { manifestPath, context, strict, requireFiles }
  });
  if (strict && result.warnings.length > 0) result.ok = false;
  return result;
}

export function runValidateDishCli(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const manifestPaths = asArray(args.manifest ?? args["dish-manifest"] ?? defaultDishManifestPath());
  const results = manifestPaths.map((manifestPath) =>
    validateDishManifestPipeline({
      manifest: readJsonFile(manifestPath),
      manifestPath,
      context: args.context ?? "production",
      requireFiles: Boolean(args["require-files"]),
      rootDir: args.root ?? process.cwd(),
      strict: Boolean(args.strict)
    })
  );
  const result = mergeValidationResults(results, {
    name: "3d-validate",
    metrics: { manifestPaths }
  });
  setExitCodeForResult(result, Boolean(args.strict));
  writeStdout(result, true);
  return result;
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  runValidateDishCli();
}
