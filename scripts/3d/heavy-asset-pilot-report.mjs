#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { parseArgs, writeStdout } from "./shared/file-utils.mjs";

const PROOF_MODES = new Set([
  "real-heavy-local",
  "existing-demo-runtime-heavy",
  "fixture-protocol-only"
]);

const HEAVY_ASSET_BYTES = 25 * 1024 * 1024;

const CHECKLISTS = Object.freeze({
  iphoneQuickLook: [
    "Use a real iPhone with Safari.",
    "Open a stable HTTPS USDZ URL with no query string and no hash.",
    "Confirm Quick Look opens instead of downloading.",
    "Check scale, grounding, orientation, texture fidelity, and material drift.",
    "Record device, iOS version, Safari version, network, tester, timestamp, notes, and evidence."
  ],
  androidSceneViewer: [
    "Use a real Android device with Chrome and ARCore support.",
    "Open the stable HTTPS GLB/Scene Viewer link.",
    "Confirm Scene Viewer opens, or record the unsupported fallback.",
    "Check scale, grounding, orientation, texture fidelity, and material drift.",
    "Record device, Android version, Chrome version, ARCore status, network, tester, timestamp, notes, and evidence."
  ]
});

function readJsonIfPresent(filePath) {
  if (!filePath) return null;
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function metricsFromSourceAnalysis(sourceAnalysis) {
  return sourceAnalysis?.metrics ?? sourceAnalysis ?? {};
}

function percentReduction(before, after) {
  if (!Number.isFinite(before) || before <= 0 || !Number.isFinite(after)) return null;
  return Number((((before - after) / before) * 100).toFixed(1));
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "n/a";
  return new Intl.NumberFormat("en-US").format(value);
}

function formatPercent(value) {
  return Number.isFinite(value) ? `${value.toFixed(1)}%` : "n/a";
}

function compareMetric(sourceValue, selectedValues = {}) {
  return Object.fromEntries(
    Object.entries(selectedValues).map(([variant, outputValue]) => [
      variant,
      {
        source: Number.isFinite(sourceValue) ? sourceValue : null,
        output: Number.isFinite(outputValue) ? outputValue : null,
        percent: percentReduction(sourceValue, outputValue)
      }
    ])
  );
}

function selectedCandidateFrom(candidateReport, optimizationReport) {
  const candidates = candidateReport?.candidates ?? optimizationReport?.candidates ?? [];
  const selectedName = candidateReport?.selectedCandidate ?? optimizationReport?.selectedCandidate ?? null;
  const selected = candidates.find((candidate) => candidate.name === selectedName) ?? null;
  const generatedCandidateName =
    optimizationReport?.transformEvidence?.web?.candidateName ??
    optimizationReport?.transformEvidence?.mobile?.candidateName ??
    optimizationReport?.transformEvidence?.arLite?.candidateName ??
    null;
  const measuredName =
    selectedName ??
    generatedCandidateName ??
    (candidates.some((candidate) => candidate.name === "balanced") ? "balanced" : null) ??
    [...candidates].sort((a, b) => (a.totalBytes ?? Infinity) - (b.totalBytes ?? Infinity))[0]?.name ??
    null;
  const measured = candidates.find((candidate) => candidate.name === measuredName) ?? null;
  return { candidates, selectedName, selected, measuredName, measured };
}

function sumBytes(bytesByVariant = {}) {
  return Object.values(bytesByVariant).reduce((sum, value) => (
    Number.isFinite(value) ? sum + value : sum
  ), 0);
}

function metricValue(report, key) {
  const metrics = report?.metrics ?? report?.summary ?? report?.visualMetrics ?? {};
  if (Number.isFinite(metrics[key])) return metrics[key];
  return Number.isFinite(report?.[key]) ? report[key] : null;
}

function summarizeVisualQuality(selected) {
  const reports = selected?.visualReports ?? {};
  const entries = Object.entries(reports);
  if (entries.length === 0) {
    return {
      status: "not_run",
      score: null,
      meanSsim: null,
      perceptualScore: null,
      maxDiffRatio: null,
      reports: {}
    };
  }

  const numbers = (key, fallback = null) => entries
    .map(([, report]) => metricValue(report, key) ?? fallback)
    .filter((value) => Number.isFinite(value));
  const minOf = (key) => {
    const values = numbers(key);
    return values.length > 0 ? Number(Math.min(...values).toFixed(6)) : null;
  };
  const maxOf = (key) => {
    const values = numbers(key);
    return values.length > 0 ? Number(Math.max(...values).toFixed(6)) : null;
  };
  const passed = selected?.visualGate?.status === "passed" &&
    entries.every(([, report]) => report?.status === "passed");
  const meanSsim = minOf("meanSsim");
  const perceptualScore = minOf("perceptualScore");

  return {
    status: passed ? "automated_visual_compare_only" : "automated_visual_compare_failed",
    score: perceptualScore ?? meanSsim,
    meanSsim,
    perceptualScore,
    maxDiffRatio: maxOf("maxDiffRatio"),
    maxSilhouetteDiff: maxOf("maxSilhouetteDiff"),
    maxColorDelta: maxOf("maxColorDelta"),
    maxTextureBlurDelta: maxOf("maxTextureBlurDelta"),
    maxMaterialDrift: maxOf("maxMaterialDrift"),
    maxScaleDriftMeters: maxOf("maxScaleDriftMeters"),
    maxOriginDriftMeters: maxOf("maxOriginDriftMeters"),
    reports: Object.fromEntries(
      entries.map(([variant, report]) => [
        variant,
        {
          status: report?.status ?? "unknown",
          meanSsim: metricValue(report, "meanSsim"),
          perceptualScore: metricValue(report, "perceptualScore"),
          maxDiffRatio: metricValue(report, "maxDiffRatio")
        }
      ])
    )
  };
}

function summarizeOutputs(selected) {
  const bytes = selected?.bytes ?? {};
  const totalBytes = Number.isFinite(selected?.totalBytes) ? selected.totalBytes : sumBytes(bytes);
  return {
    totalBytes: totalBytes || null,
    variants: { ...bytes }
  };
}

function summarizeRejected(candidateReport) {
  return (candidateReport?.rejectedCandidates ?? []).map((candidate) => ({
    name: candidate.name,
    totalBytes: Number.isFinite(candidate.totalBytes) ? candidate.totalBytes : null,
    reasons: (candidate.reasons ?? []).map((reason) => ({
      gate: reason.gate ?? "unknown",
      reason: reason.reason ?? "No reason recorded."
    }))
  }));
}

function sourceRunWasRecorded(proofMode, source, candidateReport) {
  if (proofMode === "fixture-protocol-only") return false;
  if (!Number.isFinite(source.bytes) || source.bytes < HEAVY_ASSET_BYTES) return false;
  return (candidateReport?.candidates ?? []).length > 0;
}

function statusForReport({ proofMode, realHeavyAssetRunRecorded, selectedName, visualQuality }) {
  if (proofMode === "fixture-protocol-only") return "protocol_only";
  if (!realHeavyAssetRunRecorded) return "real_asset_not_validated";
  if (!selectedName) return "real_heavy_local_rejected";
  if (visualQuality.status !== "automated_visual_compare_only") return "real_heavy_local_failed_visual_gate";
  return "real_heavy_local_measured";
}

function buildRemainingRisk({ proofMode, selectedName, visualQuality, optimizationReport }) {
  const risks = [];
  if (proofMode === "fixture-protocol-only") {
    risks.push("Fixture legere controlee. Ne prouve pas un vrai modele lourd.");
  }
  if (!selectedName) {
    risks.push("No candidate was selected by the pipeline.");
  }
  if (visualQuality.status !== "automated_visual_compare_only") {
    risks.push("Strict automated visual compare is not passed.");
  }
  if (optimizationReport?.validation?.fails?.length) {
    risks.push(...optimizationReport.validation.fails);
  }
  risks.push("No human visual approval was recorded by this benchmark.");
  risks.push("No real iPhone Quick Look test was performed.");
  risks.push("No real Android Scene Viewer test was performed.");
  risks.push("No real CDN upload or network header/hash validation was performed.");
  return [...new Set(risks)];
}

export function buildHeavyAssetPilotReport({
  proofMode = "fixture-protocol-only",
  sourceAnalysis = null,
  candidateReport = null,
  optimizationReport = null,
  sourceLabel = null,
  generatedAt = new Date().toISOString()
} = {}) {
  if (!PROOF_MODES.has(proofMode)) {
    throw new Error(`Unsupported proofMode "${proofMode}". Expected one of: ${[...PROOF_MODES].join(", ")}`);
  }

  const source = metricsFromSourceAnalysis(sourceAnalysis);
  const { candidates, selectedName, measuredName, measured } = selectedCandidateFrom(candidateReport, optimizationReport);
  const outputs = summarizeOutputs(measured);
  const visualQuality = summarizeVisualQuality(measured);
  const realHeavyAssetRunRecorded = sourceRunWasRecorded(proofMode, source, candidateReport);
  const realHeavyAssetValidated = realHeavyAssetRunRecorded &&
    Boolean(selectedName) &&
    visualQuality.status === "automated_visual_compare_only";

  return {
    schemaVersion: 1,
    generatedAt,
    proofMode,
    status: statusForReport({ proofMode, realHeavyAssetRunRecorded, selectedName, visualQuality }),
    realHeavyAssetRunRecorded,
    realHeavyAssetValidated,
    productionEvidence: false,
    identity: candidateReport?.identity ?? optimizationReport?.identity ?? null,
    source: {
      label: sourceLabel ?? source.fileName ?? null,
      fileName: source.fileName ?? null,
      bytes: Number.isFinite(source.bytes) ? source.bytes : null,
      sha256: source.sha256 ?? null,
      triangles: Number.isFinite(source.triangles) ? source.triangles : null,
      vertices: Number.isFinite(source.vertices) ? source.vertices : null,
      materials: Number.isFinite(source.materials) ? source.materials : null,
      textures: Number.isFinite(source.textures) ? source.textures : null,
      images: Number.isFinite(source.images) ? source.images : null,
      classification: source.classification ?? null,
      bounds: source.bounds ?? null
    },
    outputs,
    reductions: {
      bytes: {
        source: Number.isFinite(source.bytes) ? source.bytes : null,
      output: outputs.totalBytes,
      percent: percentReduction(source.bytes, outputs.totalBytes)
    },
      triangles: compareMetric(source.triangles, measured?.triangles),
      materials: compareMetric(source.materials, measured?.materials),
      textures: compareMetric(source.textures, measured?.textures)
    },
    candidates: candidates.map((candidate) => ({
      name: candidate.name,
      totalBytes: Number.isFinite(candidate.totalBytes) ? candidate.totalBytes : null,
      bytes: candidate.bytes ?? {},
      triangles: candidate.triangles ?? {},
      materials: candidate.materials ?? {},
      textures: candidate.textures ?? {},
      gates: {
        visual: candidate.visualGate?.status ?? "unknown",
        budgets: candidate.budgets?.status ?? "unknown",
        glb: candidate.glbValidation?.status ?? "unknown",
        arLite: candidate.arLiteValidation?.status ?? "unknown",
        antiCheat: candidate.antiCheat?.status ?? "unknown"
      },
      decision: candidate.decision ?? null
    })),
    visualQuality,
    selectedCandidate: selectedName,
    measuredCandidate: measuredName,
    decision: candidateReport?.decision ?? optimizationReport?.decision ?? null,
    rejectedCandidates: summarizeRejected(candidateReport),
    deviceQa: {
      status: "not_validated",
      iphoneQuickLook: "not_tested",
      androidSceneViewer: "not_tested",
      checklist: CHECKLISTS
    },
    cdnValidation: {
      status: "not_validated",
      deliveryMode: optimizationReport?.delivery?.mode ?? null,
      cdnBaseUrlConfigured: Boolean(optimizationReport?.delivery?.cdnBaseUrl),
      publicBinariesWritten: Boolean(optimizationReport?.delivery?.publicBinariesWritten),
      requiredBeforeFinalize: Boolean(optimizationReport?.delivery?.networkValidationRequiredBeforePublish)
    },
    remainingRisk: buildRemainingRisk({ proofMode, selectedName, visualQuality, optimizationReport }),
    policy: {
      commitHeavyOutputs: false,
      publicModelsDirectWrite: false,
      generatedOutputsCommitted: false
    }
  };
}

function line(label, value) {
  return `- ${label}: ${value}`;
}

function renderIdentity(identity) {
  if (!identity) return "- Identity: n/a";
  return [
    line("Restaurant", `\`${identity.restaurantSlug ?? "n/a"}\``),
    line("Menu", `\`${identity.menuSlug ?? "n/a"}\``),
    line("Dish", `\`${identity.dishSlug ?? "n/a"}\``),
    line("Version", `\`${identity.version ?? "n/a"}\``)
  ].join("\n");
}

function renderVariantTable(title, values = {}) {
  const entries = Object.entries(values);
  if (entries.length === 0) return "";
  return [
    `### ${title}`,
    "",
    "| Variant | Value |",
    "| --- | ---: |",
    ...entries.map(([variant, value]) => `| ${variant} | ${formatNumber(value)} |`),
    ""
  ].join("\n");
}

function renderReductionRows(reductions = {}) {
  const rows = [];
  for (const [variant, entry] of Object.entries(reductions)) {
    rows.push(`| ${variant} | ${formatNumber(entry.source)} | ${formatNumber(entry.output)} | ${formatPercent(entry.percent)} |`);
  }
  return rows;
}

function renderChecklist(items = []) {
  return items.map((item) => `- [ ] ${item}`).join("\n");
}

function renderRejected(rejectedCandidates = []) {
  if (rejectedCandidates.length === 0) return "- None recorded.";
  return rejectedCandidates.map((candidate) => {
    const reasons = candidate.reasons.length > 0
      ? candidate.reasons.map((reason) => `${reason.gate}: ${reason.reason}`).join("; ")
      : "No reason recorded.";
    return `- ${candidate.name}: ${reasons}`;
  }).join("\n");
}

export function renderHeavyAssetPilotMarkdown(report) {
  const source = report.source ?? {};
  const reductions = report.reductions ?? {};
  const visual = report.visualQuality ?? {};
  const lines = [
    "# Vistaire Heavy 3D Asset Pilot",
    "",
    `Status: \`${report.status}\`  `,
    `proofMode: \`${report.proofMode}\`  `,
    `Real heavy asset run recorded: \`${String(report.realHeavyAssetRunRecorded)}\`  `,
    `Real heavy asset validated: \`${String(report.realHeavyAssetValidated)}\`  `,
    `Production evidence: \`${String(report.productionEvidence)}\`  `,
    `Generated at: \`${report.generatedAt}\``,
    "",
    "This report is a local pipeline benchmark, not a finalize, publish, CDN, iPhone Quick Look, or Android Scene Viewer approval.",
    "Automated visual compare only means deterministic render evidence was produced by the CLI; it is still separate from human approval and real device QA.",
    "",
    "## Boundaries",
    "",
    "- Generated outputs are not committed.",
    "- Heavy source, work GLB/USDZ, visual PNGs, posters, raw reports, and logs must stay outside Git.",
    "- Do not write benchmark binaries into `public/models/restaurants/**`.",
    "- CDN is not validated unless a real upload plus network header/hash validation report is attached.",
    "- Device QA is not validated unless real iPhone and Android evidence is attached.",
    "",
    "## Identity",
    "",
    renderIdentity(report.identity),
    "",
    "## Source Evidence",
    "",
    line("Source label", source.label ? `\`${source.label}\`` : "`n/a`"),
    line("Source bytes", formatNumber(source.bytes)),
    line("Source SHA-256", source.sha256 ? `\`${source.sha256}\`` : "`n/a`"),
    line("Triangles", formatNumber(source.triangles)),
    line("Vertices", formatNumber(source.vertices)),
    line("Materials", formatNumber(source.materials)),
    line("Textures", formatNumber(source.textures)),
    line("Images", formatNumber(source.images)),
    line("Classification", source.classification ? `\`${source.classification}\`` : "`n/a`"),
    "",
    "## Candidate Decision",
    "",
    line("Selected candidate", report.selectedCandidate ? `\`${report.selectedCandidate}\`` : "`none`"),
    line("Measured candidate for output metrics", report.measuredCandidate ? `\`${report.measuredCandidate}\`` : "`none`"),
    line("Decision", report.decision?.reason ?? "No decision recorded."),
    "",
    "| Candidate | Total bytes | Visual | Budgets | GLB | AR-lite | Anti-cheat |",
    "| --- | ---: | --- | --- | --- | --- | --- |",
    ...report.candidates.map((candidate) =>
      `| ${candidate.name} | ${formatNumber(candidate.totalBytes)} | ${candidate.gates.visual} | ${candidate.gates.budgets} | ${candidate.gates.glb} | ${candidate.gates.arLite} | ${candidate.gates.antiCheat} |`
    ),
    "",
    "## Outputs",
    "",
    line("Measured candidate total output bytes", formatNumber(report.outputs?.totalBytes)),
    ""
  ];

  const variantTable = renderVariantTable("Output bytes by variant", report.outputs?.variants);
  if (variantTable) lines.push(variantTable);

  lines.push(
    "## Reductions",
    "",
    "| Metric | Source | Output | Reduction |",
    "| --- | ---: | ---: | ---: |",
    `| Measured candidate bytes | ${formatNumber(reductions.bytes?.source)} | ${formatNumber(reductions.bytes?.output)} | ${formatPercent(reductions.bytes?.percent)} |`,
    "",
    "### Triangle Reductions",
    "",
    "| Variant | Source | Output | Reduction |",
    "| --- | ---: | ---: | ---: |",
    ...renderReductionRows(reductions.triangles),
    "",
    "### Material Reductions",
    "",
    "| Variant | Source | Output | Reduction |",
    "| --- | ---: | ---: | ---: |",
    ...renderReductionRows(reductions.materials),
    "",
    "### Texture Reductions",
    "",
    "| Variant | Source | Output | Reduction |",
    "| --- | ---: | ---: | ---: |",
    ...renderReductionRows(reductions.textures),
    "",
    "## Visual Quality",
    "",
    line("Status", `\`${visual.status ?? "not_run"}\``),
    line("Visual score", formatNumber(visual.score)),
    line("Mean SSIM", formatNumber(visual.meanSsim)),
    line("Perceptual score", formatNumber(visual.perceptualScore)),
    line("Max diff ratio", formatNumber(visual.maxDiffRatio)),
    line("Max silhouette diff", formatNumber(visual.maxSilhouetteDiff)),
    line("Max color delta", formatNumber(visual.maxColorDelta)),
    line("Max texture blur delta", formatNumber(visual.maxTextureBlurDelta)),
    line("Max material drift", formatNumber(visual.maxMaterialDrift)),
    "",
    "## Rejected Candidates",
    "",
    renderRejected(report.rejectedCandidates),
    "",
    "## CDN And Device Gates",
    "",
    line("CDN validation", `\`${report.cdnValidation.status}\``),
    line("Delivery mode", report.cdnValidation.deliveryMode ? `\`${report.cdnValidation.deliveryMode}\`` : "`n/a`"),
    line("iPhone Quick Look", `\`${report.deviceQa.iphoneQuickLook}\``),
    line("Android Scene Viewer", `\`${report.deviceQa.androidSceneViewer}\``),
    "",
    "## iPhone Quick Look manual checklist",
    "",
    renderChecklist(report.deviceQa.checklist.iphoneQuickLook),
    "",
    "## Android Scene Viewer manual checklist",
    "",
    renderChecklist(report.deviceQa.checklist.androidSceneViewer),
    "",
    "## Remaining Risk",
    "",
    ...report.remainingRisk.map((risk) => `- ${risk}`),
    ""
  );

  if (report.proofMode === "fixture-protocol-only") {
    lines.push(
      "## Fixture Boundary",
      "",
      "Fixture legere controlee. Ne prouve pas un vrai modele lourd.",
      ""
    );
  }

  return `${lines.join("\n")}\n`;
}

function writeTextFile(filePath, contents) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, contents);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const report = buildHeavyAssetPilotReport({
    proofMode: String(args["proof-mode"] ?? "fixture-protocol-only"),
    sourceAnalysis: readJsonIfPresent(args["source-analysis"]),
    candidateReport: readJsonIfPresent(args["candidate-report"]),
    optimizationReport: readJsonIfPresent(args["optimization-report"]),
    sourceLabel: args["source-label"] ? String(args["source-label"]) : null,
    generatedAt: args["generated-at"] ? String(args["generated-at"]) : new Date().toISOString()
  });

  if (args.json) {
    writeStdout(report, true);
    return;
  }

  const markdown = renderHeavyAssetPilotMarkdown(report);
  if (args.out) {
    writeTextFile(String(args.out), markdown);
  } else {
    writeStdout(markdown);
  }
}

const isCli = process.argv[1] &&
  import.meta.url === pathToFileURL(fileURLToPath(pathToFileURL(process.argv[1]))).href;

if (isCli) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
