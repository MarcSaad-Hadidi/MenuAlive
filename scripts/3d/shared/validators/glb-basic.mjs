import { readFileSync } from "node:fs";

import {
  addFail,
  addWarning,
  createValidationResult,
  isGitLfsPointerBytes,
  validateFileExists
} from "./file-exists.mjs";
import { sha256File } from "./sha256.mjs";

const JSON_CHUNK_TYPE = 0x4e4f534a;
const BIN_CHUNK_TYPE = 0x004e4942;

const POTENTIAL_AR_INCOMPATIBLE_EXTENSIONS = new Set([
  "EXT_meshopt_compression",
  "KHR_draco_mesh_compression",
  "KHR_mesh_quantization",
  "KHR_texture_basisu",
  "EXT_texture_webp"
]);

function chunkTypeLabel(type) {
  if (type === JSON_CHUNK_TYPE) return "JSON";
  if (type === BIN_CHUNK_TYPE) return "BIN";
  return `0x${type.toString(16).padStart(8, "0")}`;
}

function collectPrimitives(meshes = []) {
  return meshes.flatMap((mesh, meshIndex) =>
    (mesh.primitives ?? []).map((primitive, primitiveIndex) => ({
      meshIndex,
      primitiveIndex,
      ...primitive
    }))
  );
}

function validateTextureReferences(json, result, label) {
  const images = json.images ?? [];
  for (const [index, texture] of (json.textures ?? []).entries()) {
    if (texture.source == null) continue;
    if (!Number.isInteger(texture.source) || texture.source < 0 || texture.source >= images.length) {
      addFail(result, `${label}: texture ${index} references missing image ${texture.source}`);
    }
  }

  for (const [meshIndex, mesh] of (json.meshes ?? []).entries()) {
    for (const [primitiveIndex, primitive] of (mesh.primitives ?? []).entries()) {
      if (primitive.material == null) continue;
      const materialCount = json.materials?.length ?? 0;
      if (
        !Number.isInteger(primitive.material) ||
        primitive.material < 0 ||
        primitive.material >= materialCount
      ) {
        addFail(
          result,
          `${label}: mesh ${meshIndex} primitive ${primitiveIndex} references missing material ${primitive.material}`
        );
      }
    }
  }
}

