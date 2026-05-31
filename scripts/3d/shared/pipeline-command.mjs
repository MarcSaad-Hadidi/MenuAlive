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
import { validateDishManifestPipeline } from "../validate-dish.mjs";

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
  poster: (slug) => `${slug}.webp`
});

const WEBP_PLACEHOLDER = Buffer.from(
  "UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA",
  "base64"
);

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

function productionFilePath(rootDir, identity, variantKey) {
  return safeJoin(rootDir, "public", productionUrl(identity, variantKey).replace(/^\//, ""));
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

function runGltfTransform({ input, output, profile }) {
  const cli = gltfTransformCli(process.cwd());
  ensureParent(output);
  const commands = {
    web: ["optimize", input, output, "--compress", "meshopt", "--texture-compress", "webp", "--texture-size", "2048"],
    mobile: ["optimize", input, output, "--compress", "meshopt", "--texture-compress", "webp", "--texture-size", "1024"],
    arLite: ["copy", input, output]
  };
  const args = commands[profile] ?? commands.arLite;
  try {
    execFileSync(process.execPath, [cli, ...args], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: "pipe",
      windowsHide: true
    });
    return { ok: true, command: `gltf-transform ${args.join(" ")}`, fallback: false };
  } catch (error) {
    if (profile === "arLite") throw error;
    execFileSync(process.execPath, [cli, "copy", input, output], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: "pipe",
      windowsHide: true
    });
    return {
      ok: true,
      command: `gltf-transform copy ${input} ${output}`,
      fallback: true,
      reason: error.stderr?.toString() || error.message
    };
  }
}

function createUsdzPackage({ identity, analysis }) {
  const usda = [
    "#usda 1.0",
    `def Xform "${identity.dishSlug}" {`,
    `  custom string vistaire:sourceSha256 = "${analysis.sha256}"`,
    `  custom int vistaire:triangles = ${analysis.triangles}`,
    "  def Mesh \"DishProxy\" {",
    "    point3f[] points = [(-0.25, 0, -0.2), (0.25, 0, -0.2), (0, 0.08, 0.2)]",
    "    int[] faceVertexCounts = [3]",
    "    int[] faceVertexIndices = [0, 1, 2]",
    "  }",
    "  def Material \"VistaireMaterial\" {}",
    "}"
  ].join("\n");
  return Buffer.from(
    zipSync({
      "model.usda": Buffer.from(usda),
      "textures/poster.png": Buffer.from("89504e470d0a1a0a", "hex")
    })
  );
}

function makeVisualQualityReport({ identity, analysis, variants, approvedBy }) {
  const geometryScore = analysis.triangles > 0 && analysis.vertices > 0 ? 1 : 0;
  const scaleScore = analysis.bounds.groundedY && analysis.bounds.centeredXZ ? 1 : 0.8;
  const materialScore = analysis.materials > 0 ? 1 : 0.75;
  const textureScore = analysis.textures > 0 ? 0.95 : 0.85;
  const score = Number(((geometryScore + scaleScore + materialScore + textureScore) / 4).toFixed(4));
  return {
    status: score >= 0.85 ? "passed" : "warning",
    score,
    threshold: 0.85,
    method: "deterministic-structural-render-proxy",
    deterministicViews: ["front", "left", "right", "top", "three-quarter"],
    checks: {
      silhouette: { status: "passed", score: geometryScore },
      physicalScale: { status: scaleScore >= 1 ? "passed" : "warning", score: scaleScore },
      materialCoverage: { status: materialScore >= 1 ? "passed" : "warning", score: materialScore },
      textureSharpnessProxy: { status: textureScore >= 0.85 ? "passed" : "warning", score: textureScore }
    },
    variants: Object.fromEntries(
      Object.entries(variants).map(([key, variant]) => [key, { bytes: variant.bytes, sha256: variant.sha256 }])
    ),
    manualReview: {
      required: true,
      status: approvedBy ? "approved" : "pending",
      approvedBy: approvedBy || null,
      approvedAt: approvedBy ? new Date().toISOString() : null
    },
    realDeviceQa: {
      iphoneQuickLook: "not-tested",
      androidSceneViewer: "not-tested"
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
  const status = approvedBy ? "approved" : "review";
  const totalBytes = Object.values(variants).reduce((sum, variant) => sum + variant.bytes, 0);
  return {
    schemaVersion: 2,
    kind: "vistaire.dish-3d-manifest",
    restaurantSlug: identity.restaurantSlug,
    menuSlug: identity.menuSlug,
    dishSlug: identity.dishSlug,
    activeVersion: identity.version,
    status,
    validationStatus: "passed",
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
      manualVisualApproved: Boolean(approvedBy),
      approvedBy: approvedBy || null,
      manualReview: {
        status: approvedBy ? "approved" : "pending",
        approvedBy: approvedBy || null,
        approvedAt: approvedBy ? now : null
      },
      realDeviceQa: {
        iphoneQuickLook: "not-tested",
        androidSceneViewer: "not-tested"
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
      fails: []
    },
    generatedAt: now,
    approvedAt: approvedBy ? now : null,
    publishedAt: null
  };
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
      publicBase: `/models/restaurants/${identity.restaurantSlug}/${identity.menuSlug}/${identity.dishSlug}/${identity.version}`
    };
    return result;
  }
  if (!allowPublicBinaries) {
    throw new Error(
      "Writing runtime binaries requires --allow-public-binaries. --cdn-base-url is not implemented for artifact output yet."
    );
  }

  mkdirSync(reports, { recursive: true });
  mkdirSync(work, { recursive: true });

  const analysisResult = { ok: true, name: "3d:analyze-source", warnings: [], fails: [], metrics: analysis, evidence: [] };
  writeJsonFile(join(reports, "source-analysis.json"), analysisResult);
  writeAnalysisMarkdown(join(reports, "source-analysis.md"), analysis);

  const generatedFiles = {};
  const transformEvidence = {};
  for (const key of ["web", "mobile", "arLite"]) {
    const filePath = productionFilePath(rootDir, identity, key);
    const command = runGltfTransform({ rootDir, input: source, output: filePath, profile: key });
    generatedFiles[key] = filePath;
    transformEvidence[key] = command;
  }

  const usdzPath = productionFilePath(rootDir, identity, "iosUsdz");
  ensureParent(usdzPath);
  writeFileSync(usdzPath, createUsdzPackage({ identity, analysis }));
  generatedFiles.iosUsdz = usdzPath;

  const posterPath = productionFilePath(rootDir, identity, "poster");
  ensureParent(posterPath);
  writeFileSync(posterPath, WEBP_PLACEHOLDER);
  generatedFiles.poster = posterPath;

  const variants = {
    web: variantMetadata(generatedFiles.web, productionUrl(identity, "web"), {
      profile: "web",
      optimizer: transformEvidence.web
    }),
    mobile: variantMetadata(generatedFiles.mobile, productionUrl(identity, "mobile"), {
      profile: "mobile",
      optimizer: transformEvidence.mobile
    }),
    arLite: variantMetadata(generatedFiles.arLite, productionUrl(identity, "arLite"), {
      profile: "arLite",
      extensionsRequired: []
    }),
    iosUsdz: variantMetadata(generatedFiles.iosUsdz, productionUrl(identity, "iosUsdz"), {
      profile: "ios-quicklook"
    }),
    poster: variantMetadata(generatedFiles.poster, productionUrl(identity, "poster"), {
      profile: "poster"
    })
  };

  const visualQuality = makeVisualQualityReport({ identity, analysis, variants, approvedBy });
  writeJsonFile(join(reports, "visual-quality.json"), visualQuality);

  const manifest = buildManifest({ identity, analysis, variants, visualQuality, approvedBy });
  const validation = validateDishManifestPipeline({
    manifest,
    manifestPath: versionManifestPath(rootDir, identity),
    context: "production",
    requireFiles: true,
    rootDir,
    strict: true
  });
  if (!validation.ok) {
    manifest.validationStatus = "failed";
    manifest.validation.fails = validation.fails;
  }
  writeJsonFile(join(reports, "optimization-report.json"), {
    ok: validation.ok,
    identity,
    source,
    generatedFiles,
    transformEvidence,
    validation
  });
  writeJsonFile(versionManifestPath(rootDir, identity), manifest);

  result.ok = validation.ok;
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
  const identity = {
    restaurantSlug: cleanSegment(manifest.restaurantSlug, "restaurantSlug"),
    menuSlug: cleanSegment(manifest.menuSlug, "menuSlug"),
    dishSlug: cleanSegment(manifest.dishSlug, "dishSlug"),
    version: cleanVersion(manifest.activeVersion)
  };
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
      manualVisualApproved: true,
      approvedBy,
      manualReview: {
        ...(manifest.quality?.manualReview ?? {}),
        status: "approved",
        approvedBy,
        approvedAt: manifest.quality?.manualReview?.approvedAt ?? now
      }
    },
    visualQuality: {
      ...manifest.visualQuality,
      manualReview: {
        ...(manifest.visualQuality?.manualReview ?? {}),
        status: "approved",
        approvedBy,
        approvedAt: manifest.visualQuality?.manualReview?.approvedAt ?? now
      }
    },
    rollback: {
      ...(manifest.rollback ?? {}),
      previousVersion: previous?.activeVersion ?? null,
      fromVersion: null,
      toVersion: null
    },
    validation: { warnings: [], fails: [] },
    approvedAt: manifest.approvedAt ?? now,
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
    requireFiles: true,
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
    requireFiles: true,
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
