import { existsSync, statSync } from "node:fs";

export function createValidationResult(initial = {}) {
  return {
    ok: true,
    warnings: [],
    fails: [],
    metrics: {},
    evidence: [],
    ...initial
  };
}

export function addWarning(result, message, evidence = null) {
  result.warnings.push(message);
  if (evidence) result.evidence.push(evidence);
  return result;
}

export function addFail(result, message, evidence = null) {
  result.ok = false;
  result.fails.push(message);
  if (evidence) result.evidence.push(evidence);
  return result;
}

export function mergeValidationResults(results) {
  const merged = createValidationResult();
  merged.checks = [];

  for (const result of results.filter(Boolean)) {
    if (!result.ok) merged.ok = false;
    merged.warnings.push(...(result.warnings ?? []));
    merged.fails.push(...(result.fails ?? []));
    merged.evidence.push(...(result.evidence ?? []));
    if (result.name) merged.checks.push(result);
  }

  return merged;
}

export function isGitLfsPointerBytes(bytes) {
  return bytes
    .subarray(0, 64)
    .toString("utf8")
    .startsWith("version https://git-lfs.github.com/spec/v1");
}

export function validateFileExists({ filePath, label = filePath } = {}) {
  const result = createValidationResult({
    name: "file-exists",
    metrics: {
      filePath,
      exists: false,
      bytes: 0
    }
  });

  if (!filePath) {
    return addFail(result, `${label}: filePath is required`);
  }

  if (!existsSync(filePath)) {
    return addFail(result, `${label}: file not found`, { filePath });
  }

  const stats = statSync(filePath);
  result.metrics.exists = true;
  result.metrics.bytes = stats.size;
  result.evidence.push({ filePath, bytes: stats.size });

  if (stats.size <= 0) {
    addFail(result, `${label}: file is empty`, { filePath, bytes: stats.size });
  }

  return result;
}
