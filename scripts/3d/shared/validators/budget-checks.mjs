import { PRODUCTION_3D_BUDGETS, classifyBudget, formatBytes, variantBudgetKey } from "../budgets.mjs";
import { addFail, addWarning, createValidationResult } from "./file-exists.mjs";

function addBudgetEvidence(result, check) {
  result.metrics.budgetChecks.push(check);
  result.evidence.push(check);

  if (check.status === "unknown") {
    addFail(result, `${check.key}: byte size is not measurable`, check);
    return;
  }
  if (check.status === "warning") {
    addWarning(
      result,
      `${check.key}: ${formatBytes(check.actualBytes)} exceeds warning budget ${formatBytes(check.warningBytes)}`,
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
    addBudgetEvidence(result, {
      scope: "variant",
      key: variantKeyName,
      budgetKey,
      metric: "bytes",
      actualBytes,
      targetBytes: budget.target,
      warningBytes: budget.warning,
      failBytes: budget.fail,
      status: classifyBudget(actualBytes, budget)
    });
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
    addBudgetEvidence(result, {
      scope: "total",
      key: "publicTotal",
      budgetKey: `${profile}.totalPublicBytes`,
      metric: "bytes",
      actualBytes: publicTotalBytes,
      targetBytes: totalBudget.target,
      warningBytes: totalBudget.warning,
      failBytes: totalBudget.fail,
      status: classifyBudget(publicTotalBytes, totalBudget)
    });
  }

  return result;
}
