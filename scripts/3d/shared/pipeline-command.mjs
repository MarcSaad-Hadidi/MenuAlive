import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { basename, dirname, join, normalize, relative, resolve, sep } from "node:path";

import { zipSync } from "fflate";

import { parseArgs, readJsonFile, writeStdout } from "./file-utils.mjs";
import {
  summarizeRestaurantManifest
} from "./manifest-schema.mjs";
import { encodePngImage } from "./png-image.mjs";
import { collectManifestAssets, validateDishManifestPipeline, validateVisualEvidence } from "../validate-dish.mjs";

const HELP = `Vistaire 3D production command

Required identity flags:
  --restaurant <slug>  Restaurant slug
  --menu <slug>        Menu slug
  --dish <slug>        Dish slug
  --version <version>  Asset version

Write safety:
  --write                    Actually write outputs
  --root <path>              Workspace/root directory, defaults to cwd
  --allow-public-binaries    Allow writing runtime GLB/USDZ/poster files under public/models/restaurants
  --approved-by <name>       Required for approved/publish/rollback operations
  --cdn-base-url <url>       Rewrite generated variant URLs to an approved CDN/storage origin
`;

const VARIANT_DIRS = Object.freeze({
  web: "web",
  mobile: "mobile",
  arLite: "ar-lite",
  iosUsdz: "ios",
  poster: "poster"
});

const VARIANT_FILES = Object.freeze({
  web: (slug) => `${slug}-web.glb`,
  mobile: (slug) => `${slug}-mobile.glb`,
  arLite: (slug) => `${slug}-ar-lite.glb`,
  iosUsdz: (slug) => `${slug}.usdz`,
  poster: (slug) => `${slug}.png`
});

const STRICT_VISUAL_PROMISE =
  "visually indistinguishable under deterministic multi-angle mobile dining-distance review within strict thresholds";
const STRICT_VISUAL_THRESHOLDS = Object.freeze({
  meanSsim: 0.985,
  perceptualScore: 0.98,
  maxDiffRatio: 0.004,
  maxSilhouetteDiff: 0.002,
  maxColorDelta: 0.015,
  maxTextureBlurDelta: 0.02,
  maxMaterialDrift: 0.02,
  maxScaleDriftMeters: 0.003,
  maxOriginDriftMeters: 0.003,
  maxLowPolyVisibility: 0.01,
  minAppetitePreservation: 0.98
});
const STRICT_VISUAL_REJECTION =
  "Strict rendered visual identity evidence is required before optimization can be approved: source/candidate before-after-diff renders for web, mobile, and arLite, per-angle SSIM/perceptual scores, texture/silhouette/color/material/scale/origin/low-poly/appetite checks, and human approval.";
const CANDIDATE_PROFILES = Object.freeze(["conservative", "balanced", "aggressive"]);

function pendingRealDeviceQa() {
  return {
    required: true,
    iphoneQuickLook: {
      required: true,
      status: "not-tested",
      device: null,
      os: null,
      testedBy: null,
      testedAt: null
    },
    androidSceneViewer: {
      required: true,
      status: "not-tested",
      device: null,
      os: null,
      testedBy: null,
      testedAt: null
    }
  };
}

function createReviewPosterPng({ analysis }) {
  const width = 512;
  const height = 512;
  const pixels = Buffer.alloc(width * height * 4);
  const plateRadiusX = Math.round(width * 0.34);
  const plateRadiusY = Math.round(height * 0.2);
  const centerX = Math.round(width / 2);
  const centerY = Math.round(height * 0.55);
  const triangleTone = Math.max(64, Math.min(220, 120 + Math.round((analysis.triangles ?? 0) % 80)));
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const vignette = Math.round(22 * Math.hypot((x - centerX) / width, (y - centerY) / height));
      pixels[index] = Math.max(8, 24 - vignette);
      pixels[index + 1] = Math.max(8, 23 - vignette);
      pixels[index + 2] = Math.max(7, 20 - vignette);
      pixels[index + 3] = 255;
      const dx = (x - centerX) / plateRadiusX;
      const dy = (y - centerY) / plateRadiusY;
      const plate = dx * dx + dy * dy;
      if (plate <= 1) {
        const rim = plate > 0.78 ? 218 : 188;
        pixels[index] = rim;
        pixels[index + 1] = rim - 8;
        pixels[index + 2] = rim - 28;
      }
      const garnish = ((x - centerX + 35) / (plateRadiusX * 0.48)) ** 2 + ((y - centerY + 18) / (plateRadiusY * 0.42)) ** 2;
      if (garnish <= 1) {
        pixels[index] = triangleTone;
        pixels[index + 1] = Math.max(48, triangleTone - 36);
        pixels[index + 2] = Math.max(32, triangleTone - 72);
      }
    }
  }
  return encodePngImage({ width, height, pixels });
}

function mergeResultInto(target, source) {
  target.warnings.push(...(source.warnings ?? []));
  target.fails.push(...(source.fails ?? []));
  target.evidence.push(...(source.evidence ?? []));
  target.metrics[source.name ?? "validation"] = source.metrics ?? {};
  if (!source.ok) target.ok = false;
  return target;
}

function createResult(name, metrics = {}) {
  return {
    ok: true,
    name,
    warnings: [],
    fails: [],
    metrics,
    evidence: []
  };
}

function failResult(name, error) {
  return {
    ok: false,
    name,
    warnings: [],
    fails: [error instanceof Error ? error.message : String(error)],
    metrics: {},
    evidence: []
  };
}

function cleanSegment(value, label) {
  const segment = String(value ?? "").trim();
  if (!segment) throw new Error(`${label} is required`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(segment)) {
    throw new Error(`${label} must be a slug-like path segment`);
  }
  return segment.toLowerCase();
}

function cleanVersion(value) {
  const version = String(value ?? "").trim();
  if (!version) throw new Error("version is required");
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(version) || version.includes("..")) {
    throw new Error("version must be a stable version path segment");
  }
  return version;
}

function identityFromArgs(args, { requireVersion = true } = {}) {
  return {
    restaurantSlug: cleanSegment(args.restaurant ?? args["restaurant-slug"], "restaurant"),
    menuSlug: cleanSegment(args.menu ?? args["menu-slug"], "menu"),
    dishSlug: cleanSegment(args.dish ?? args["dish-slug"], "dish"),
    version: requireVersion ? cleanVersion(args.version) : String(args.version ?? "").trim()
  };
}

function safeJoin(rootDir, ...segments) {
  const root = normalize(resolve(rootDir));
  const fullPath = normalize(resolve(rootDir, ...segments));
  if (fullPath !== root && !fullPath.startsWith(`${root}${sep}`)) {
    throw new Error(`Refusing path outside ${root}`);
  }
  return fullPath;
}

function ensureParent(filePath) {
  mkdirSync(dirname(filePath), { recursive: true });
}

