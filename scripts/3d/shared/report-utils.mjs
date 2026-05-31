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
    "## Metrics",
    "",
    "```json",
    JSON.stringify(result.metrics ?? {}, null, 2),
    "```",
    "",
    "## Evidence",
    "",
    "```json",
    JSON.stringify(result.evidence ?? [], null, 2),
    "```",
    "",
    "## Commands Executed",
    "",
    "- See the invoking terminal command; commit generated reports only when intentional.",
    "",
    "## Validations Not Executed",
    "",
    "- Real iPhone Safari Quick Look unless explicitly recorded by a human tester.",
    "- Real Android Scene Viewer unless explicitly recorded by a human tester.",
    "- Live CDN/storage headers unless `3d:validate-network` was run with a production-equivalent base URL.",
    "",
    "## DevTools Checklist",
    "",
    "- Console has no unexpected errors.",
    "- Network has no unexpected 404/500 responses.",
    "- No GLB/USDZ before explicit user intent.",
    "- GLB loads after 3D intent.",
    "- Desktop does not fetch USDZ.",
    "- No horizontal overflow at 375px, 390px, 430px, and desktop.",
    "",
    "## Device Checklist",
    "",
    "- iPhone Safari Quick Look tested on a real device.",
    "- Android Chrome Scene Viewer tested on a real ARCore-capable device.",
    "",
    "## Publish Decision",
    "",
    `- ${result.ok && (result.warnings?.length ?? 0) === 0 ? "approved" : "rejected"}`,
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
