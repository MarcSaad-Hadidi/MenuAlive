import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { formatBytes } from "../budgets.mjs";

export function reportStatus(result) {
  if (!result?.ok || (result.fails ?? []).length > 0) return "FAIL";
  if ((result.warnings ?? []).length > 0) return "WARNING";
  return "PASS";
}

export function buildReportJson({ title, result, manifest = null, manualChecks = [] }) {
  return {
    title,
    generatedAt: new Date().toISOString(),
    status: reportStatus(result),
    manifest: manifest
      ? {
          restaurantSlug: manifest.restaurantSlug,
          menuSlug: manifest.menuSlug,
          dishSlug: manifest.dishSlug,
          activeVersion: manifest.activeVersion,
          status: manifest.status
        }
      : null,
    ok: Boolean(result?.ok),
    warnings: result?.warnings ?? [],
    fails: result?.fails ?? [],
    metrics: result?.metrics ?? {},
    evidence: result?.evidence ?? [],
    checks: result?.checks ?? [],
    manualChecksStillRequired: manualChecks
  };
}

function renderValue(value) {
  if (typeof value === "number" && /bytes/i.test(String(value))) return formatBytes(value);
  if (value == null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function buildReportMarkdown({ title, result, manifest = null, manualChecks = [] }) {
  const status = reportStatus(result);
  const lines = [
    `# ${title}`,
    "",
    `Status: ${status}`,
    `Generated at: ${new Date().toISOString()}`,
    ""
  ];

  if (manifest) {
    lines.push(
      "## Asset",
      "",
      `- Restaurant: ${manifest.restaurantSlug}`,
      `- Menu: ${manifest.menuSlug}`,
      `- Dish: ${manifest.dishSlug}`,
      `- Active version: ${manifest.activeVersion}`,
      `- Manifest status: ${manifest.status}`,
      ""
    );
  }

  lines.push("## Checks", "");
  const checks = result?.checks ?? [];
  if (checks.length === 0) {
    lines.push(`- ${status} ${result?.name ?? "validation"}`);
  } else {
    for (const check of checks) {
      lines.push(`- ${reportStatus(check)} ${check.name}`);
    }
  }

  lines.push("", "## Findings", "");
  if ((result?.warnings ?? []).length === 0 && (result?.fails ?? []).length === 0) {
    lines.push("- PASS No warnings or failures.");
  } else {
    for (const warning of result?.warnings ?? []) lines.push(`- WARNING ${warning}`);
    for (const fail of result?.fails ?? []) lines.push(`- FAIL ${fail}`);
  }

  const metrics = result?.metrics ?? {};
  if (Object.keys(metrics).length > 0) {
    lines.push("", "## Metrics", "");
    for (const [key, value] of Object.entries(metrics)) {
      if (Array.isArray(value)) {
        lines.push(`- ${key}: ${value.length}`);
      } else {
        lines.push(`- ${key}: ${renderValue(value)}`);
      }
    }
  }

  lines.push("", "## Evidence", "");
  const evidence = (result?.evidence ?? []).slice(0, 50);
  if (evidence.length === 0) {
    lines.push("- No evidence recorded.");
  } else {
    for (const item of evidence) lines.push(`- ${renderValue(item)}`);
  }

  lines.push("", "## Manual Checks Still Required", "");
  const checksRemaining =
    manualChecks.length > 0
      ? manualChecks
      : [
          "Real iPhone Safari Quick Look on the exact production URL.",
          "Android Chrome / Scene Viewer on a real device.",
          "Visual review for premium restaurant quality.",
          "Slow network and Save-Data behavior before promotion."
        ];
  for (const check of checksRemaining) lines.push(`- ${check}`);

  return `${lines.join("\n")}\n`;
}

export function writeValidationReports({ jsonOut = "", mdOut = "", title, result, manifest = null }) {
  if (jsonOut) {
    mkdirSync(dirname(jsonOut), { recursive: true });
    writeFileSync(jsonOut, `${JSON.stringify(buildReportJson({ title, result, manifest }), null, 2)}\n`);
  }
  if (mdOut) {
    mkdirSync(dirname(mdOut), { recursive: true });
    writeFileSync(mdOut, buildReportMarkdown({ title, result, manifest }));
  }
}