function writeJsonFile(filePath, value) {
  ensureParent(filePath);
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function fileHash(filePath) {
  return sha256(readFileSync(filePath));
}

function isLfsPointer(bytes) {
  return bytes
    .subarray(0, 96)
    .toString("utf8")
    .startsWith("version https://git-lfs.github.com/spec");
}

function parseGlb(buffer) {
  if (buffer.length < 20) throw new Error("GLB is too small to contain a header");
  if (buffer.toString("utf8", 0, 4) !== "glTF") throw new Error("GLB magic must be glTF");
  const version = buffer.readUInt32LE(4);
  if (version !== 2) throw new Error(`GLB version must be 2, found ${version}`);
  const declaredLength = buffer.readUInt32LE(8);
  if (declaredLength !== buffer.length) {
    throw new Error(`GLB declared length ${declaredLength} does not match file length ${buffer.length}`);
  }

  let offset = 12;
  let json = null;
  let binBuffer = Buffer.alloc(0);
  const chunks = [];
  while (offset + 8 <= buffer.length) {
    const chunkLength = buffer.readUInt32LE(offset);
    const chunkType = buffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + chunkLength;
    if (chunkEnd > buffer.length) throw new Error("GLB chunk length exceeds file size");
    const chunk = buffer.subarray(chunkStart, chunkEnd);
    chunks.push({ type: chunkType, bytes: chunkLength });
    if (chunkType === 0x4e4f534a) {
      json = JSON.parse(chunk.toString("utf8").replace(/\0+$/g, "").trim());
    } else if (chunkType === 0x004e4942 && binBuffer.length === 0) {
      binBuffer = chunk;
    }
    offset = chunkEnd;
  }
  if (!json) throw new Error("GLB JSON chunk is required");
  return { json, chunks, binBuffer };
}

function componentSize(componentType) {
  return (
    {
      5120: 1,
      5121: 1,
      5122: 2,
      5123: 2,
      5125: 4,
      5126: 4
    }[componentType] ?? 0
  );
}

function typeCount(type) {
  return ({ SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 }[type] ?? 1);
}

function accessorBytes(gltf, accessorIndex) {
  const accessor = gltf.accessors?.[accessorIndex];
  if (!accessor) return 0;
  return accessor.count * componentSize(accessor.componentType) * typeCount(accessor.type);
}

function imageDimensionsFromBytes(bytes) {
  if (bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))) {
    return {
      format: "png",
      width: bytes.readUInt32BE(16),
      height: bytes.readUInt32BE(20)
    };
  }
  if (bytes.length >= 10 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) break;
      const marker = bytes[offset + 1];
      const length = bytes.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) {
        return {
          format: "jpeg",
          width: bytes.readUInt16BE(offset + 7),
          height: bytes.readUInt16BE(offset + 5)
        };
      }
      offset += 2 + length;
    }
  }
  if (bytes.length >= 30 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") {
    return { format: "webp", width: null, height: null };
  }
  return { format: "unknown", width: null, height: null };
}

function embeddedImageBytes(gltf, sourceBuffer, image) {
  if (!Number.isInteger(image?.bufferView)) return Buffer.alloc(0);
  const view = gltf.bufferViews?.[image.bufferView];
  if (!view || view.buffer !== 0) return Buffer.alloc(0);
  const start = (view.byteOffset ?? 0) + (image.byteOffset ?? 0);
  const end = start + view.byteLength;
  return sourceBuffer.subarray(start, end);
}

function externalUris(gltf) {
  const uris = [];
  for (const buffer of gltf.buffers ?? []) {
    if (buffer.uri && !String(buffer.uri).startsWith("data:")) uris.push(buffer.uri);
  }
  for (const image of gltf.images ?? []) {
    if (image.uri && !String(image.uri).startsWith("data:")) uris.push(image.uri);
  }
  return uris;
}

function aggregateBounds(gltf) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const mesh of gltf.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      const accessor = gltf.accessors?.[primitive.attributes?.POSITION];
      if (!accessor?.min || !accessor?.max) continue;
      for (let i = 0; i < 3; i += 1) {
        min[i] = Math.min(min[i], accessor.min[i]);
        max[i] = Math.max(max[i], accessor.max[i]);
      }
    }
  }
  if (!Number.isFinite(min[0]) || !Number.isFinite(max[0])) {
    return {
      min: [0, 0, 0],
      max: [0.1, 0.1, 0.1],
      dimensionsMeters: [0.1, 0.1, 0.1],
      centeredXZ: false,
      groundedY: false
    };
  }
  const dimensionsMeters = max.map((value, index) => Number((value - min[index]).toFixed(6)));
  return {
    min,
    max,
    dimensionsMeters,
    centeredXZ: Math.abs(min[0] + max[0]) < 0.001 && Math.abs(min[2] + max[2]) < 0.001,
    groundedY: Math.abs(min[1]) < 0.001
  };
}

function analyzeGlbFile(sourcePath) {
  const bytes = readFileSync(sourcePath);
  if (isLfsPointer(bytes)) throw new Error("Source GLB is a Git LFS pointer, not a binary asset");
  const { json: gltf, chunks, binBuffer } = parseGlb(bytes);
  let primitives = 0;
  let vertices = 0;
  let triangles = 0;
  const drawCalls = [];

  for (const [meshIndex, mesh] of (gltf.meshes ?? []).entries()) {
    for (const [primitiveIndex, primitive] of (mesh.primitives ?? []).entries()) {
      primitives += 1;
      const mode = primitive.mode ?? 4;
      const positionAccessor = gltf.accessors?.[primitive.attributes?.POSITION];
      const indexAccessor = gltf.accessors?.[primitive.indices];
      const primitiveVertices = positionAccessor?.count ?? 0;
      const primitiveIndices = indexAccessor?.count ?? 0;
      vertices += primitiveVertices;
      if (mode === 4) triangles += Math.floor((primitiveIndices || primitiveVertices) / 3);
      else if (mode === 5 || mode === 6) triangles += Math.max(0, (primitiveIndices || primitiveVertices) - 2);
      drawCalls.push({
        meshIndex,
        primitiveIndex,
        mode,
        material: primitive.material ?? null,
        positionBytes: accessorBytes(gltf, primitive.attributes?.POSITION),
        indexBytes: primitive.indices === undefined ? 0 : accessorBytes(gltf, primitive.indices)
      });
    }
  }

  const imageMetrics = (gltf.images ?? []).map((image, index) => {
    const embedded = embeddedImageBytes(gltf, binBuffer, image);
    const dimensions = embedded.length > 0 ? imageDimensionsFromBytes(embedded) : { format: image.mimeType ?? "external", width: null, height: null };
    return {
      index,
      name: image.name ?? "",
      mimeType: image.mimeType ?? "",
      uri: image.uri ?? "",
      bytes: embedded.length || null,
      ...dimensions
    };
  });

  const bounds = aggregateBounds(gltf);
  const extUris = externalUris(gltf);
  const metrics = {
    sourcePath,
    fileName: basename(sourcePath),
    bytes: bytes.length,
    sha256: sha256(bytes),
    glbVersion: 2,
    chunks,
    meshes: gltf.meshes?.length ?? 0,
    primitives,
    triangles,
    vertices,
    materials: gltf.materials?.length ?? 0,
    textures: gltf.textures?.length ?? 0,
    images: imageMetrics.length,
    imageMetrics,
    extensionsUsed: gltf.extensionsUsed ?? [],
    extensionsRequired: gltf.extensionsRequired ?? [],
    externalUris: extUris,
    bounds,
    drawCallEstimate: primitives,
    drawCalls,
    classification:
      triangles > 150_000 || imageMetrics.length > 12 || bytes.length > 25 * 1024 * 1024
        ? "signature"
        : "simpleDish"
  };
  return metrics;
}

function writeAnalysisMarkdown(path, metrics) {
  const lines = [
    `# 3D Source Analysis: ${metrics.fileName}`,
    "",
    `- Bytes: ${metrics.bytes}`,
    `- SHA-256: ${metrics.sha256}`,
    `- Meshes: ${metrics.meshes}`,
    `- Primitives / draw calls: ${metrics.primitives}`,
    `- Triangles: ${metrics.triangles}`,
    `- Vertices: ${metrics.vertices}`,
    `- Textures: ${metrics.textures}`,
    `- Bounds (m): ${metrics.bounds.dimensionsMeters.join(" x ")}`,
    `- External URIs: ${metrics.externalUris.length ? metrics.externalUris.join(", ") : "none"}`,
    "",
    "Manual review remains required for final plating, scale, material fidelity, iPhone Quick Look, and Android Scene Viewer."
  ];
  ensureParent(path);
  writeFileSync(path, `${lines.join("\n")}\n`);
}