export function validateGlbBasic({ filePath, label = filePath, role = "web" } = {}) {
  const result = createValidationResult({
    name: "glb-basic",
    metrics: {
      filePath,
      role,
      fileSizeBytes: 0,
      sha256: "",
      magic: "",
      version: null,
      declaredLength: null,
      actualLength: null,
      chunks: [],
      jsonReadable: false,
      meshCount: 0,
      primitiveCount: 0,
      materialCount: 0,
      textureCount: 0,
      imageCount: 0,
      extensionsUsed: [],
      extensionsRequired: []
    }
  });

  const exists = validateFileExists({ filePath, label });
  result.warnings.push(...exists.warnings);
  result.fails.push(...exists.fails);
  result.evidence.push(...exists.evidence);
  result.metrics.fileSizeBytes = exists.metrics.bytes;
  if (!exists.ok) {
    result.ok = false;
    return result;
  }

  const bytes = readFileSync(filePath);
  result.metrics.actualLength = bytes.length;
  result.metrics.sha256 = sha256File(filePath);

  if (isGitLfsPointerBytes(bytes)) {
    return addFail(result, `${label}: file is a Git LFS pointer`, { filePath });
  }

  if (bytes.length < 20) {
    return addFail(result, `${label}: GLB header is too short`, { filePath, bytes: bytes.length });
  }

  const magic = bytes.subarray(0, 4).toString("utf8");
  const version = bytes.readUInt32LE(4);
  const declaredLength = bytes.readUInt32LE(8);
  result.metrics.magic = magic;
  result.metrics.version = version;
  result.metrics.declaredLength = declaredLength;

  if (magic !== "glTF") addFail(result, `${label}: invalid GLB magic ${JSON.stringify(magic)}`);
  if (version !== 2) addFail(result, `${label}: GLB version must be 2, got ${version}`);
  if (declaredLength !== bytes.length) {
    addFail(
      result,
      `${label}: GLB declared length ${declaredLength} does not match actual ${bytes.length}`
    );
  }

  const jsonLength = bytes.readUInt32LE(12);
  const jsonType = bytes.readUInt32LE(16);
  if (jsonType !== JSON_CHUNK_TYPE) {
    addFail(result, `${label}: first GLB chunk must be JSON, got ${chunkTypeLabel(jsonType)}`);
  }
  if (20 + jsonLength > bytes.length) {
    addFail(result, `${label}: JSON chunk exceeds file bounds`);
  }

  let cursor = 12;
  while (cursor + 8 <= bytes.length) {
    const chunkLength = bytes.readUInt32LE(cursor);
    const chunkType = bytes.readUInt32LE(cursor + 4);
    const chunkStart = cursor + 8;
    const chunkEnd = chunkStart + chunkLength;
    const chunk = {
      type: chunkTypeLabel(chunkType),
      byteOffset: chunkStart,
      byteLength: chunkLength
    };
    result.metrics.chunks.push(chunk);
    if (chunkEnd > bytes.length) {
      addFail(result, `${label}: ${chunk.type} chunk exceeds file bounds`);
      break;
    }
    cursor = chunkEnd + ((4 - (chunkLength % 4)) % 4);
  }

  if (result.fails.length > 0 && jsonType !== JSON_CHUNK_TYPE) return result;

  let json;
  try {
    json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString("utf8"));
    result.metrics.jsonReadable = true;
  } catch (error) {
    return addFail(result, `${label}: GLB JSON chunk is not readable JSON: ${error.message}`);
  }

  const primitives = collectPrimitives(json.meshes ?? []);
  result.metrics.assetVersion = json.asset?.version ?? "";
  result.metrics.generator = json.asset?.generator ?? "";
  result.metrics.meshCount = json.meshes?.length ?? 0;
  result.metrics.primitiveCount = primitives.length;
  result.metrics.primitiveModes = primitives.map((primitive) => primitive.mode ?? 4);
  result.metrics.materialCount = json.materials?.length ?? 0;
  result.metrics.textureCount = json.textures?.length ?? 0;
  result.metrics.imageCount = json.images?.length ?? 0;
  result.metrics.imageMimeTypes = (json.images ?? []).map((image) => image.mimeType ?? "");
  result.metrics.externalBufferUris = (json.buffers ?? [])
    .map((buffer) => buffer.uri)
    .filter((uri) => typeof uri === "string" && uri && !uri.startsWith("data:"));
  result.metrics.externalImageUris = (json.images ?? [])
    .map((image) => image.uri)
    .filter((uri) => typeof uri === "string" && uri && !uri.startsWith("data:"));
  result.metrics.extensionsUsed = json.extensionsUsed ?? [];
  result.metrics.extensionsRequired = json.extensionsRequired ?? [];

  if (result.metrics.meshCount === 0) addFail(result, `${label}: GLB contains no meshes`);
  if (result.metrics.primitiveCount === 0) addFail(result, `${label}: GLB contains no primitives`);
  if (result.metrics.materialCount === 0) addFail(result, `${label}: GLB contains no materials`);
  validateTextureReferences(json, result, label);

  const riskyExtensions = [
    ...new Set(
      [...result.metrics.extensionsUsed, ...result.metrics.extensionsRequired].filter((extension) =>
        POTENTIAL_AR_INCOMPATIBLE_EXTENSIONS.has(extension)
      )
    )
  ];
  if (riskyExtensions.length > 0) {
    addWarning(
      result,
      `${label}: potential AR-incompatible GLB extension(s): ${riskyExtensions.join(", ")}`,
      { filePath, role, riskyExtensions }
    );
  }
  if (role === "arLite" && result.metrics.extensionsRequired.length > 0) {
    addWarning(
      result,
      `${label}: AR-lite GLB has required extensions: ${result.metrics.extensionsRequired.join(", ")}`,
      { filePath, role, extensionsRequired: result.metrics.extensionsRequired }
    );
  }
  if (result.metrics.externalBufferUris.length > 0) {
    addWarning(result, `${label}: GLB references external buffers`);
  }
  if (result.metrics.externalImageUris.length > 0) {
    addWarning(result, `${label}: GLB references external images`);
  }

  result.evidence.push({
    filePath,
    role,
    sha256: result.metrics.sha256,
    meshCount: result.metrics.meshCount,
    primitiveCount: result.metrics.primitiveCount,
    materialCount: result.metrics.materialCount,
    textureCount: result.metrics.textureCount,
    imageCount: result.metrics.imageCount,
    extensionsRequired: result.metrics.extensionsRequired
  });

  return result;
}
