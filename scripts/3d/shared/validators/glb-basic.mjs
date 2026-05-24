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
const RISKY_AR_EXTENSIONS = new Set([
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

function collectChunks(bytes, result, label) {
  const chunks = [];
  let cursor = 12;
  let jsonCount = 0;
  let binCount = 0;

  while (cursor < bytes.length) {
    if (cursor + 8 > bytes.length) {
      addFail(result, `${label}: GLB chunk header is truncated`, { cursor });
      break;
    }

    const byteLength = bytes.readUInt32LE(cursor);
    const type = bytes.readUInt32LE(cursor + 4);
    const byteOffset = cursor + 8;
    const byteEnd = byteOffset + byteLength;
    const chunk = {
      type: chunkTypeLabel(type),
      rawType: type,
      byteOffset,
      byteLength
    };
    chunks.push(chunk);

    if (byteLength % 4 !== 0) {
      addFail(result, `${label}: ${chunk.type} chunk length is not 4-byte aligned`, chunk);
    }
    if (byteEnd > bytes.length) {
      addFail(result, `${label}: ${chunk.type} chunk exceeds file bounds`, chunk);
      break;
    }
    if (type === JSON_CHUNK_TYPE) jsonCount += 1;
    if (type === BIN_CHUNK_TYPE) binCount += 1;

    cursor = byteEnd;
  }

  if (chunks[0]?.rawType !== JSON_CHUNK_TYPE) {
    addFail(result, `${label}: first GLB chunk must be JSON`);
  }
  if (jsonCount !== 1) {
    addFail(result, `${label}: GLB must contain exactly one JSON chunk`);
  }
  if (binCount > 1) {
    addFail(result, `${label}: GLB must contain at most one BIN chunk`);
  }

  return chunks;
}

function isValidIndex(value, collection) {
  return Number.isInteger(value) && value >= 0 && value < collection.length;
}

function validateReferences(json, result, label) {
  const buffers = json.buffers ?? [];
  const bufferViews = json.bufferViews ?? [];
  const accessors = json.accessors ?? [];
  const images = json.images ?? [];
  const materials = json.materials ?? [];

  for (const [index, bufferView] of bufferViews.entries()) {
    if (!isValidIndex(bufferView.buffer, buffers)) {
      addFail(result, `${label}: bufferView ${index} references missing buffer ${bufferView.buffer}`);
    }
  }

  for (const [index, accessor] of accessors.entries()) {
    if (accessor.bufferView != null && !isValidIndex(accessor.bufferView, bufferViews)) {
      addFail(result, `${label}: accessor ${index} references missing bufferView ${accessor.bufferView}`);
    }
  }

  for (const [index, texture] of (json.textures ?? []).entries()) {
    if (texture.source != null && !isValidIndex(texture.source, images)) {
      addFail(result, `${label}: texture ${index} references missing image ${texture.source}`);
    }
  }

  for (const [index, image] of images.entries()) {
    if (image.bufferView != null && !isValidIndex(image.bufferView, bufferViews)) {
      addFail(result, `${label}: image ${index} references missing bufferView ${image.bufferView}`);
    }
  }

  for (const [meshIndex, mesh] of (json.meshes ?? []).entries()) {
    for (const [primitiveIndex, primitive] of (mesh.primitives ?? []).entries()) {
      if (primitive.material != null && !isValidIndex(primitive.material, materials)) {
        addFail(
          result,
          `${label}: mesh ${meshIndex} primitive ${primitiveIndex} references missing material ${primitive.material}`
        );
      }
      if (primitive.indices != null && !isValidIndex(primitive.indices, accessors)) {
        addFail(
          result,
          `${label}: mesh ${meshIndex} primitive ${primitiveIndex} references missing indices accessor ${primitive.indices}`
        );
      }
      for (const [semantic, accessorIndex] of Object.entries(primitive.attributes ?? {})) {
        if (!isValidIndex(accessorIndex, accessors)) {
          addFail(
            result,
            `${label}: mesh ${meshIndex} primitive ${primitiveIndex} attribute ${semantic} references missing accessor ${accessorIndex}`
          );
        }
      }
    }
  }
}

function collectExternalUris(json) {
  const externalBufferUris = (json.buffers ?? [])
    .map((buffer) => buffer.uri)
    .filter((uri) => typeof uri === "string" && uri && !uri.startsWith("data:"));
  const externalImageUris = (json.images ?? [])
    .map((image) => image.uri)
    .filter((uri) => typeof uri === "string" && uri && !uri.startsWith("data:"));

  return { externalBufferUris, externalImageUris };
}

export function validateGlbBasic({
  filePath,
  label = filePath,
  role = "web",
  expectedSha256 = "",
  production = false
} = {}) {
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
  if (expectedSha256 && result.metrics.sha256 !== expectedSha256) {
    addFail(result, `${label}: sha256 mismatch`, {
      filePath,
      actualSha256: result.metrics.sha256,
      expectedSha256
    });
  }

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
  if (version !== 2) addFail(result, `${label}: GLB container version must be 2`);
  if (declaredLength !== bytes.length) {
    addFail(result, `${label}: GLB declared length ${declaredLength} does not match actual ${bytes.length}`);
  }

  const chunks = collectChunks(bytes, result, label);
  result.metrics.chunks = chunks.map(({ type, byteOffset, byteLength }) => ({
    type,
    byteOffset,
    byteLength
  }));
  const jsonChunk = chunks.find((chunk) => chunk.rawType === JSON_CHUNK_TYPE);
  const binChunk = chunks.find((chunk) => chunk.rawType === BIN_CHUNK_TYPE);
  if (!jsonChunk) return result;

  let json;
  try {
    json = JSON.parse(
      bytes
        .subarray(jsonChunk.byteOffset, jsonChunk.byteOffset + jsonChunk.byteLength)
        .toString("utf8")
        .trim()
    );
    result.metrics.jsonReadable = true;
  } catch (error) {
    return addFail(result, `${label}: GLB JSON chunk is not readable JSON: ${error.message}`);
  }

  if (json.asset?.version !== "2.0") {
    addFail(result, `${label}: glTF asset.version must be 2.0`);
  }

  const primitives = (json.meshes ?? []).flatMap((mesh) => mesh.primitives ?? []);
  result.metrics.assetVersion = json.asset?.version ?? "";
  result.metrics.generator = json.asset?.generator ?? "";
  result.metrics.meshCount = json.meshes?.length ?? 0;
  result.metrics.primitiveCount = primitives.length;
  result.metrics.materialCount = json.materials?.length ?? 0;
  result.metrics.textureCount = json.textures?.length ?? 0;
  result.metrics.imageCount = json.images?.length ?? 0;
  result.metrics.extensionsUsed = json.extensionsUsed ?? [];
  result.metrics.extensionsRequired = json.extensionsRequired ?? [];

  if (result.metrics.meshCount === 0) addFail(result, `${label}: GLB contains no meshes`);
  if (result.metrics.primitiveCount === 0) addFail(result, `${label}: GLB contains no primitives`);
  if (result.metrics.materialCount === 0) addFail(result, `${label}: GLB contains no materials`);

  const embeddedBuffer = (json.buffers ?? []).find((buffer) => !buffer.uri);
  if (embeddedBuffer && !binChunk) {
    addFail(result, `${label}: GLB has embedded buffer metadata but no BIN chunk`);
  }
  if (embeddedBuffer && binChunk) {
    const declared = Number(embeddedBuffer.byteLength);
    if (!Number.isFinite(declared) || declared <= 0) {
      addFail(result, `${label}: embedded buffer byteLength must be positive`);
    } else if (declared > binChunk.byteLength || binChunk.byteLength > declared + 3) {
      addFail(result, `${label}: BIN chunk length does not match embedded buffer byteLength`, {
        declared,
        binChunkBytes: binChunk.byteLength
      });
    }
  }

  validateReferences(json, result, label);
  const { externalBufferUris, externalImageUris } = collectExternalUris(json);
  result.metrics.externalBufferUris = externalBufferUris;
  result.metrics.externalImageUris = externalImageUris;
  const externalUris = [...externalBufferUris, ...externalImageUris];
  if (externalUris.length > 0) {
    const message = `${label}: GLB references external URI resources`;
    if (production) addFail(result, message, { externalUris });
    else addWarning(result, message, { externalUris });
  }

  const riskyExtensions = [
    ...new Set(
      [...result.metrics.extensionsUsed, ...result.metrics.extensionsRequired].filter((extension) =>
        RISKY_AR_EXTENSIONS.has(extension)
      )
    )
  ];
  if (riskyExtensions.length > 0) {
    addWarning(result, `${label}: potential AR-incompatible GLB extension(s): ${riskyExtensions.join(", ")}`, {
      filePath,
      role,
      riskyExtensions
    });
  }
  if ((role === "arLite" || production) && result.metrics.extensionsRequired.length > 0) {
    addWarning(result, `${label}: AR delivery should avoid required extensions`, {
      role,
      extensionsRequired: result.metrics.extensionsRequired
    });
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