function productionUrl(identity, variantKey) {
  const directory = VARIANT_DIRS[variantKey];
  const fileName = VARIANT_FILES[variantKey](identity.dishSlug);
  return `/models/restaurants/${identity.restaurantSlug}/${identity.menuSlug}/${identity.dishSlug}/${identity.version}/${directory}/${fileName}`;
}

function configuredCdnOrigins() {
  return String(process.env.VISTAIRE_3D_CDN_ORIGINS ?? "")
    .split(/[,\s]+/)
    .map((entry) => entry.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

function cleanCdnBaseUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("--cdn-base-url must be a valid HTTPS URL");
  }
  if (parsed.protocol !== "https:") throw new Error("--cdn-base-url must use HTTPS");
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error("--cdn-base-url must not include credentials, query, or hash");
  }
  const allowedOrigins = configuredCdnOrigins();
  if (!allowedOrigins.includes(parsed.origin)) {
    throw new Error(`--cdn-base-url origin ${parsed.origin} is not allowlisted by VISTAIRE_3D_CDN_ORIGINS`);
  }
  return `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}`;
}

function cdnAssetUrl(identity, variantKey, cdnBaseUrl) {
  const directory = VARIANT_DIRS[variantKey];
  const fileName = VARIANT_FILES[variantKey](identity.dishSlug);
  return [
    cdnBaseUrl.replace(/\/+$/, ""),
    identity.restaurantSlug,
    identity.menuSlug,
    identity.dishSlug,
    identity.version,
    directory,
    fileName
  ].join("/");
}

function deliveryUrl(identity, variantKey, cdnBaseUrl = "") {
  return cdnBaseUrl ? cdnAssetUrl(identity, variantKey, cdnBaseUrl) : productionUrl(identity, variantKey);
}

function reportDir(rootDir, identity) {
  return safeJoin(
    rootDir,
    "assets",
    "3d",
    "reports",
    identity.restaurantSlug,
    identity.menuSlug,
    identity.dishSlug,
    identity.version
  );
}

function workDir(rootDir, identity) {
  return safeJoin(
    rootDir,
    "assets",
    "3d",
    "work",
    identity.restaurantSlug,
    identity.menuSlug,
    identity.dishSlug,
    identity.version
  );
}

function workFilePath(rootDir, identity, variantKey) {
  return safeJoin(
    workDir(rootDir, identity),
    VARIANT_DIRS[variantKey],
    VARIANT_FILES[variantKey](identity.dishSlug)
  );
}

function resolveSource(args, identity, rootDir) {
  if (args.source) {
    const source = normalize(resolve(String(args.source)));
    if (!existsSync(source)) throw new Error(`Source GLB is missing: ${source}`);
    return source;
  }
  const sourceRoot = safeJoin(
    rootDir,
    "assets",
    "3d",
    "source",
    identity.restaurantSlug,
    identity.menuSlug,
    identity.dishSlug,
    identity.version
  );
  if (!existsSync(sourceRoot)) throw new Error(`Source directory is missing: ${sourceRoot}`);
  const glbs = readdirSync(sourceRoot).filter((entry) => entry.toLowerCase().endsWith(".glb"));
  if (glbs.length !== 1) {
    throw new Error(`Expected exactly one source GLB in ${sourceRoot}, found ${glbs.length}`);
  }
  return safeJoin(sourceRoot, glbs[0]);
}

function gltfTransformCli(toolchainRoot = process.cwd()) {
  const cliPath = safeJoin(toolchainRoot, "node_modules", "@gltf-transform", "cli", "bin", "cli.js");
  if (!existsSync(cliPath)) {
    throw new Error("@gltf-transform/cli is required before production optimization can run");
  }
  return cliPath;
}

function transformArgsFor({ input, output, profile, candidateName = "balanced" }) {
  const candidateArgs = {
    conservative: {
      web: ["optimize", input, output, "--compress", "meshopt", "--texture-compress", "webp", "--texture-size", "2048"],
      mobile: ["optimize", input, output, "--compress", "meshopt", "--texture-compress", "webp", "--texture-size", "1536"],
      arLite: [
        "optimize",
        input,
        output,
        "--compress",
        "false",
        "--texture-compress",
        "false",
        "--texture-size",
        "1536",
        "--simplify",
        "true",
        "--simplify-ratio",
        "0.9",
        "--simplify-error",
        "0.00025",
        "--simplify-lock-border",
        "true"
      ]
    },
    balanced: {
      web: ["optimize", input, output, "--compress", "meshopt", "--texture-compress", "webp", "--texture-size", "2048"],
      mobile: ["optimize", input, output, "--compress", "meshopt", "--texture-compress", "webp", "--texture-size", "1024"],
      arLite: [
        "optimize",
        input,
        output,
        "--compress",
        "false",
        "--texture-compress",
        "false",
        "--texture-size",
        "1024",
        "--simplify",
        "true",
        "--simplify-ratio",
        "0.72",
        "--simplify-error",
        "0.00045",
        "--simplify-lock-border",
        "true"
      ]
    },
    aggressive: {
      web: ["optimize", input, output, "--compress", "meshopt", "--texture-compress", "webp", "--texture-size", "1536"],
      mobile: ["optimize", input, output, "--compress", "meshopt", "--texture-compress", "webp", "--texture-size", "768"],
      arLite: [
        "optimize",
        input,
        output,
        "--compress",
        "false",
        "--texture-compress",
        "false",
        "--texture-size",
        "768",
        "--simplify",
        "true",
        "--simplify-ratio",
        "0.55",
        "--simplify-error",
        "0.0007",
        "--simplify-lock-border",
        "true"
      ]
    }
  };
  return candidateArgs[candidateName]?.[profile] ?? candidateArgs.balanced.arLite;
}

function runGltfTransform({ input, output, profile, candidateName = "balanced" }) {
  const cli = gltfTransformCli(process.cwd());
  ensureParent(output);
  const args = transformArgsFor({ input, output, profile, candidateName });
  execFileSync(process.execPath, [cli, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "pipe",
    windowsHide: true
  });
  return { ok: true, command: `gltf-transform ${args.join(" ")}`, fallback: false, candidateName };
}

function usdIdentifier(value, fallback) {
  const cleaned = String(value ?? "")
    .replace(/[^A-Za-z0-9_]/g, "_")
    .replace(/^[^A-Za-z_]+/, "");
  return cleaned || fallback;
}

function readAccessor(gltf, binBuffer, accessorIndex) {
  const accessor = gltf.accessors?.[accessorIndex];
  if (!accessor) throw new Error(`Missing accessor ${accessorIndex}`);
  const view = gltf.bufferViews?.[accessor.bufferView];
  if (!view || view.buffer !== 0) throw new Error(`Accessor ${accessorIndex} must use an embedded GLB bufferView`);
  const componentBytes = componentSize(accessor.componentType);
  const itemSize = typeCount(accessor.type);
  const stride = view.byteStride ?? componentBytes * itemSize;
  const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const values = [];
  for (let item = 0; item < accessor.count; item += 1) {
    const itemOffset = start + item * stride;
    const tuple = [];
    for (let component = 0; component < itemSize; component += 1) {
      const offset = itemOffset + component * componentBytes;
      if (accessor.componentType === 5126) tuple.push(binBuffer.readFloatLE(offset));
      else if (accessor.componentType === 5125) tuple.push(binBuffer.readUInt32LE(offset));
      else if (accessor.componentType === 5123) tuple.push(binBuffer.readUInt16LE(offset));
      else if (accessor.componentType === 5121) tuple.push(binBuffer.readUInt8(offset));
      else throw new Error(`Unsupported accessor component type ${accessor.componentType}`);
    }
    values.push(itemSize === 1 ? tuple[0] : tuple);
  }
  return values;
}

