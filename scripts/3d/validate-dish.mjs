#!/usr/bin/env node
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

export function validateDishManifestPipeline({
  manifest,
  manifestPath = "",
  context = "production",
  requireFiles = false,
  rootDir = process.cwd(),
  strict = false
} = {}) {
  const checks = [validateDishManifest(manifest, { context })];

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
