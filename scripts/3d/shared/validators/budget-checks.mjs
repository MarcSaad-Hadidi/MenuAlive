import { PRODUCTION_3D_BUDGETS, formatBytes, variantBudgetKey } from "../budgets.mjs";
import { addFail, addWarning, createValidationResult } from "./file-exists.mjs";

function stablePublicUrl(url) {
  return String(url ?? "").split(/[?#]/)[0];
}

function statusForBytes(bytes, budget) {
  if (!Number.isFinite(bytes)) return "unknown";
  if (bytes <= budget.target) return "target";
  if (bytes <= budget.fail) return "warning";
  return "fail";
}

function addBudgetCheck(result, check) {
  result.metrics.budgetChecks.push(check);
  result.evidence.push(check);

  if (check.status === "unknown") {
    addFail(result, `${check.key}: byte size is not measurable`);
    return;
  }

  if (check.actualBytes > check.targetBytes) {
    addWarning(
      result,
      `${check.key}: ${formatBytes(check.actualBytes)} exceeds target ${formatBytes(check.targetBytes)}`,
      check
    );
  }
  if (check.actualBytes > check.failBytes) {
    addFail(
      result,
      `${check.key}: ${formatBytes(check.actualBytes)} exceeds fail budget ${formatBytes(check.failBytes)}`,
      check
    );
  }
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
    const actualBytes = Number(variant.bytes);
    const check = {
      scope: "variant",
      key: variantKeyName,
      budgetKey,
      metric: "bytes",
      actualBytes,
      targetBytes: budget.target,
      warningBytes: budget.warning,
      failBytes: budget.fail,
      status: statusForBytes(actualBytes, budget)
    };
    addBudgetCheck(result, check);
  }

  const uniquePublicAssets = new Map();
  for (const variant of Object.values(variants)) {
    const key = stablePublicUrl(variant.url);
    if (!key) continue;
    if (!uniquePublicAssets.has(key)) uniquePublicAssets.set(key, Number(variant.bytes) || 0);
  }
  const publicTotalBytes = [...uniquePublicAssets.values()].reduce((total, bytes) => total + bytes, 0);
  result.metrics.publicTotalBytes = publicTotalBytes;

  const totalBudget = budgets.profiles?.[profile]?.totalPublicBytes;
  if (totalBudget) {
    addBudgetCheck(result, {
      scope: "total",
      key: "publicTotal",
      budgetKey: `${profile}.totalPublicBytes`,
      metric: "bytes",
      actualBytes: publicTotalBytes,
      targetBytes: totalBudget.target,
      warningBytes: totalBudget.warning,
      failBytes: totalBudget.fail,
      status: statusForBytes(publicTotalBytes, totalBudget)
    });
  }

  return result;
}
