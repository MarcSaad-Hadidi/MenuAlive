import { PRODUCTION_3D_BUDGETS, classifyBudget, formatBytes, variantBudgetKey } from "../budgets.mjs";
import { addFail, addWarning, createValidationResult } from "./file-exists.mjs";

function addBudgetEvidence(result, check) {
  result.metrics.budgetChecks.push(check);
  result.evidence.push(check);

  if (check.status === "unknown") {
    addFail(result, `${check.key}: ${check.metric} is not measurable`, check);
    return;
  }
  if (check.status === "warning") {
    addWarning(
      result,
      check.metric === "bytes"
        ? `${check.key}: ${formatBytes(check.actualBytes)} exceeds warning budget ${formatBytes(check.warningBytes)}`
        : `${check.key}: ${check.actual} ${check.metric} exceeds warning budget ${check.warning}`,
      check
    );
  }
  if (check.actual > check.fail) {
    addFail(
      result,
      check.metric === "bytes"
        ? `${check.key}: ${formatBytes(check.actualBytes)} exceeds fail budget ${formatBytes(check.failBytes)}`
        : `${check.key}: ${check.actual} ${check.metric} exceeds fail budget ${check.fail}`,
      check
    );
  }
}

function budgetCheck({ scope, key, budgetKey, metric, actual, budget }) {
  const check = {
    scope,
    key,
    budgetKey,
    metric,
    actual,
    target: budget.target,
    warning: budget.warning,
    fail: budget.fail,
    status: classifyBudget(actual, budget)
  };
  if (metric === "bytes") {
    check.actualBytes = actual;
    check.targetBytes = budget.target;
    check.warningBytes = budget.warning;
    check.failBytes = budget.fail;
  }
  return check;
}

function stableAssetKey(variant) {
  return String(variant?.url ?? "");
}

export function validateBudgets({
  manifest,
  profile = manifest?.isSignature ? "signature" : "simpleDish",
  budgets = PRODUCTION_3D_BUDGETS
} = {}) {
  const result = createValidationResult({
    name: "budget-checks",
    metrics: {
      profile,
      publicTotalBytes: 0,
      budgetChecks: []
    }
  });

  const variants = manifest?.variants ?? {};
  for (const [variantKeyName, variant] of Object.entries(variants)) {
    const budgetKey = variantBudgetKey(variantKeyName);
    const budget = budgets.variants?.[budgetKey]?.bytes;
    if (!budget) continue;

    const actualBytes = Number(variant?.bytes);
    addBudgetEvidence(result, budgetCheck({
      scope: "variant",
      key: variantKeyName,
      budgetKey,
      metric: "bytes",
      actual: actualBytes,
      budget
    }));

    const triangleBudget = budgets.variants?.[budgetKey]?.triangles;
    const hasTriangleMetadata =
      Object.prototype.hasOwnProperty.call(variant ?? {}, "triangleCount") ||
      Object.prototype.hasOwnProperty.call(variant ?? {}, "triangles");
    const actualTriangles = Number(variant?.triangleCount ?? variant?.triangles);
    if (triangleBudget && hasTriangleMetadata) {
      addBudgetEvidence(result, budgetCheck({
        scope: "variant",
        key: variantKeyName,
        budgetKey,
        metric: "triangles",
        actual: actualTriangles,
        budget: triangleBudget
      }));
    }
  }

  const uniquePublicAssets = new Map();
  for (const [variantKeyName, variant] of Object.entries(variants)) {
    const key = stableAssetKey(variant);
    if (!key) continue;
    const previous = uniquePublicAssets.get(key);
    const bytes = Number(variant?.bytes) || 0;
    if (previous && previous.bytes !== bytes) {
      addFail(result, `${key}: duplicate variant URL has conflicting byte metadata`, {
        url: key,
        firstVariant: previous.variantKeyName,
        secondVariant: variantKeyName,
        firstBytes: previous.bytes,
        secondBytes: bytes
      });
      continue;
    }
    if (!previous) {
      uniquePublicAssets.set(key, { bytes, variantKeyName });
    }
  }

  const publicTotalBytes = [...uniquePublicAssets.values()].reduce(
    (total, item) => total + item.bytes,
    0
  );
  result.metrics.publicTotalBytes = publicTotalBytes;

  const totalBudget = budgets.profiles?.[profile]?.totalPublicBytes;
  if (totalBudget) {
    addBudgetEvidence(result, budgetCheck({
      scope: "total",
      key: "publicTotal",
      budgetKey: `${profile}.totalPublicBytes`,
      metric: "bytes",
      actual: publicTotalBytes,
      budget: totalBudget
    }));
  }

  return result;
}
