import { readFileSync } from "node:fs";
import { basename } from "node:path";

import * as fflate from "fflate";

import {
  addFail,
  addWarning,
  createValidationResult,
  isGitLfsPointerBytes,
  validateFileExists
} from "./file-exists.mjs";
import { sha256File } from "./sha256.mjs";

const USD_LAYER_PATTERN = /\.usd[ac]?$/i;
const TEXTURE_PATTERN = /\.(?:png|jpe?g|webp)$/i;

function isUnsafeZipPath(name) {
  return (
    name.startsWith("/") ||
    /^[a-z]:/i.test(name) ||
    name.includes("\\") ||
    name.split("/").some((part) => part === "..")
  );
}

function hasEndOfCentralDirectory(bytes) {
  return bytes.includes(Buffer.from("504b0506", "hex"));
}

function textFrom(bytes) {
  return Buffer.from(bytes).toString("utf8");
}

function usdText(bytes) {
  const text = textFrom(bytes);
  return text.startsWith("#usda") ? text : "";
}

function hasUsdSignature(name, bytes) {
  const head = Buffer.from(bytes).subarray(0, 8).toString("utf8");
  if (/\.usda$/i.test(name)) return head.startsWith("#usda");
  if (/\.usd$/i.test(name)) return head.startsWith("#usda") || head.startsWith("PXR-USDC");
  if (/\.usdc$/i.test(name)) return head.startsWith("PXR-USDC");
  return false;
}

function hasTextureSignature(name, bytes) {
  const buffer = Buffer.from(bytes);
  if (/\.png$/i.test(name)) {
    return buffer.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"));
  }
  if (/\.jpe?g$/i.test(name)) {
    return buffer.subarray(0, 3).equals(Buffer.from("ffd8ff", "hex"));
  }
  if (/\.webp$/i.test(name)) {
    return buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP";
  }
  return false;
}

function hasGeometryText(text) {
  return (
    /\bdef\s+Mesh\b/.test(text) ||
    /\bpoint3f\[\]\s+points\b/.test(text) ||
    /\bfaceVertexIndices\b/.test(text)
  );
}

function countMaterials(text) {
  return (text.match(/\bdef\s+Material\b/g) ?? []).length;
}

function validateProductionUrl(result, url, label) {
  if (!url) return;
  if (!url.endsWith(".usdz")) {
    addFail(result, `${label}: production USDZ URL must end with .usdz`, { url });
  }
  if (/[?#]/.test(url)) {
    addFail(result, `${label}: production USDZ URL must not include query string or hash`, { url });
  }
  if (
    url.includes("\\") ||
    url.includes("..") ||
    url.startsWith("//") ||
    /^(?:javascript|data|file):/i.test(url)
  ) {
    addFail(result, `${label}: production USDZ URL is unsafe`, { url });
  }
}

export function validateUsdzBasic({
  filePath,
  url = "",
  label = filePath,
  expectedSha256 = "",
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

  if (productionUrl) validateProductionUrl(result, url, label);

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
  if (isGitLfsPointerBytes(raw)) {
    return addFail(result, `${label}: file is a Git LFS pointer`, { filePath });
  }

  result.metrics.sha256 = sha256File(filePath);
  if (expectedSha256 && result.metrics.sha256 !== expectedSha256) {
    addFail(result, `${label}: sha256 mismatch`, {
      filePath,
      actualSha256: result.metrics.sha256,
      expectedSha256
    });
  }

  result.metrics.magic = raw.subarray(0, 2).toString("utf8");
  if (raw.subarray(0, 4).toString("latin1") !== "PK\u0003\u0004") {
    return addFail(result, `${label}: invalid USDZ ZIP magic`, { filePath });
  }
  if (!hasEndOfCentralDirectory(raw)) {
    addFail(result, `${label}: ZIP end-of-central-directory marker is missing`, { filePath });
  }

  let zip;
  try {
    zip = fflate.unzipSync(raw);
    result.metrics.zipReadable = true;
  } catch (error) {
    return addFail(result, `${label}: ZIP is not readable: ${error.message}`, { filePath });
  }

  const entries = Object.entries(zip)
    .map(([name, bytes]) => ({ name, bytes: bytes.length }))
    .sort((a, b) => b.bytes - a.bytes);
  const names = entries.map((entry) => entry.name);
  result.metrics.entryCount = entries.length;
  result.metrics.largestEntries = entries.slice(0, 8);

  if (entries.length === 0) addFail(result, `${label}: ZIP package is empty`);

  const unsafeEntries = names.filter(isUnsafeZipPath);
  if (unsafeEntries.length > 0) {
    addFail(result, `${label}: ZIP contains unsafe entry path(s): ${unsafeEntries.join(", ")}`);
  }
  for (const entry of entries) {
    if (entry.bytes === 0 && !entry.name.endsWith("/")) {
      addFail(result, `${label}: ZIP entry is empty: ${entry.name}`);
    }
  }

  const usdNames = names.filter((name) => USD_LAYER_PATTERN.test(name));
  const textureNames = names.filter((name) => TEXTURE_PATTERN.test(name));
  const textLayers = usdNames
    .map((name) => ({ name, text: usdText(zip[name]) }))
    .filter((entry) => entry.text);
  const usdTextBundle = textLayers.map((entry) => entry.text).join("\n");
  const geometryTextNames = textLayers
    .filter((entry) => hasGeometryText(entry.text))
    .map((entry) => entry.name);

  result.metrics.usdLayerCount = usdNames.length;
  result.metrics.geometryLayerCount = geometryTextNames.length;
  result.metrics.textureCount = textureNames.length;
  result.metrics.materialCount = textLayers.reduce(
    (total, entry) => total + countMaterials(entry.text),
    0
  );
  result.metrics.usdLayers = usdNames;
  result.metrics.textureEntries = textureNames;

  if (usdNames.length === 0) {
    addFail(result, `${label}: USDZ contains no USD layer`);
  }
  for (const name of usdNames) {
    if (!hasUsdSignature(name, zip[name])) {
      addFail(result, `${label}: invalid USD layer signature: ${name}`);
    }
  }
  if (result.metrics.geometryLayerCount === 0) {
    addWarning(result, `${label}: no text USDA geometry indicators detected; deep USD validation may be required`);
  }
  if (result.metrics.materialCount === 0) {
    addWarning(result, `${label}: no text USDA material indicators detected; deep USD validation may be required`);
  }
  for (const name of textureNames) {
    if (!hasTextureSignature(name, zip[name])) {
      addFail(result, `${label}: invalid texture signature: ${name}`);
    }
  }

  const referencedTextures = [
    ...usdTextBundle.matchAll(/(?:@|")([^@"\s]+\.(?:png|jpe?g|webp))(?:@|")/gi)
  ].map((match) => basename(match[1]));
  const textureBasenames = new Set(textureNames.map((name) => basename(name)));
  const missingTextures = referencedTextures.filter((name) => !textureBasenames.has(name));
  if (missingTextures.length > 0) {
    addFail(result, `${label}: references missing texture resources: ${missingTextures.join(", ")}`);
  }

  if (/\bundefined\b/i.test(usdTextBundle)) {
    addFail(result, `${label}: USD text layer contains undefined references`);
  }
  if (/\bDishProxy\b/.test(usdTextBundle) || /vistaire:sourceSha256/.test(usdTextBundle)) {
    addFail(result, `${label}: USDZ appears to be a generated proxy package, not a faithful production export`);
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
