import { readFileSync } from "node:fs";

import {
  addFail,
  createValidationResult,
  isGitLfsPointerBytes,
  validateFileExists
} from "./file-exists.mjs";

export function validateFileSignature({
  filePath,
  expectedMagic,
  label = filePath,
  encoding = "utf8"
} = {}) {
  const result = createValidationResult({
    name: "file-signature",
    metrics: {
      filePath,
      expectedMagic,
      magic: ""
    }
  });

  if (!expectedMagic) {
    return addFail(result, `${label}: expectedMagic is required`);
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
  if (isGitLfsPointerBytes(bytes)) {
    return addFail(result, `${label}: file is a Git LFS pointer`, { filePath });
  }

  const magic = bytes.subarray(0, expectedMagic.length).toString(encoding);
  result.metrics.magic = magic;
  result.evidence.push({ filePath, expectedMagic, magic });

  if (magic !== expectedMagic) {
    addFail(result, `${label}: invalid file signature`, {
      filePath,
      expectedMagic,
      magic
    });
  }

  return result;
}
