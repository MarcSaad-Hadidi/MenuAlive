import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const reportModuleUrl = pathToFileURL(resolve("scripts/3d/heavy-asset-pilot-report.mjs")).href;

const identity = {
  restaurantSlug: "maison-elyse",
  menuSlug: "pilot",
  dishSlug: "ravioli-assiette",
  version: "pilot-heavy-001"
};

function sourceAnalysis() {
  return {
    ok: true,
    name: "3d:analyze-source",
    warnings: [],
    fails: [],
    metrics: {
      fileName: "RavioliAvecAssiete.glb",
      bytes: 76_747_968,
      sha256: "a".repeat(64),
      triangles: 210_432,
      vertices: 112_000,
      materials: 18,
      textures: 24,
      images: 24,
      classification: "signature",
      bounds: {
        dimensionsMeters: [0.72, 0.18, 0.68],
        groundedY: true,
        centeredXZ: true
      }
    }
  };
}

function candidateReport() {
  return {
    identity,
    source: "REDACTED_LOCAL_SOURCE",
    selectedCandidate: "balanced",
    decision: {
      status: "selected",
      reason: "Selected balanced as the lightest candidate that passed every gate."
    },
    rejectedCandidates: [
      {
        name: "conservative",
        totalBytes: 24_000_000,
        reasons: [{ gate: "weight", reason: "A lighter passing candidate was selected." }]
      },
      {
        name: "aggressive",
        totalBytes: 8_000_000,
        reasons: [{ gate: "visualGate", reason: "strict visual compare did not pass" }]
      }
    ],
    candidates: [
      {
        name: "conservative",
        totalBytes: 24_000_000,
        bytes: { web: 8_000_000, mobile: 6_000_000, arLite: 5_500_000, iosUsdz: 4_000_000, poster: 500_000 },
        triangles: { web: 120_000, mobile: 85_000, arLite: 45_000 },
        materials: { web: 12, mobile: 10, arLite: 8 },
        textures: { web: 16, mobile: 12, arLite: 8 },
        visualGate: { status: "passed", fails: [] },
        budgets: { status: "passed", fails: [] },
        glbValidation: { status: "passed", fails: [] },
        arLiteValidation: { status: "passed", fails: [] },
        antiCheat: { status: "passed", fails: [] },
        visualReports: {
          web: { status: "passed", metrics: { meanSsim: 0.992, perceptualScore: 0.988, maxDiffRatio: 0.0012 } },
          mobile: { status: "passed", metrics: { meanSsim: 0.991, perceptualScore: 0.987, maxDiffRatio: 0.0014 } },
          arLite: { status: "passed", metrics: { meanSsim: 0.989, perceptualScore: 0.984, maxDiffRatio: 0.0017 } }
        }
      },
      {
        name: "balanced",
        totalBytes: 17_500_000,
        bytes: { web: 5_500_000, mobile: 4_200_000, arLite: 3_800_000, iosUsdz: 3_600_000, poster: 400_000 },
        triangles: { web: 92_000, mobile: 61_000, arLite: 32_000 },
        materials: { web: 10, mobile: 8, arLite: 6 },
        textures: { web: 12, mobile: 10, arLite: 6 },
        visualGate: { status: "passed", fails: [] },
        budgets: { status: "passed", fails: [] },
        glbValidation: { status: "passed", fails: [] },
        arLiteValidation: { status: "passed", fails: [] },
        antiCheat: { status: "passed", fails: [] },
        visualReports: {
          web: { status: "passed", metrics: { meanSsim: 0.991, perceptualScore: 0.986, maxDiffRatio: 0.0018 } },
          mobile: { status: "passed", metrics: { meanSsim: 0.99, perceptualScore: 0.985, maxDiffRatio: 0.0019 } },
          arLite: { status: "passed", metrics: { meanSsim: 0.987, perceptualScore: 0.982, maxDiffRatio: 0.0022 } }
        }
      },
      {
        name: "aggressive",
        totalBytes: 8_000_000,
        bytes: { web: 2_500_000, mobile: 2_100_000, arLite: 1_800_000, iosUsdz: 1_300_000, poster: 300_000 },
        triangles: { web: 55_000, mobile: 34_000, arLite: 18_000 },
        materials: { web: 8, mobile: 6, arLite: 4 },
        textures: { web: 8, mobile: 6, arLite: 4 },
        visualGate: { status: "failed", fails: ["strict visual compare did not pass"] },
        budgets: { status: "passed", fails: [] },
        glbValidation: { status: "passed", fails: [] },
        arLiteValidation: { status: "passed", fails: [] },
        antiCheat: { status: "passed", fails: [] },
        visualReports: {
          web: { status: "failed", metrics: { meanSsim: 0.94, perceptualScore: 0.93, maxDiffRatio: 0.03 } }
        }
      }
    ]
  };
}

function optimizationReport() {
  return {
    ok: false,
    identity,
    selectedCandidate: "balanced",
    delivery: {
      mode: "cdn",
      cdnBaseUrl: "https://assets.example.test/vistaire",
      publicBinariesWritten: false,
      networkValidationRequiredBeforePublish: true
    },
    validation: {
      ok: false,
      warnings: ["CDN upload and network validation remain pending."],
      fails: ["Finalize requires human visual approval."]
    }
  };
}

function runNode(args) {
  return new Promise((resolveResult) => {
    const child = spawn(process.execPath, args, { cwd: process.cwd() });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (code) => {
      resolveResult({ code, stdout, stderr });
    });
  });
}

