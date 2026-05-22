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
  offset = 0,
  encoding = "utf8"
} = {}) {
  const result = createValidationResult({
    name: "file-signature",
    metrics: {
      filePath,
      expectedMagic,
      actualMagic: ""
    }
  });

  const exists = validateFileExists({ filePath, label });
  result.warnings.push(...exists.warnings);
  result.fails.push(...exists.fails);
  result.evidence.push(...exists.evidence);
  result.metrics.bytes = exists.metrics.bytes;
  if (!exists.ok) {
    result.ok = false;
    return result;
  }

  const bytes = readFileSync(filePath);
  if (isGitLfsPointerBytes(bytes)) {
    return addFail(result, `${label}: file is a Git LFS pointer`, { filePath });
  }

  const actualMagic = bytes.subarray(offset, offset + expectedMagic.length).toString(encoding);
  result.metrics.actualMagic = actualMagic;
  result.evidence.push({ filePath, offset, expectedMagic, actualMagic });

  if (actualMagic !== expectedMagic) {
    addFail(
      result,
      `${label}: invalid signature, expected ${JSON.stringify(expectedMagic)}, got ${JSON.stringify(actualMagic)}`,
      { filePath, expectedMagic, actualMagic }
    );
  }

  return result;
}
