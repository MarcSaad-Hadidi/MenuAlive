import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { createValidationResult } from "./file-exists.mjs";

export function writeReportFile({ filePath, contents, label = "report" } = {}) {
  const result = createValidationResult({
    name: "report-writer",
    metrics: { filePath, bytes: 0 }
  });

  if (!filePath) {
    result.ok = false;
    result.fails.push(`${label}: filePath is required`);
    return result;
  }

  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, contents);
  result.metrics.bytes = Buffer.byteLength(contents);
  result.evidence.push({ filePath, bytes: result.metrics.bytes });
  return result;
}
