import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { addFail, createValidationResult, validateFileExists } from "./file-exists.mjs";

const SHA256_PATTERN = /^[a-f0-9]{64}$/i;

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
  result.metrics.bytes = exists.metrics.bytes;
  if (!exists.ok) {
    result.ok = false;
    return result;
  }

  if (expectedSha256 && !SHA256_PATTERN.test(expectedSha256)) {
    addFail(result, `${label}: expected sha256 is not a 64-character hex digest`);
  }

  const actualSha256 = sha256File(filePath);
  result.metrics.actualSha256 = actualSha256;
  result.evidence.push({ filePath, sha256: actualSha256 });

  if (expectedSha256 && actualSha256.toLowerCase() !== expectedSha256.toLowerCase()) {
    addFail(result, `${label}: sha256 mismatch`, {
      filePath,
      actualSha256,
      expectedSha256
    });
  }

  return result;
}
