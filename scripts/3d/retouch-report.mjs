#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parseArgs, writeStdout } from "./shared/file-utils.mjs";
import { MiB } from "./shared/budgets.mjs";

function isMainModule() {
  return process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
}

function readJson(filePath) {
  return filePath ? JSON.parse(readFileSync(filePath, "utf8")) : null;
}

function sourceMetrics(sourceAnalysis) {
  return sourceAnalysis?.metrics ?? sourceAnalysis ?? {};
}

function addWhen(items, condition, text) {
  if (condition) items.push(text);
}

export function buildRetouchReport({ sourceAnalysis = null, candidateReport = null, optimizationReport = null, generatedAt = new Date().toISOString() } = {}) {
  const source = sourceMetrics(sourceAnalysis);
  const rejected = candidateReport?.rejectedCandidates ?? [];
  const instructions = [];
  addWhen(instructions, source.bounds?.groundedY === false, "Move the dish so the lowest visible geometry rests at Y=0.");
  addWhen(instructions, source.bounds?.centeredXZ === false, "Center the plated dish around X=0 and Z=0 before export.");
  addWhen(instructions, Number(source.triangles) > 150_000, "Create a dedicated AR mesh under 70k triangles, with an emergency fallback under 30k-50k if silhouette permits.");
  addWhen(instructions, Number(source.bytes) > 25 * MiB, "Reduce source payload before pipeline export: remove unused shells, hidden interiors, duplicated plates, and unused embedded media.");
  addWhen(instructions, Number(source.images) > 12 || Number(source.textures) > 8, "Consolidate materials and bake a variant-specific texture atlas: 2048 for web, 1024 for mobile, 512/1024 for AR-lite/iOS.");
  addWhen(instructions, Number(source.geometry?.tinyIslandCount) > 0, "Remove tiny detached islands that are not visible at mobile dining distance.");
  addWhen(instructions, Number(source.geometry?.duplicateShellEstimate) > 0, "Delete duplicate shells/overlapping triangles before running automated simplification.");
  for (const rejectedCandidate of rejected) {
    for (const reason of rejectedCandidate.reasons ?? []) {
      addWhen(instructions, /arLite|triangle|15\.00 MiB|budget/i.test(reason.reason ?? ""), `For candidate ${rejectedCandidate.name}, fix AR-lite blocker: ${reason.reason}`);
      addWhen(instructions, /iosUsdz|USDZ|5\.00 MiB/i.test(reason.reason ?? ""), `For candidate ${rejectedCandidate.name}, fix iOS blocker: ${reason.reason}`);
      addWhen(instructions, /visual|SSIM|diff|silhouette|texture|material/i.test(reason.reason ?? ""), `For candidate ${rejectedCandidate.name}, preserve premium visual identity: ${reason.reason}`);
    }
  }
  if (instructions.length === 0) {
    instructions.push("No specific retouch blocker was detected in the supplied reports. Run source analysis, optimize-heavy, and strict visual compare for a precise brief.");
  }
  return {
    ok: true,
    name: "3d:retouch-report",
    generatedAt,
    identity: candidateReport?.identity ?? optimizationReport?.identity ?? null,
    source: {
      bytes: Number.isFinite(source.bytes) ? source.bytes : null,
      triangles: Number.isFinite(source.triangles) ? source.triangles : null,
      vertices: Number.isFinite(source.vertices) ? source.vertices : null,
      textures: Number.isFinite(source.textures) ? source.textures : null,
      images: Number.isFinite(source.images) ? source.images : null,
      bounds: source.bounds ?? null
    },
    selectedCandidate: candidateReport?.selectedCandidate ?? optimizationReport?.selectedCandidate ?? null,
    instructionCount: instructions.length,
    instructions: [...new Set(instructions)],
    requiredEvidenceAfterRetouch: [
      "source-analysis.json",
      "repair-report.json",
      "candidate-report.json",
      "visual-report before/after/diff artifacts for web, mobile, and arLite",
      "human visual approval",
      "real iPhone Quick Look QA",
      "real Android Scene Viewer QA",
      "CDN bytes/hash/header validation"
    ]
  };
}

function renderMarkdown(report) {
  return [
    "# Vistaire 3D Artist Retouch Brief",
    "",
    `Generated at: \`${report.generatedAt}\``,
    "",
    `Selected candidate: \`${report.selectedCandidate ?? "none"}\``,
    "",
    "## Instructions",
    "",
    ...report.instructions.map((item) => `- ${item}`),
    "",
    "## Evidence required after retouch",
    "",
    ...report.requiredEvidenceAfterRetouch.map((item) => `- ${item}`),
    ""
  ].join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const report = buildRetouchReport({
    sourceAnalysis: readJson(args["source-analysis"]),
    candidateReport: readJson(args["candidate-report"]),
    optimizationReport: readJson(args["optimization-report"]),
    generatedAt: args["generated-at"] ? String(args["generated-at"]) : new Date().toISOString()
  });
  if (args.out) {
    const outPath = normalize(resolve(String(args.out)));
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, args.json ? `${JSON.stringify(report, null, 2)}\n` : renderMarkdown(report));
  }
  writeStdout(args.json ? report : renderMarkdown(report), Boolean(args.json));
}

if (isMainModule()) main();
