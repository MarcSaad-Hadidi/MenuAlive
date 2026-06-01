import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const jobsModel = await import("../lib/owner/threeDJobsModel.ts");

const IDENTITY = {
  restaurantSlug: "maison-elyse",
  menuSlug: "main",
  dishSlug: "homard-bisque",
  version: "v1"
};

function job(overrides = {}) {
  return {
    id: overrides.id ?? `job_${Math.random().toString(16).slice(2).padEnd(16, "0")}`,
    ...IDENTITY,
    step: overrides.step ?? "optimize",
    status: overrides.status ?? "queued",
    startedAt: overrides.startedAt ?? null,
    finishedAt: overrides.finishedAt ?? null,
    logs: overrides.logs ?? [],
    stepLogs: overrides.stepLogs ?? [],
    artifacts: overrides.artifacts ?? [],
    error: overrides.error ?? null,
    initiatedBy: overrides.initiatedBy ?? "owner@vistaire.test",
    nextAction: overrides.nextAction ?? "Review",
    manualRunnerCommand:
      overrides.manualRunnerCommand ??
      "npm run 3d:optimize-dish -- --restaurant maison-elyse --menu main --dish homard-bisque --version v1",
    createdAt: overrides.createdAt ?? "2026-05-31T12:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-05-31T12:00:00.000Z",
    observability: overrides.observability
  };
}

test("owner 3D observability derives aggregate metrics from jobs", () => {
  const jobs = [
    job({
      id: "job_passed00000000",
      step: "visual_compare",
      status: "ready_to_publish",
      startedAt: "2026-05-31T12:00:00.000Z",
      finishedAt: "2026-05-31T12:00:10.000Z",
      observability: {
        qualityStatus: "passed",
        metrics: {
          sourceSizeBytes: 1_000,
          selectedCandidateSizeBytes: 400,
          visualStatus: "passed",
          candidatesRejected: 2
        },
        errors: [],
        artifactRefs: []
      }
    }),
    job({
      id: "job_failed00000000",
      step: "visual_compare",
      status: "failed",
      startedAt: "2026-05-31T12:01:00.000Z",
      finishedAt: "2026-05-31T12:01:05.000Z",
      error: "strict visual compare failed",
      observability: {
        qualityStatus: "failed",
        metrics: {
          sourceSizeBytes: 2_000,
          visualStatus: "failed",
          candidatesRejected: 3
        },
        errors: [{ step: "visual_compare", message: "strict visual compare failed" }],
        artifactRefs: []
      }
    }),
    job({ id: "job_review00000000", status: "needs_visual_review", step: "visual_review" }),
    job({ id: "job_device00000000", status: "needs_device_qa", step: "device_qa" }),
    job({ id: "job_cdn000000000", status: "needs_cdn_upload", step: "cdn" }),
    job({ id: "job_rollback00000", status: "rolled_back", step: "rollback", startedAt: "2026-05-31T12:02:00.000Z", finishedAt: "2026-05-31T12:02:02.000Z" })
  ];

  const dashboard = jobsModel.buildPipelineObservabilityDashboard(jobs);

  assert.equal(dashboard.metrics.sourceSizeBytes, 3_000);
  assert.equal(dashboard.metrics.selectedCandidateSizeBytes, 400);
  assert.equal(dashboard.metrics.reductionPercent, 86.7);
  assert.equal(dashboard.metrics.visualPassRate, 50);
  assert.equal(dashboard.metrics.candidatesRejected, 5);
  assert.equal(dashboard.metrics.averageRunDurationMs, 5_667);
  assert.equal(dashboard.metrics.failedStepCounts.visual_compare, 1);
  assert.equal(dashboard.metrics.assetsNeedingReview, 1);
  assert.equal(dashboard.metrics.assetsReadyToPublish, 1);
  assert.equal(dashboard.metrics.deviceQaPending, 1);
  assert.equal(dashboard.metrics.cdnValidationPending, 1);
  assert.equal(dashboard.metrics.rollbackCount, 1);
  assert.match(dashboard.topBlockers[0].label, /strict visual compare failed|Device QA pending|CDN validation pending/);
  assert.ok(dashboard.aiRecommendations.some((item) => /device QA evidence/i.test(item.message)));
});

