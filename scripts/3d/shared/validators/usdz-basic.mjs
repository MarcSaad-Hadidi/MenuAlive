import { readFileSync } from "node:fs";

import * as fflate from "fflate";

import {
  addFail,
  addWarning,
  createValidationResult,
  isGitLfsPointerBytes,
  validateFileExists
} from "./file-exists.mjs";
import { sha256File } from "./sha256.mjs";

const TEXTURE_PATTERN = /\.(?:png|jpe?g|webp|avif)$/i;
const USD_LAYER_PATTERN = /\.usd[ac]?$/i;
const GEOMETRY_LAYER_PATTERN = /(?:^|\/)geometries\/.*\.usd[ac]?$/i;

function isUnsafeZipPath(name) {
  return (
    name.startsWith("/") ||
    /^[a-z]:/i.test(name) ||
    name.split("/").some((part) => part === "..")
  );
}

function usdText(bytes) {
  const buffer = Buffer.from(bytes);
  const head = buffer.subarray(0, 8).toString("utf8");
  if (!head.startsWith("#usda")) return "";
  return buffer.toString("utf8");
}

function hasGeometryText(text) {
  return (
    /\bdef\s+Mesh\b/.test(text) ||
    /\bpoint3f\[\]\s+points\b/.test(text) ||
    /\bint\[\]\s+faceVertexIndices\b/.test(text)
  );
}

function countMaterials(text) {
  return (text.match(/\bdef\s+Material\b/g) ?? []).length;
}

export function validateUsdzBasic({
  filePath,
  url = "",
  label = filePath,
  productionUrl = true
} = {}) {
  const result = createValidationResult({
    name: "usdz-basic",
    metrics: {
      filePath,
      url,
      fileSizeBytes: 0,
      sha256: "",
      magic: "",
      zipReadable: false,
      entryCount: 0,
      usdLayerCount: 0,
      geometryLayerCount: 0,
      textureCount: 0,
      materialCount: 0,
      largestEntries: []
    }
  });

  if (productionUrl && url && /[?#]/.test(url)) {
    addFail(result, `${label}: production USDZ URL must not include query string or hash`, {
      url
    });
  }

  const exists = validateFileExists({ filePath, label });
  result.warnings.push(...exists.warnings);
  result.fails.push(...exists.fails);
  result.evidence.push(...exists.evidence);
  result.metrics.fileSizeBytes = exists.metrics.bytes;
  if (!exists.ok) {
    result.ok = false;
    return result;
  }

  const raw = readFileSync(filePath);
  result.metrics.sha256 = sha256File(filePath);
  if (isGitLfsPointerBytes(raw)) {
    return addFail(result, `${label}: file is a Git LFS pointer`, { filePath });
  }

  const magic = raw.subarray(0, 2).toString("utf8");
  result.metrics.magic = magic;
  if (magic !== "PK") {
    return addFail(result, `${label}: invalid USDZ ZIP magic ${JSON.stringify(magic)}`);
  }

  let zip;
  try {
    zip = fflate.unzipSync(raw);
    result.metrics.zipReadable = true;
  } catch (error) {
    return addFail(result, `${label}: ZIP is not readable: ${error.message}`);
  }

  const entries = Object.entries(zip)
    .map(([name, bytes]) => ({ name, bytes: bytes.length }))
    .sort((a, b) => b.bytes - a.bytes);
  const names = entries.map((entry) => entry.name);
  result.metrics.entryCount = entries.length;
  result.metrics.largestEntries = entries.slice(0, 8);

  if (entries.length === 0) {
    return addFail(result, `${label}: ZIP package is empty`);
  }

  const unsafe = names.filter(isUnsafeZipPath);
  if (unsafe.length > 0) {
    addFail(result, `${label}: ZIP contains unsafe entry path(s): ${unsafe.join(", ")}`);
  }

  const usdNames = names.filter((name) => USD_LAYER_PATTERN.test(name));
  const textureNames = names.filter((name) => TEXTURE_PATTERN.test(name));
  const geometryLayerNames = names.filter((name) => GEOMETRY_LAYER_PATTERN.test(name));
  const textLayers = usdNames
    .map((name) => ({ name, text: usdText(zip[name]) }))
    .filter((entry) => entry.text);
  const geometryTextNames = textLayers
    .filter((entry) => hasGeometryText(entry.text))
    .map((entry) => entry.name);
  const materialCount = textLayers.reduce((total, entry) => total + countMaterials(entry.text), 0);

  result.metrics.usdLayerCount = usdNames.length;
  result.metrics.geometryLayerCount = new Set([...geometryLayerNames, ...geometryTextNames]).size;
  result.metrics.textureCount = textureNames.length;
  result.metrics.materialCount = materialCount;
  result.metrics.usdLayers = usdNames;
  result.metrics.textureEntries = textureNames;

  if (usdNames.length === 0) addFail(result, `${label}: USDZ contains no USD layer`);
  if (result.metrics.geometryLayerCount === 0) {
    addFail(result, `${label}: USDZ contains no detectable geometry layer`);
  }
  if (textureNames.length === 0) {
    addWarning(result, `${label}: USDZ contains no detectable texture image`);
  }
  if (materialCount === 0) {
    addWarning(result, `${label}: USDZ contains no detectable text USDA material`);
  }

  const undefinedTextLayers = textLayers
    .filter((entry) => /\bundefined\b/.test(entry.text))
    .map((entry) => entry.name);
  if (undefinedTextLayers.length > 0) {
    addFail(result, `${label}: USD text layer contains undefined geometry references`);
  }

  result.evidence.push({
    filePath,
    url,
    sha256: result.metrics.sha256,
    entryCount: result.metrics.entryCount,
    usdLayerCount: result.metrics.usdLayerCount,
    geometryLayerCount: result.metrics.geometryLayerCount,
    textureCount: result.metrics.textureCount,
    materialCount: result.metrics.materialCount,
    largestEntries: result.metrics.largestEntries
  });

  return result;
}