function imageExtension(image, bytes) {
  const mimeType = String(image?.mimeType ?? "").toLowerCase();
  if (mimeType.includes("png") || bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))) return "png";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg") || bytes.subarray(0, 3).equals(Buffer.from("ffd8ff", "hex"))) return "jpg";
  if (mimeType.includes("webp") || (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP")) {
    return "webp";
  }
  return "";
}

function formatUsdNumber(value) {
  return Number(value.toFixed(6)).toString();
}

function createUsdzPackageFromGlb({ glbPath, identity }) {
  const { json: gltf, binBuffer } = parseGlb(readFileSync(glbPath));
  const entries = {};
  const textureEntries = [];
  for (const [index, image] of (gltf.images ?? []).entries()) {
    const bytes = embeddedImageBytes(gltf, binBuffer, image);
    const extension = imageExtension(image, bytes);
    if (!extension || bytes.length === 0) continue;
    const name = `textures/image-${index}.${extension}`;
    entries[name] = bytes;
    textureEntries.push(name);
  }

  const lines = [
    "#usda 1.0",
    "(",
    `  defaultPrim = "${usdIdentifier(identity.dishSlug, "Dish")}"`,
    ")",
    "",
    `def Xform "${usdIdentifier(identity.dishSlug, "Dish")}" {`
  ];

  let meshCount = 0;
  for (const [meshIndex, mesh] of (gltf.meshes ?? []).entries()) {
    for (const [primitiveIndex, primitive] of (mesh.primitives ?? []).entries()) {
      if ((primitive.mode ?? 4) !== 4) {
        throw new Error("USDZ export supports triangle-list GLB primitives only");
      }
      const positionAccessor = primitive.attributes?.POSITION;
      if (!Number.isInteger(positionAccessor)) throw new Error("USDZ export requires POSITION accessors");
      const points = readAccessor(gltf, binBuffer, positionAccessor);
      const indices = Number.isInteger(primitive.indices)
        ? readAccessor(gltf, binBuffer, primitive.indices)
        : points.map((_, index) => index);
      if (indices.length < 3 || indices.length % 3 !== 0) {
        throw new Error("USDZ export requires triangle indices");
      }
      const meshName = usdIdentifier(mesh.name, `Mesh_${meshIndex}_${primitiveIndex}`);
      lines.push(`  def Mesh "${meshName}" {`);
      lines.push(
        `    point3f[] points = [${points
          .map((point) => `(${point.map(formatUsdNumber).join(", ")})`)
          .join(", ")}]`
      );
      lines.push(`    int[] faceVertexCounts = [${Array(indices.length / 3).fill(3).join(", ")}]`);
      lines.push(`    int[] faceVertexIndices = [${indices.join(", ")}]`);
      lines.push("  }");
      meshCount += 1;
    }
  }

  if (meshCount === 0) throw new Error("USDZ export requires at least one renderable mesh");

  for (const [index, material] of (gltf.materials ?? []).entries()) {
    const materialName = usdIdentifier(material.name, `Material_${index}`);
    lines.push(`  def Material "${materialName}" {}`);
  }
  for (const textureName of textureEntries) {
    lines.push(`  asset vistaireTexture_${usdIdentifier(textureName, "Texture")} = @${textureName}@`);
  }
  lines.push("}");
  entries["model.usda"] = Buffer.from(`${lines.join("\n")}\n`);
  return Buffer.from(zipSync(entries, { level: 0 }));
}

function makeVisualQualityReport({ identity, analysis, variants, approvedBy }) {
  return {
    status: "failed",
    score: 0,
    promise: STRICT_VISUAL_PROMISE,
    method: "missing-deterministic-render-comparison",
    thresholds: STRICT_VISUAL_THRESHOLDS,
    report: null,
    reportArtifacts: {},
    angleReports: [],
    metrics: {},
    deterministicViews: ["front", "left", "right", "top", "three-quarter"],
    checks: {
      textureSharpness: { status: "failed", reason: "Rendered texture sharpness comparison is missing" },
      silhouette: { status: "failed", reason: "Rendered silhouette diff is missing" },
      color: { status: "failed", reason: "Rendered color drift comparison is missing" },
      material: { status: "failed", reason: "Rendered material drift review is missing" },
      scaleOrigin: { status: "failed", reason: "Scale/origin comparison is missing" },
      lowPoly: { status: "failed", reason: "Low-poly visibility review is missing" },
      appetite: { status: "failed", reason: "Human appetite appeal review is missing" }
    },
    variants: Object.fromEntries(
      Object.entries(variants).map(([key, variant]) => [key, { bytes: variant.bytes, sha256: variant.sha256 }])
    ),
    sourceSummary: {
      bytes: analysis.bytes,
      sha256: analysis.sha256,
      triangles: analysis.triangles,
      vertices: analysis.vertices,
      materials: analysis.materials,
      textures: analysis.textures
    },
    fails: [STRICT_VISUAL_REJECTION],
    manualReview: {
      required: true,
      status: "pending",
      approvalType: "human",
      approvedBy: null,
      approvedAt: null,
      requestedBy: approvedBy || null
    },
    realDeviceQa: {
      ...pendingRealDeviceQa()
    },
    identity
  };
}

function variantMetadata(filePath, url, extra = {}) {
  const bytes = statSync(filePath).size;
  return {
    url,
    bytes,
    sha256: fileHash(filePath),
    validationStatus: "passed",
    ...extra
  };
}

function buildManifest({ identity, analysis, variants, visualQuality, approvedBy }) {
  const now = new Date().toISOString();
  const visualApproved =
    visualQuality?.status === "passed" &&
    visualQuality?.manualReview?.status === "approved" &&
    visualQuality?.manualReview?.approvalType === "human" &&
    Boolean(visualQuality?.manualReview?.approvedBy);
  const status = visualApproved ? "approved" : "review";
  const totalBytes = Object.values(variants).reduce((sum, variant) => sum + variant.bytes, 0);
  const validationFails = visualApproved ? [] : [STRICT_VISUAL_REJECTION];
  return {
    schemaVersion: 2,
    kind: "vistaire.dish-3d-manifest",
    restaurantSlug: identity.restaurantSlug,
    menuSlug: identity.menuSlug,
    dishSlug: identity.dishSlug,
    activeVersion: identity.version,
    status,
    validationStatus: visualApproved ? "passed" : "failed",
    variants,
    bytes: { total: totalBytes },
    physicalScaleMeters: {
      width: Math.max(analysis.bounds.dimensionsMeters[0], 0.001),
      height: Math.max(analysis.bounds.dimensionsMeters[1], 0.001),
      depth: Math.max(analysis.bounds.dimensionsMeters[2], 0.001)
    },
    bounds: {
      min: analysis.bounds.min,
      max: analysis.bounds.max,
      centeredXZ: analysis.bounds.centeredXZ,
      groundedY: analysis.bounds.groundedY
    },
    budgets: {
      profile: analysis.classification === "signature" ? "signature" : "simpleDish",
      policy: "docs/repo-asset-policy.md"
    },
    sourceAnalysis: {
      bytes: analysis.bytes,
      sha256: analysis.sha256,
      meshes: analysis.meshes,
      primitives: analysis.primitives,
      triangles: analysis.triangles,
      vertices: analysis.vertices,
      materials: analysis.materials,
      textures: analysis.textures,
      images: analysis.images,
      externalUris: analysis.externalUris,
      classification: analysis.classification
    },
    visualQuality,
    quality: {
      manualVisualApprovalRequired: true,
      manualVisualApproved: visualApproved,
      approvedBy: visualApproved ? visualQuality.manualReview.approvedBy : null,
      requestedBy: approvedBy || null,
      manualReview: {
        status: visualApproved ? "approved" : "pending",
        approvalType: "human",
        approvedBy: visualApproved ? visualQuality.manualReview.approvedBy : null,
        approvedAt: visualApproved ? visualQuality.manualReview.approvedAt ?? now : null
      },
      realDeviceQa: {
        ...pendingRealDeviceQa()
      }
    },
    lifecycle: {
      phase: status,
      generatedBy: "scripts/3d/optimize-dish.mjs",
      generatedAt: now
    },
    rollback: {
      previousVersion: null,
      fromVersion: null,
      toVersion: null
    },
    validation: {
      warnings: [],
      fails: validationFails
    },
    generatedAt: now,
    approvedAt: visualApproved ? now : null,
    publishedAt: null
  };
}

