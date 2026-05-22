import { formatBytes } from "./budgets.mjs";

export function statusIcon(status) {
  if (status === "fail" || status === "failed") return "FAIL";
  if (status === "warning" || status === "review") return "WARN";
  return "OK";
}

export function buildValidationReportMarkdown({
  title,
  manifest,
  validation,
  assetChecks = [],
  analysis = null
}) {
  const lines = [
    `# ${title}`,
    "",
    `Generated at: ${new Date().toISOString()}`,
    "",
    "## Asset",
    "",
    `- Restaurant: ${manifest.restaurantSlug}`,
    `- Menu: ${manifest.menuSlug}`,
    `- Dish: ${manifest.dishSlug}`,
    `- Active version: ${manifest.activeVersion}`,
    `- Status: ${manifest.status}`,
    "",
    "## Variants",
    "",
    "| Variant | URL | Size | SHA-256 |",
    "| --- | --- | ---: | --- |"
  ];

  for (const [key, variant] of Object.entries(manifest.variants ?? {})) {
    lines.push(
      `| ${key} | ${variant.url} | ${formatBytes(variant.bytes)} | ${String(
        variant.sha256 ?? ""
      ).slice(0, 12)}... |`
    );
  }

  lines.push("", "## Validation", "");
  if (validation.fails.length === 0 && validation.warnings.length === 0) {
    lines.push("- OK manifest schema and budgets passed.");
  } else {
    for (const warning of validation.warnings) lines.push(`- WARN ${warning}`);
    for (const fail of validation.fails) lines.push(`- FAIL ${fail}`);
  }

  if (assetChecks.length > 0) {
    lines.push("", "## File Checks", "");
    for (const check of assetChecks) {
      lines.push(
        `- ${statusIcon(check.status)} ${check.variant}: ${check.message}`
      );
    }
  }

  if (analysis) {
    lines.push("", "## Analysis", "");
    lines.push(`- Source files exposed publicly: ${analysis.sourceExposure.length}`);
    lines.push(`- Work files exposed publicly: ${analysis.workExposure.length}`);
    lines.push(`- Variant count: ${Object.keys(analysis.variants ?? {}).length}`);
  }

  lines.push(
    "",
    "## Manual Checks Still Required",
    "",
    "- iPhone Safari Quick Look on the exact production URL.",
    "- Android Chrome / Scene Viewer on a real device.",
    "- Visual review for premium restaurant quality.",
    "- Slow network and Save-Data checks before promotion."
  );

  return `${lines.join("\n")}\n`;
}
