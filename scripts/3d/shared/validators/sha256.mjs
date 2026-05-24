import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  addFail,
  createValidationResult,
  isGitLfsPointerBytes,
  validateFileExists
} from "./file-exists.mjs";

export function sha256File(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

export function validateSha256({ filePath, expectedSha256 = "", label = filePath } = {}) {
  const result = createValidationResult({
    name: "sha256",
    metrics: {
      filePath,
      expectedSha256,
      actualSha256: ""
    }
  });
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

  const actualSha256 = sha256File(filePath);
  result.metrics.actualSha256 = actualSha256;
  result.evidence.push({ filePath, actualSha256, expectedSha256 });

  if (expectedSha256 && actualSha256 !== expectedSha256) {
    addFail(result, `${label}: sha256 mismatch`, {
      filePath,
      actualSha256,
      expectedSha256
    });
  }

  return result;
}