function candidateWorkFilePath(rootDir, identity, candidateName, variantKey) {
  return safeJoin(
    workDir(rootDir, identity),
    "candidates",
    candidateName,
    VARIANT_DIRS[variantKey],
    VARIANT_FILES[variantKey](identity.dishSlug)
  );
}

function validateVisualApprovalReadiness({ manifest, rootDir }) {
  const result = createResult("visual-approval-readiness");
  const visualQuality = manifest?.visualQuality ?? {};
  if (visualQuality.status !== "passed") {
    result.ok = false;
    result.fails.push("visualQuality.status must be passed before human visual approval");
  }
  if (visualQuality.promise !== STRICT_VISUAL_PROMISE) {
    result.ok = false;
    result.fails.push("visualQuality.promise must match the strict Vistaire visual equivalence wording");
  }
  if (!/render/i.test(String(visualQuality.method ?? "")) || !/comparison/i.test(String(visualQuality.method ?? ""))) {
    result.ok = false;
    result.fails.push("visualQuality.method must describe deterministic rendered comparison");
  }
  if (!visualQuality.report) {
    result.ok = false;
    result.fails.push("visualQuality.report is required before approval");
  }
  for (const variantKey of ["web", "mobile", "arLite"]) {
    const triplet = visualQuality.reportArtifacts?.[variantKey];
    if (!triplet?.before || !triplet?.after || !triplet?.diff) {
      result.ok = false;
      result.fails.push(`visualQuality.reportArtifacts.${variantKey} before/after/diff evidence is required`);
    }
    const angleCount = (visualQuality.angleReports ?? []).filter((entry) => entry?.variant === variantKey).length;
    if (angleCount < 4) {
      result.ok = false;
      result.fails.push(`visualQuality.angleReports.${variantKey} must include at least four deterministic angles`);
    }
  }
  const thresholdChecks = [
    ["meanSsim", ">=", STRICT_VISUAL_THRESHOLDS.meanSsim],
    ["perceptualScore", ">=", STRICT_VISUAL_THRESHOLDS.perceptualScore],
    ["maxDiffRatio", "<=", STRICT_VISUAL_THRESHOLDS.maxDiffRatio],
    ["maxSilhouetteDiff", "<=", STRICT_VISUAL_THRESHOLDS.maxSilhouetteDiff],
    ["maxColorDelta", "<=", STRICT_VISUAL_THRESHOLDS.maxColorDelta],
    ["maxTextureBlurDelta", "<=", STRICT_VISUAL_THRESHOLDS.maxTextureBlurDelta],
    ["maxMaterialDrift", "<=", STRICT_VISUAL_THRESHOLDS.maxMaterialDrift],
    ["maxScaleDriftMeters", "<=", STRICT_VISUAL_THRESHOLDS.maxScaleDriftMeters],
    ["maxOriginDriftMeters", "<=", STRICT_VISUAL_THRESHOLDS.maxOriginDriftMeters],
    ["lowPolyVisibilityScore", "<=", STRICT_VISUAL_THRESHOLDS.maxLowPolyVisibility],
    ["appetitePreservationScore", ">=", STRICT_VISUAL_THRESHOLDS.minAppetitePreservation]
  ];
  for (const [metric, operator, threshold] of thresholdChecks) {
    const value = Number(visualQuality[metric]);
    const ok = operator === ">=" ? value >= threshold : value <= threshold;
    if (!Number.isFinite(value) || !ok) {
      result.ok = false;
      result.fails.push(`visualQuality.${metric} does not satisfy strict threshold ${operator} ${threshold}`);
    }
  }
  for (const [key, check] of Object.entries(visualQuality.checks ?? {})) {
    if (check?.status !== "passed") {
      result.ok = false;
      result.fails.push(`visualQuality.checks.${key}.status must be passed`);
    }
  }
  const evidence = validateVisualEvidence({ manifest, rootDir });
  mergeResultInto(result, evidence);
  return result;
}

function runApproveVisual(args) {
  const result = createResult("3d:approve-visual");
  const rootDir = normalize(resolve(args.root ?? process.cwd()));
  const manifestPath = args.manifest ? normalize(resolve(String(args.manifest))) : "";
  if (!manifestPath || !existsSync(manifestPath)) throw new Error("--manifest must point to an existing dish manifest");
  if (!args.write) throw new Error("Visual approval requires --write");
  const approvedBy = String(args["approved-by"] ?? "").trim();
  if (!approvedBy) throw new Error("Visual approval requires --approved-by");

  const manifest = readJsonFile(manifestPath);
  const readiness = validateVisualApprovalReadiness({ manifest, rootDir });
  mergeResultInto(result, readiness);
  if (!readiness.ok) return result;

  const now = new Date().toISOString();
  const approved = {
    ...manifest,
    visualQuality: {
      ...manifest.visualQuality,
      manualReview: {
        ...(manifest.visualQuality?.manualReview ?? {}),
        required: true,
        status: "approved",
        approvalType: "human",
        approvedBy,
        approvedAt: now
      }
    },
    quality: {
      ...(manifest.quality ?? {}),
      manualVisualApprovalRequired: true,
      manualVisualApproved: true,
      approvedBy,
      manualReview: {
        ...(manifest.quality?.manualReview ?? {}),
        status: "approved",
        approvalType: "human",
        approvedBy,
        approvedAt: now
      }
    }
  };

  writeJsonFile(manifestPath, approved);
  result.metrics.manifestPath = manifestPath;
  result.metrics.manualReview = approved.visualQuality.manualReview;
  result.warnings.push("Visual approval recorded; production publish remains blocked until strict manifest validation and real-device iPhone and Android QA pass.");
  return result;
}