test("owner 3D observability sanitizes logs, errors, commands, and reports", () => {
  const unsafe = [
    "Authorization: Bearer super-secret-token",
    "SUPABASE_SERVICE_ROLE_KEY=service-role-secret",
    "BLOB_READ_WRITE_TOKEN=blob-token",
    "https://assets.example.test/model.glb?token=url-token&signature=signed",
    "password=hunter2 sk_live_123456789"
  ].join(" ");

  const sanitized = jobsModel.sanitizePipelineLogLine(unsafe);
  assert.match(sanitized, /\[redacted\]/);
  assert.doesNotMatch(sanitized, /super-secret-token|service-role-secret|blob-token|url-token|hunter2|sk_live_123456789/);

  const report = jobsModel.buildPipelineJobReport(
    job({
      status: "failed",
      logs: [unsafe],
      error: unsafe,
      manualRunnerCommand: `npm run 3d:optimize-dish -- --cdn-base-url https://assets.example.test/vistaire?token=url-token`,
      stepLogs: [
        {
          id: "step_1",
          step: "optimize",
          status: "failed",
          startedAt: "2026-05-31T12:00:00.000Z",
          finishedAt: "2026-05-31T12:00:01.000Z",
          durationMs: 1_000,
          logs: [unsafe],
          error: unsafe,
          artifactIds: []
        }
      ]
    })
  );
  const markdown = jobsModel.renderPipelineJobMarkdownReport(report);

  assert.doesNotMatch(JSON.stringify(report), /super-secret-token|service-role-secret|blob-token|url-token|hunter2|sk_live_123456789/);
  assert.doesNotMatch(markdown, /super-secret-token|service-role-secret|blob-token|url-token|hunter2|sk_live_123456789/);
  assert.match(markdown, /Quality status/);
  assert.match(markdown, /Copy command/);
});

test("owner 3D fallback queue contains observable data without fake success", () => {
  const queue = jobsModel.buildFallbackPipelineJobs([IDENTITY], "dev-owner");
  const dashboard = jobsModel.buildPipelineObservabilityDashboard(queue.jobs);

  assert.equal(queue.persisted, false);
  assert.equal(queue.jobs[0].observability.qualityStatus, "queued");
  assert.equal(dashboard.metrics.sourceSizeBytes, null);
  assert.equal(dashboard.metrics.visualPassRate, 0);
  assert.ok(dashboard.aiRecommendations.some((item) => /runner/i.test(item.message)));
});

test("owner 3D jobs UI exposes observable health, filters, blockers, downloads, and command copy", () => {
  const componentPath = join(
    process.cwd(),
    "components",
    "owner",
    "Owner3dJobsPanel.tsx"
  );
  assert.equal(existsSync(componentPath), true);
  const source = readFileSync(componentPath, "utf8");

  for (const text of [
    "Pipeline health",
    "Average run duration",
    "Failure reasons",
    "Top blockers",
    "Owner AI recommendations",
    "Filter by restaurant",
    "Filter by status",
    "Download JSON",
    "Download MD",
    "Copy command"
  ]) {
    assert.match(source, new RegExp(text));
  }
});

test("owner 3D jobs migration has observability columns for persistent runs", () => {
  const migration = readFileSync(
    join(process.cwd(), "supabase", "migrations", "0004_owner_3d_pipeline_jobs.sql"),
    "utf8"
  );

  for (const expected of [
    "step_logs jsonb",
    "metrics jsonb",
    "quality_status text",
    "duration_ms integer",
    "error_count integer"
  ]) {
    assert.match(migration, new RegExp(expected));
  }
});
