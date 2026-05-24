import { formatBytes, PRODUCTION_3D_BUDGETS } from "./budgets.mjs";

export function resultSummary(result) {
  return {
    ok: result.ok,
    warnings: result.warnings?.length ?? 0,
    fails: result.fails?.length ?? 0
  };
}

export function renderValidationResultMarkdown(result, title = "Vistaire 3D/AR Quality Report") {
  const lines = [
    `# ${title}`,
    "",
    `- Status: ${result.ok ? "passed" : "failed"}`,
    `- Warnings: ${result.warnings?.length ?? 0}`,
    `- Fails: ${result.fails?.length ?? 0}`,
    "",
    "## Budget References",
    "",
    `- Git/LFS source of truth: ${PRODUCTION_3D_BUDGETS.policyReferences.join(", ")}`,
    `- iOS USDZ fail budget: ${formatBytes(PRODUCTION_3D_BUDGETS.variants.iosUsdz.bytes.fail)}`,
    "",
    "## Fails",
    ""
  ];

  if (result.fails?.length) {
    lines.push(...result.fails.map((item) => `- ${item}`));
  } else {
    lines.push("- None");
  }

  lines.push("", "## Warnings", "");
  if (result.warnings?.length) {
    lines.push(...result.warnings.map((item) => `- ${item}`));
  } else {
    lines.push("- None");
  }

  lines.push(
    "",
    "## Evidence",
    "",
    "```json",
    JSON.stringify(result.evidence ?? [], null, 2),
    "```",
    "",
    "## Real-Device Boundary",
    "",
    "This report validates structure, metadata, budgets, hashes, and delivery headers only. It does not claim real iPhone Quick Look or Android Scene Viewer validation."
  );

  return `${lines.join("\n")}\n`;
}

export function renderRestaurantManifest(summary) {
  return JSON.stringify(summary, null, 2);
}