function manifestUsesExternalDelivery(manifest) {
  return Object.values(manifest?.variants ?? {}).some((variant) => /^https:\/\//i.test(String(variant?.url ?? "")));
}

function validateNetworkValidationReport({ manifest, reportPath }) {
  const result = createResult("cdn-network-validation-report");
  if (!reportPath) {
    result.ok = false;
    result.fails.push("CDN publish requires --network-validation-report from npm run 3d:validate-network -- --strict");
    return result;
  }
  const fullPath = normalize(resolve(String(reportPath)));
  if (!existsSync(fullPath)) {
    result.ok = false;
    result.fails.push(`Network validation report is missing: ${fullPath}`);
    return result;
  }
  const report = readJsonFile(fullPath);
  if (report.ok !== true || report.name !== "network-headers") {
    result.ok = false;
    result.fails.push("Network validation report must be a passing network-headers result");
  }
  const metricsByUrl = new Map((report.metrics?.assets ?? []).map((asset) => [asset.url, asset]));
  for (const asset of collectManifestAssets(manifest)) {
    if (!/^https:\/\//i.test(asset.url)) continue;
    const metric = metricsByUrl.get(asset.url);
    if (!metric) {
      result.ok = false;
      result.fails.push(`${asset.label}: network validation report is missing ${asset.url}`);
      continue;
    }
    if (Number.isFinite(asset.bytes) && metric.fetchedBytes !== asset.bytes) {
      result.ok = false;
      result.fails.push(`${asset.label}: network validation fetchedBytes does not match manifest bytes`);
    }
    if (asset.sha256 && metric.fetchedSha256 !== asset.sha256) {
      result.ok = false;
      result.fails.push(`${asset.label}: network validation fetchedSha256 does not match manifest sha256`);
    }
  }
  result.metrics.reportPath = fullPath;
  return result;
}

function activeManifestPath(rootDir, identity) {
  return safeJoin(
    rootDir,
    "public",
    "models",
    "restaurants",
    identity.restaurantSlug,
    identity.menuSlug,
    identity.dishSlug,
    "manifest.json"
  );
}

function versionManifestPath(rootDir, identity) {
  return safeJoin(
    rootDir,
    "public",
    "models",
    "restaurants",
    identity.restaurantSlug,
    identity.menuSlug,
    identity.dishSlug,
    identity.version,
    "manifest.json"
  );
}

function restaurantManifestPath(rootDir, restaurantSlug) {
  return safeJoin(rootDir, "public", "models", "restaurants", restaurantSlug, "manifest.json");
}

function collectActiveDishManifests(rootDir, restaurantSlug) {
  const restaurantRoot = safeJoin(rootDir, "public", "models", "restaurants", restaurantSlug);
  if (!existsSync(restaurantRoot)) return [];
  const manifests = [];
  function visit(dir, depth = 0) {
    if (depth > 4) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const filePath = join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(filePath, depth + 1);
      } else if (entry.name === "manifest.json") {
        const rel = relative(restaurantRoot, filePath).replaceAll("\\", "/");
        if (/^[^/]+\/[^/]+\/manifest\.json$/.test(rel)) {
          manifests.push(readJsonFile(filePath));
        }
      }
    }
  }
  visit(restaurantRoot);
  return manifests;
}

function writeRestaurantManifest(rootDir, restaurantSlug) {
  const activeManifests = collectActiveDishManifests(rootDir, restaurantSlug);
  if (activeManifests.length === 0) return null;
  const summary = summarizeRestaurantManifest(restaurantSlug, activeManifests, {
    generatedAt: new Date().toISOString()
  });
  writeJsonFile(restaurantManifestPath(rootDir, restaurantSlug), summary);
  return summary;
}

function runAnalyzeSource(args) {
  const result = createResult("3d:analyze-source");
  const source = normalize(resolve(String(args.source ?? "")));
  if (!source || !existsSync(source)) throw new Error("--source must point to an existing GLB");
  const analysis = analyzeGlbFile(source);
  result.metrics = analysis;
  result.evidence.push({ source, sha256: analysis.sha256, bytes: analysis.bytes });
  if (analysis.externalUris.length > 0) {
    result.ok = false;
    result.fails.push("Source GLB must not depend on external URIs");
  }
  if (args.out) writeJsonFile(String(args.out), result);
  if (args.markdown) writeAnalysisMarkdown(String(args.markdown), analysis);
  return result;
}