test("real heavy pilot report keeps local pipeline proof separate from device and CDN gates", async () => {
  const { buildHeavyAssetPilotReport, renderHeavyAssetPilotMarkdown } = await import(reportModuleUrl);

  const report = buildHeavyAssetPilotReport({
    proofMode: "real-heavy-local",
    sourceAnalysis: sourceAnalysis(),
    candidateReport: candidateReport(),
    optimizationReport: optimizationReport(),
    generatedAt: "2026-05-31T00:00:00.000Z"
  });
  const markdown = renderHeavyAssetPilotMarkdown(report);

  assert.equal(report.proofMode, "real-heavy-local");
  assert.equal(report.realHeavyAssetRunRecorded, true);
  assert.equal(report.realHeavyAssetValidated, true);
  assert.equal(report.deviceQa.status, "not_validated");
  assert.equal(report.cdnValidation.status, "not_validated");
  assert.equal(report.selectedCandidate, "balanced");
  assert.equal(report.visualQuality.status, "automated_visual_compare_only");
  assert.equal(report.outputs.totalBytes, 17_500_000);
  assert.equal(report.reductions.bytes.percent, 77.2);
  assert.match(markdown, /proofMode: `real-heavy-local`/);
  assert.match(markdown, /Real heavy asset validated: `true`/);
  assert.match(markdown, /Automated visual compare only/);
  assert.match(markdown, /iPhone Quick Look manual checklist/);
  assert.match(markdown, /Android Scene Viewer manual checklist/);
  assert.doesNotMatch(markdown, /production-ready/i);
  assert.doesNotMatch(markdown, /Quick Look passed/i);
});

test("fixture protocol report cannot claim heavy validation", async () => {
  const { buildHeavyAssetPilotReport, renderHeavyAssetPilotMarkdown } = await import(reportModuleUrl);

  const report = buildHeavyAssetPilotReport({
    proofMode: "fixture-protocol-only",
    generatedAt: "2026-05-31T00:00:00.000Z"
  });
  const markdown = renderHeavyAssetPilotMarkdown(report);

  assert.equal(report.realHeavyAssetValidated, false);
  assert.equal(report.realHeavyAssetRunRecorded, false);
  assert.equal(report.selectedCandidate, null);
  assert.equal(report.visualQuality.status, "not_run");
  assert.match(markdown, /Fixture legere controlee/);
  assert.match(markdown, /Real heavy asset validated: `false`/);
  assert.doesNotMatch(markdown, /heavy asset validated: `true`/i);
  assert.doesNotMatch(markdown, /production-ready/i);
});

test("rejected real heavy run reports measured fallback without selecting a candidate", async () => {
  const { buildHeavyAssetPilotReport, renderHeavyAssetPilotMarkdown } = await import(reportModuleUrl);
  const rejectedCandidateReport = {
    ...candidateReport(),
    selectedCandidate: null,
    decision: {
      status: "rejected",
      reason: "No adaptive candidate passed every budget, GLB, AR-lite, visual, and anti-cheat gate."
    },
    rejectedCandidates: candidateReport().candidates.map((candidate) => ({
      name: candidate.name,
      totalBytes: candidate.totalBytes,
      reasons: [{ gate: "visualGate", reason: "strict visual compare did not pass" }]
    }))
  };
  const rejectedOptimizationReport = {
    ...optimizationReport(),
    selectedCandidate: null,
    transformEvidence: {
      web: { candidateName: "balanced" },
      mobile: { candidateName: "balanced" },
      arLite: { candidateName: "balanced" }
    }
  };

  const report = buildHeavyAssetPilotReport({
    proofMode: "real-heavy-local",
    sourceAnalysis: sourceAnalysis(),
    candidateReport: rejectedCandidateReport,
    optimizationReport: rejectedOptimizationReport,
    generatedAt: "2026-05-31T00:00:00.000Z"
  });
  const markdown = renderHeavyAssetPilotMarkdown(report);

  assert.equal(report.status, "real_heavy_local_rejected");
  assert.equal(report.realHeavyAssetRunRecorded, true);
  assert.equal(report.realHeavyAssetValidated, false);
  assert.equal(report.selectedCandidate, null);
  assert.equal(report.measuredCandidate, "balanced");
  assert.equal(report.outputs.totalBytes, 17_500_000);
  assert.match(markdown, /Selected candidate: `none`/);
  assert.match(markdown, /Measured candidate for output metrics: `balanced`/);
});

test("CLI writes a sanitized lightweight Markdown report from JSON evidence", async () => {
  const dir = mkdtempSync(join(tmpdir(), "vistaire-heavy-report-test-"));
  try {
    const sourcePath = join(dir, "source-analysis.json");
    const candidatePath = join(dir, "candidate-report.json");
    const optimizationPath = join(dir, "optimization-report.json");
    const outPath = join(dir, "pilot.md");
    writeFileSync(sourcePath, JSON.stringify(sourceAnalysis()));
    writeFileSync(candidatePath, JSON.stringify(candidateReport()));
    writeFileSync(optimizationPath, JSON.stringify(optimizationReport()));

    const result = await runNode([
      "scripts/3d/heavy-asset-pilot-report.mjs",
      "--proof-mode",
      "real-heavy-local",
      "--source-analysis",
      sourcePath,
      "--candidate-report",
      candidatePath,
      "--optimization-report",
      optimizationPath,
      "--out",
      outPath,
      "--generated-at",
      "2026-05-31T00:00:00.000Z"
    ]);

    assert.equal(result.code, 0, result.stderr);
    const markdown = readFileSync(outPath, "utf8");
    assert.match(markdown, /RavioliAvecAssiete\.glb/);
    assert.match(markdown, /76,747,968/);
    assert.match(markdown, /Generated outputs are not committed/);
    assert.doesNotMatch(markdown, /REDACTED_LOCAL_SOURCE/);
    assert.doesNotMatch(markdown, /vistaire-heavy-report-test/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