function runOptimizeDish(args) {
  const result = createResult("3d:optimize-dish");
  const rootDir = normalize(resolve(args.root ?? process.cwd()));
  const identity = identityFromArgs(args);
  const source = resolveSource(args, identity, rootDir);
  const dryRun = !args.write || Boolean(args["dry-run"]);
  const allowPublicBinaries = Boolean(args["allow-public-binaries"]);
  const approvedBy = String(args["approved-by"] ?? "").trim();
  const cdnBaseUrl = cleanCdnBaseUrl(args["cdn-base-url"] ?? "");
  const reports = reportDir(rootDir, identity);
  const work = workDir(rootDir, identity);
  const analysis = analyzeGlbFile(source);

  result.metrics.identity = identity;
  result.metrics.source = source;
  result.metrics.rootDir = rootDir;
  result.metrics.dryRun = dryRun;
  result.evidence.push({ stage: "source-analysis", ...analysis });

  if (analysis.externalUris.length > 0) {
    throw new Error("Source GLB must embed buffers/images before optimization");
  }
  gltfTransformCli(process.cwd());

  if (dryRun) {
    result.warnings.push("Dry run only; pass --write to generate variants and manifests.");
    result.metrics.plannedOutputs = {
      reports,
      work,
      cdnBaseUrl: cdnBaseUrl || null,
      publicBase: `/models/restaurants/${identity.restaurantSlug}/${identity.menuSlug}/${identity.dishSlug}/${identity.version}`
    };
    return result;
  }
  if (!allowPublicBinaries && !cdnBaseUrl) {
    throw new Error(
      "Writing runtime binaries requires --allow-public-binaries or an allowlisted --cdn-base-url for CDN/storage mode."
    );
  }

  mkdirSync(reports, { recursive: true });
  mkdirSync(work, { recursive: true });

  const analysisResult = { ok: true, name: "3d:analyze-source", warnings: [], fails: [], metrics: analysis, evidence: [] };
  writeJsonFile(join(reports, "source-analysis.json"), analysisResult);
  writeAnalysisMarkdown(join(reports, "source-analysis.md"), analysis);

  const candidateReports = [];
  const generatedFiles = {};
  const transformEvidence = {};
  const generatedAnalysis = {};
  for (const candidateName of CANDIDATE_PROFILES) {
    const candidateFiles = {};
    const candidateEvidence = {};
    const candidateAnalysis = {};
    for (const key of ["web", "mobile", "arLite"]) {
      const filePath =
        candidateName === "balanced"
          ? workFilePath(rootDir, identity, key)
          : candidateWorkFilePath(rootDir, identity, candidateName, key);
      const command = runGltfTransform({ input: source, output: filePath, profile: key, candidateName });
      const variantAnalysis = analyzeGlbFile(filePath);
      candidateFiles[key] = filePath;
      candidateEvidence[key] = command;
      candidateAnalysis[key] = variantAnalysis;
      if (candidateName === "balanced") {
        generatedFiles[key] = filePath;
        transformEvidence[key] = command;
        generatedAnalysis[key] = variantAnalysis;
      }
    }
    const candidateVariants = Object.fromEntries(
      ["web", "mobile", "arLite"].map((key) => [
        key,
        {
          filePath: candidateFiles[key],
          bytes: statSync(candidateFiles[key]).size,
          sha256: fileHash(candidateFiles[key]),
          url: deliveryUrl(identity, key, cdnBaseUrl),
          analysis: {
            triangles: candidateAnalysis[key].triangles,
            vertices: candidateAnalysis[key].vertices,
            materials: candidateAnalysis[key].materials,
            textures: candidateAnalysis[key].textures,
            images: candidateAnalysis[key].images,
            extensionsUsed: candidateAnalysis[key].extensionsUsed,
            extensionsRequired: candidateAnalysis[key].extensionsRequired,
            externalUris: candidateAnalysis[key].externalUris,
            bounds: candidateAnalysis[key].bounds
          }
        }
      ])
    );
    const totalBytes = Object.values(candidateVariants).reduce((sum, variant) => sum + variant.bytes, 0);
    candidateReports.push({
      name: candidateName,
      variants: candidateVariants,
      transformEvidence: candidateEvidence,
      totalBytes,
      budgets: {
        status: "pending-final-validation",
        note: "Full budget validation runs against the assembled manifest variant set."
      },
      visualGate: {
        status: "failed",
        reason: STRICT_VISUAL_REJECTION
      },
      decision: {
        status: "rejected",
        reason: "Candidate cannot be selected until strict rendered visual identity evidence passes."
      }
    });
  }
  const passingCandidates = candidateReports
    .filter((candidate) => candidate.visualGate.status === "passed")
    .sort((a, b) => a.totalBytes - b.totalBytes);
  const selectedCandidate = passingCandidates[0]?.name ?? null;
  const decision = selectedCandidate
    ? {
        status: "selected",
        selectedCandidate,
        reason: "Selected the lightest candidate that passed budgets and strict visual evidence."
      }
    : {
        status: "rejected",
        reason: "No adaptive candidate passed strict visual identity evidence; previous active version must remain active."
      };

  const usdzPath = workFilePath(rootDir, identity, "iosUsdz");
  ensureParent(usdzPath);
  writeFileSync(usdzPath, createUsdzPackageFromGlb({ glbPath: generatedFiles.arLite, identity }));
  generatedFiles.iosUsdz = usdzPath;

  const posterPath = workFilePath(rootDir, identity, "poster");
  ensureParent(posterPath);
  writeFileSync(posterPath, createReviewPosterPng({ analysis }));
  generatedFiles.poster = posterPath;

  const variants = {
    web: variantMetadata(generatedFiles.web, deliveryUrl(identity, "web", cdnBaseUrl), {
      profile: "web",
      optimizer: transformEvidence.web
    }),
    mobile: variantMetadata(generatedFiles.mobile, deliveryUrl(identity, "mobile", cdnBaseUrl), {
      profile: "mobile",
      optimizer: transformEvidence.mobile
    }),
    arLite: variantMetadata(generatedFiles.arLite, deliveryUrl(identity, "arLite", cdnBaseUrl), {
      profile: "arLite",
      optimizationMethod: "mesh-simplification-ar-lite",
      optimizer: transformEvidence.arLite,
      triangleCount: generatedAnalysis.arLite.triangles,
      vertexCount: generatedAnalysis.arLite.vertices,
      materialCount: generatedAnalysis.arLite.materials,
      textureCount: generatedAnalysis.arLite.textures,
      maxTextureSize: Math.max(
        0,
        ...generatedAnalysis.arLite.imageMetrics.map((image) => Math.max(image.width ?? 0, image.height ?? 0))
      ),
      extensionsUsed: generatedAnalysis.arLite.extensionsUsed,
      extensionsRequired: generatedAnalysis.arLite.extensionsRequired,
      arPlacement: "floor",
      arScale: "fixed"
    }),
    iosUsdz: variantMetadata(generatedFiles.iosUsdz, deliveryUrl(identity, "iosUsdz", cdnBaseUrl), {
      profile: "ios-quicklook",
      productionFaithful: false,
      faithfulnessStatus: "unproven-until-real-device-qa",
      proxy: false,
      conversionMethod: "glb-usdz-geometry-texture-export",
      sourceVariant: "arLite"
    }),
    poster: variantMetadata(generatedFiles.poster, deliveryUrl(identity, "poster", cdnBaseUrl), {
      profile: "poster",
      placeholder: true,
      productionPoster: false
    })
  };

  const visualQuality = makeVisualQualityReport({ identity, analysis, variants, approvedBy });
  writeJsonFile(join(reports, "visual-quality.json"), visualQuality);

  const manifest = buildManifest({ identity, analysis, variants, visualQuality, approvedBy });
  const validation = validateDishManifestPipeline({
    manifest,
    manifestPath: versionManifestPath(rootDir, identity),
    context: "production",
    requireFiles: allowPublicBinaries && !cdnBaseUrl,
    rootDir,
    strict: true
  });
  if (!validation.ok) {
    manifest.validationStatus = "failed";
    manifest.validation.fails = validation.fails;
  }
  const optimizationOk = validation.ok && visualQuality.status === "passed";
  if (!optimizationOk) {
    manifest.validationStatus = "failed";
  }
  writeJsonFile(join(reports, "optimization-report.json"), {
    ok: optimizationOk,
    identity,
    source,
    generatedFiles,
    transformEvidence,
    candidates: candidateReports,
    selectedCandidate,
    decision,
    delivery: {
      mode: cdnBaseUrl ? "cdn" : "public",
      cdnBaseUrl: cdnBaseUrl || null,
      publicBinariesWritten: false,
      networkValidationRequiredBeforePublish: Boolean(cdnBaseUrl)
    },
    validation
  });
  writeJsonFile(versionManifestPath(rootDir, identity), manifest);

  if (visualQuality.status !== "passed") {
    result.ok = false;
    result.fails.push(STRICT_VISUAL_REJECTION);
  } else {
    result.ok = validation.ok;
  }
  result.fails.push(...validation.fails);
  result.warnings.push(...validation.warnings);
  result.metrics.manifestPath = versionManifestPath(rootDir, identity);
  result.metrics.variants = variants;
  result.metrics.visualQuality = visualQuality;
  result.evidence.push({ stage: "optimization", generatedFiles, transformEvidence });
  return result;
}

function runPublish(args) {
  const result = createResult("3d:publish");
  const rootDir = normalize(resolve(args.root ?? process.cwd()));
  const manifestPath = args.manifest ? normalize(resolve(String(args.manifest))) : "";
  if (!manifestPath || !existsSync(manifestPath)) throw new Error("--manifest must point to an existing dish manifest");
  if (!args.write) throw new Error("Publish requires --write");
  if (!args["quality-approved"]) throw new Error("Publish requires --quality-approved");
  const approvedBy = String(args["approved-by"] ?? "").trim();
  if (!approvedBy) throw new Error("Publish requires --approved-by");

  const manifest = readJsonFile(manifestPath);
  const externalDelivery = manifestUsesExternalDelivery(manifest);
  if (externalDelivery) {
    const networkReport = validateNetworkValidationReport({
      manifest,
      reportPath: args["network-validation-report"]
    });
    mergeResultInto(result, networkReport);
    if (!networkReport.ok) return result;
  }
  const identity = {
    restaurantSlug: cleanSegment(manifest.restaurantSlug, "restaurantSlug"),
    menuSlug: cleanSegment(manifest.menuSlug, "menuSlug"),
    dishSlug: cleanSegment(manifest.dishSlug, "dishSlug"),
    version: cleanVersion(manifest.activeVersion)
  };
  const preflight = validateDishManifestPipeline({
    manifest,
    manifestPath,
    context: "production",
    requireFiles: !externalDelivery,
    rootDir,
    strict: true
  });
  if (!preflight.ok) {
    result.ok = false;
    result.fails.push("Publish requires a pre-approved strict visual identity manifest before promotion");
    result.fails.push(...preflight.fails);
    result.warnings.push(...preflight.warnings);
    result.evidence.push({ preflight });
    return result;
  }
  if (manifest.status !== "approved") {
    throw new Error("Publish requires a pre-approved strict visual identity manifest before promotion: manifest status approved");
  }
  if (manifest.validationStatus !== "passed") {
    throw new Error("Publish requires a pre-approved strict visual identity manifest before promotion: validationStatus passed");
  }
  if (manifest.visualQuality?.status !== "passed") {
    throw new Error("Publish requires a pre-approved strict visual identity manifest before promotion: visualQuality.status passed");
  }
  if (manifest.quality?.manualVisualApproved !== true) {
    throw new Error("Publish requires a pre-approved strict visual identity manifest before promotion: existing manual visual approval");
  }
  if (manifest.visualQuality?.manualReview?.status !== "approved") {
    throw new Error("Publish requires a pre-approved strict visual identity manifest before promotion: human visual report approval");
  }
  if ((manifest.validation?.warnings?.length ?? 0) > 0 || (manifest.validation?.fails?.length ?? 0) > 0) {
    throw new Error("Publish requires a pre-approved strict visual identity manifest before promotion: no warnings or fails");
  }
  const activePath = activeManifestPath(rootDir, identity);
  const previous = existsSync(activePath) ? readJsonFile(activePath) : null;
  const now = new Date().toISOString();
  const published = {
    ...manifest,
    status: "published",
    validationStatus: "passed",
    quality: {
      ...manifest.quality,
      manualVisualApprovalRequired: true,
      manualVisualApproved: manifest.quality.manualVisualApproved,
      approvedBy: manifest.quality.approvedBy,
      publishedBy: approvedBy,
      manualReview: {
        ...(manifest.quality?.manualReview ?? {}),
        status: manifest.quality?.manualReview?.status,
        approvedBy: manifest.quality?.manualReview?.approvedBy,
        approvedAt: manifest.quality?.manualReview?.approvedAt
      }
    },
    visualQuality: {
      ...manifest.visualQuality
    },
    rollback: {
      ...(manifest.rollback ?? {}),
      previousVersion: previous?.activeVersion ?? null,
      fromVersion: null,
      toVersion: null
    },
    validation: { warnings: [], fails: [] },
    approvedAt: manifest.approvedAt,
    publishedAt: now,
    lifecycle: {
      ...(manifest.lifecycle ?? {}),
      phase: "published",
      publishedBy: approvedBy,
      publishedAt: now
    }
  };

  const validation = validateDishManifestPipeline({
    manifest: published,
    manifestPath,
    context: "production",
    requireFiles: !externalDelivery,
    rootDir,
    strict: true
  });
  if (!validation.ok) {
    result.ok = false;
    result.fails.push(...validation.fails);
    result.warnings.push(...validation.warnings);
    return result;
  }

  writeJsonFile(manifestPath, published);
  writeJsonFile(activePath, published);
  const restaurantManifest = writeRestaurantManifest(rootDir, identity.restaurantSlug);
  result.metrics = {
    manifestPath,
    activeManifestPath: activePath,
    previousVersion: previous?.activeVersion ?? null,
    publishedVersion: identity.version,
    restaurantManifestPath: restaurantManifest ? restaurantManifestPath(rootDir, identity.restaurantSlug) : null
  };
  result.evidence.push({ validation });
  return result;
}

function runRollback(args) {
  const result = createResult("3d:rollback");
  const rootDir = normalize(resolve(args.root ?? process.cwd()));
  const identity = identityFromArgs(args, { requireVersion: false });
  const toVersion = cleanVersion(args.to);
  if (!args.write) throw new Error("Rollback requires --write");
  const approvedBy = String(args["approved-by"] ?? "").trim();
  if (!approvedBy) throw new Error("Rollback requires --approved-by");

  const activePath = activeManifestPath(rootDir, { ...identity, version: toVersion });
  if (!existsSync(activePath)) throw new Error(`Active manifest is missing: ${activePath}`);
  const current = readJsonFile(activePath);
  const targetPath = versionManifestPath(rootDir, { ...identity, version: toVersion });
  if (!existsSync(targetPath)) throw new Error(`Rollback target manifest is missing: ${targetPath}`);
  const target = readJsonFile(targetPath);
  const now = new Date().toISOString();
  const rolledBack = {
    ...target,
    status: "published",
    validationStatus: "passed",
    validation: { warnings: [], fails: [] },
    publishedAt: now,
    rollback: {
      ...(target.rollback ?? {}),
      previousVersion: current.activeVersion,
      fromVersion: current.activeVersion,
      toVersion
    },
    lifecycle: {
      ...(target.lifecycle ?? {}),
      phase: "published",
      rollbackBy: approvedBy,
      rollbackAt: now
    }
  };
  const validation = validateDishManifestPipeline({
    manifest: rolledBack,
    manifestPath: targetPath,
    context: "production",
    requireFiles: !manifestUsesExternalDelivery(rolledBack),
    rootDir,
    strict: true
  });
  if (!validation.ok) {
    result.ok = false;
    result.fails.push(...validation.fails);
    result.warnings.push(...validation.warnings);
    return result;
  }

  writeJsonFile(activePath, rolledBack);
  writeRestaurantManifest(rootDir, identity.restaurantSlug);
  result.metrics = {
    activeManifestPath: activePath,
    fromVersion: current.activeVersion,
    toVersion
  };
  result.evidence.push({ validation });
  return result;
}

function runCleanStale(args) {
  const result = createResult("3d:clean-stale");
  const rootDir = normalize(resolve(args.root ?? process.cwd()));
  const identity = identityFromArgs(args, { requireVersion: false });
  const dishRoot = safeJoin(
    rootDir,
    "public",
    "models",
    "restaurants",
    identity.restaurantSlug,
    identity.menuSlug,
    identity.dishSlug
  );
  if (!existsSync(dishRoot)) {
    result.warnings.push(`Dish asset root does not exist: ${dishRoot}`);
    return result;
  }
  const activePath = activeManifestPath(rootDir, { ...identity, version: "" });
  const active = existsSync(activePath)
    ? readJsonFile(activePath)
    : null;
  const activeVersion = active?.activeVersion ?? "";
  if (!activeVersion) {
    result.metrics.activeManifestPath = activePath;
    result.metrics.activeVersion = "";
    result.metrics.stale = [];
    result.warnings.push(
      "No active manifest exists; stale versions cannot be identified safely."
    );
    if (args.write) {
      result.ok = false;
      result.fails.push(
        "Refusing clean-stale --write without an active manifest to preserve."
      );
    }
    return result;
  }
  const stale = readdirSync(dishRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== activeVersion)
    .map((entry) => safeJoin(dishRoot, entry.name));
  result.metrics.activeVersion = activeVersion;
  result.metrics.stale = stale;
  if (args.write) {
    for (const staleDir of stale) {
      rmSync(staleDir, { recursive: true, force: true });
    }
    result.evidence.push({ removed: stale });
  } else {
    result.warnings.push("Dry run only; pass --write after reviewing stale paths.");
  }
  return result;
}

function runPreview(args) {
  const result = createResult("3d:preview");
  const identity = identityFromArgs(args, { requireVersion: false });
  result.metrics.route = `/demo/dishes/${identity.dishSlug}`;
  result.metrics.manifest = args.manifest ?? "";
  result.warnings.push("Preview does not replace browser QA or real-device AR checks.");
  return result;
}

export function runPipelineCommand(commandName, argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    writeStdout(HELP);
    return { ok: true, name: commandName };
  }

  let output;
  try {
    if (commandName === "3d:analyze-source") output = runAnalyzeSource(args);
    else if (commandName === "3d:optimize-dish") output = runOptimizeDish(args);
    else if (commandName === "3d:optimize" || commandName === "3d:optimize-menu") output = runOptimizeDish(args);
    else if (commandName === "3d:approve-visual") output = runApproveVisual(args);
    else if (commandName === "3d:publish") output = runPublish(args);
    else if (commandName === "3d:rollback") output = runRollback(args);
    else if (commandName === "3d:clean-stale") output = runCleanStale(args);
    else if (commandName === "3d:preview") output = runPreview(args);
    else throw new Error(`Unknown 3D pipeline command: ${commandName}`);
  } catch (error) {
    output = failResult(commandName, error);
  }

  process.exitCode = output.ok ? 0 : 1;
  writeStdout(output, true);
  return output;
}
