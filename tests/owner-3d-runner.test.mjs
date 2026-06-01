import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const runnerPath = join(process.cwd(), "scripts", "3d", "runner.mjs");
const migrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "0005_owner_3d_external_runner.sql"
);

function tryCreateSymlink(target, path, type = undefined) {
  try {
    symlinkSync(target, path, type);
    return true;
  } catch (error) {
    if (error?.code === "EPERM") return false;
    throw error;
  }
}

test("owner 3D external runner script exists and exports a testable API", async () => {
  assert.equal(existsSync(runnerPath), true);
  const runner = await import(`../scripts/3d/runner.mjs?cache=${Date.now()}`);

  for (const exportName of [
    "parseRunnerArgs",
    "buildStepPlan",
    "sanitizeRunnerLogLine",
    "safeLocalSourcePath",
    "resolveRunnerSourceUploadId",
    "buildStorageArtifactPath",
    "collectArtifactFiles",
    "runOnce",
    "shouldStopRunnerLoop"
  ]) {
    assert.equal(typeof runner[exportName], "function", `${exportName} export`);
  }
});

test("owner 3D runner accepts concrete source upload ids and prefers job-bound uploads", async () => {
  const runner = await import(`../scripts/3d/runner.mjs?cache=${Date.now()}`);
  const sourceUploadId = "11111111-1111-4111-8111-111111111111";

  const args = runner.parseRunnerArgs(["--once", "--source-upload-id", sourceUploadId]);
  assert.equal(args.sourceUploadId, sourceUploadId);
  assert.equal(
    runner.resolveRunnerSourceUploadId({
      job: { source_upload_id: sourceUploadId },
      args: { sourceUploadId }
    }),
    sourceUploadId
  );
  assert.throws(
    () =>
      runner.resolveRunnerSourceUploadId({
        job: { source_upload_id: sourceUploadId },
        args: { sourceUploadId: "22222222-2222-4222-8222-222222222222" }
      }),
    /does not match/
  );

  const runnerSource = readFileSync(runnerPath, "utf8");
  assert.match(runnerSource, /source_upload_id/);
  assert.match(runnerSource, /sourceUploadId/);

  const migration = readFileSync(migrationPath, "utf8").toLowerCase();
  assert.match(migration, /source_upload_id uuid/);
  assert.match(migration, /owner_3d_pipeline_jobs_source_upload_idx/);
});

test("owner 3D job enqueue binds queued work to the latest runnable source upload", () => {
  const store = readFileSync(join(process.cwd(), "lib", "owner", "threeDJobsStore.ts"), "utf8");
  assert.match(store, /SOURCE_UPLOADS_TABLE/);
  assert.match(store, /findLatestRunnableSourceUploadId/);
  assert.match(store, /source_upload_id:\s*latestSourceUploadId/);
});

test("owner 3D runner validates identity and keeps downloaded sources in ignored source folders", async () => {
  const runner = await import(`../scripts/3d/runner.mjs?cache=${Date.now()}`);
  const identity = {
    restaurantSlug: "maison-elyse",
    menuSlug: "main",
    dishSlug: "homard-bisque",
    version: "v1"
  };

  const sourcePath = runner.safeLocalSourcePath({
    rootDir: process.cwd(),
    identity,
    sha256: "a".repeat(64)
  });
  assert.match(
    sourcePath.replaceAll("\\", "/"),
    /assets\/3d\/source\/maison-elyse\/main\/homard-bisque\/v1\/source\.glb$/
  );

  assert.throws(
    () =>
      runner.safeLocalSourcePath({
        rootDir: process.cwd(),
        identity: { ...identity, dishSlug: "../secret" },
        sha256: "a".repeat(64)
      }),
    /Invalid runner identity/
  );
});

test("owner 3D runner maps job steps to bounded npm command plans", async () => {
  const runner = await import(`../scripts/3d/runner.mjs?cache=${Date.now()}`);
  const job = {
    id: "job_test00000000",
    restaurant_slug: "maison-elyse",
    menu_slug: "main",
    dish_slug: "homard-bisque",
    asset_version: "v1"
  };

  const analyze = runner.buildStepPlan({
    job: { ...job, step: "analyze" },
    rootDir: process.cwd(),
    sourcePath: "assets/3d/source/maison-elyse/main/homard-bisque/v1/source.glb",
    cdnBaseUrl: "https://cdn.example.com/vistaire",
    runnerLabel: "Vistaire runner"
  });
  assert.deepEqual(analyze.command.slice(0, 3), ["npm", "run", "3d:analyze-source"]);
  assert.ok(analyze.command.includes("--source"));
  assert.ok(analyze.expectedArtifacts.some((artifact) => artifact.endsWith("source-analysis.json")));

  const optimize = runner.buildStepPlan({
    job: { ...job, step: "optimize" },
    rootDir: process.cwd(),
    sourcePath: "assets/3d/source/maison-elyse/main/homard-bisque/v1/source.glb",
    cdnBaseUrl: "https://cdn.example.com/vistaire",
    runnerLabel: "Vistaire runner"
  });
  assert.deepEqual(optimize.command.slice(0, 3), ["npm", "run", "3d:optimize-heavy"]);
  assert.ok(optimize.command.includes("--run-visual-compare"));
  assert.ok(optimize.expectedArtifacts.some((artifact) => artifact.endsWith("repair-report.json")));
  assert.ok(optimize.expectedArtifacts.some((artifact) => artifact.endsWith("optimization-report.json")));
  assert.ok(optimize.expectedArtifacts.some((artifact) => artifact.endsWith("candidate-report.json")));
  assert.doesNotMatch(optimize.command.join(" "), /public\/models\/restaurants\/.*\.glb/);

  assert.throws(
    () =>
      runner.buildStepPlan({
        job: { ...job, step: "publish" },
        rootDir: process.cwd(),
        sourcePath: "assets/3d/source/maison-elyse/main/homard-bisque/v1/source.glb",
        cdnBaseUrl: "https://cdn.example.com/vistaire",
        runnerLabel: "Vistaire runner"
      }),
    /not automated/
  );
});

test("owner 3D polling runner stays alive while the queue is idle", async () => {
  const runner = await import(`../scripts/3d/runner.mjs?cache=${Date.now()}`);
  const pollArgs = { once: false, maxJobs: null };

  assert.equal(
    runner.shouldStopRunnerLoop({ args: pollArgs, processed: 0, result: { claimed: false } }),
    false
  );
  assert.equal(
    runner.shouldStopRunnerLoop({ args: { ...pollArgs, once: true }, processed: 0, result: { claimed: false } }),
    true
  );
  assert.equal(
    runner.shouldStopRunnerLoop({ args: { ...pollArgs, maxJobs: 2 }, processed: 1, result: { claimed: false } }),
    false
  );
  assert.equal(
    runner.shouldStopRunnerLoop({ args: { ...pollArgs, maxJobs: 2 }, processed: 2, result: { claimed: true } }),
    true
  );

  const source = readFileSync(runnerPath, "utf8");
  assert.doesNotMatch(source, /args\.once\s*\|\|\s*!result\.claimed/);
});

test("owner 3D runner sanitizes logs and refuses unsafe artifact paths", async () => {
  const runner = await import(`../scripts/3d/runner.mjs?cache=${Date.now()}`);
  const unsafe = [
    "Authorization: Bearer super-secret-token",
    "SUPABASE_SERVICE_ROLE_KEY=service-role-secret",
    "https://assets.example.test/model.glb?token=url-token",
    "password=hunter2"
  ].join(" ");

  const sanitized = runner.sanitizeRunnerLogLine(unsafe);
  assert.match(sanitized, /\[redacted\]/);
  assert.doesNotMatch(sanitized, /super-secret-token|service-role-secret|url-token|hunter2/);

  assert.throws(
    () =>
      runner.buildStorageArtifactPath({
        jobId: "job_test00000000",
        relativePath: "../../.env"
      }),
    /Unsafe artifact path/
  );
});

test("owner 3D runner refuses outside-root sources and skips symlink artifacts", async () => {
  const runner = await import(`../scripts/3d/runner.mjs?cache=${Date.now()}`);
  const rootDir = join(tmpdir(), `vistaire-runner-artifacts-${Date.now()}`);
  const job = {
    id: "job_test00000000",
    restaurant_slug: "maison-elyse",
    menu_slug: "main",
    dish_slug: "homard-bisque",
    asset_version: "v1",
    step: "analyze"
  };

  assert.throws(
    () =>
      runner.buildStepPlan({
        job,
        rootDir,
        sourcePath: "C:/secret/source.glb",
        cdnBaseUrl: "https://cdn.example.com/vistaire",
        runnerLabel: "Vistaire runner"
      }),
    /outside runner root/i
  );

  try {
    const reportsDir = join(
      rootDir,
      "assets",
      "3d",
      "reports",
      "maison-elyse",
      "main",
      "homard-bisque",
      "v1"
    );
    mkdirSync(reportsDir, { recursive: true });
    const victim = join(rootDir, "secret.env");
    writeFileSync(victim, "SUPABASE_SERVICE_ROLE_KEY=secret");
    const linked = tryCreateSymlink(victim, join(reportsDir, "source-analysis.md"));
    if (!linked) {
      mkdirSync(join(reportsDir, "visual"), { recursive: true });
      const outsideDir = join(rootDir, "outside");
      mkdirSync(outsideDir);
      writeFileSync(join(outsideDir, "secret.md"), "SUPABASE_SERVICE_ROLE_KEY=secret");
      const junctionLinked = tryCreateSymlink(outsideDir, join(reportsDir, "visual", "outside"), "junction");
      if (!junctionLinked) return;
    }

    const files = runner.collectArtifactFiles({
      rootDir,
      expectedArtifacts: [
        "assets/3d/reports/maison-elyse/main/homard-bisque/v1/source-analysis.md"
      ],
      artifactRoots: ["assets/3d/reports/maison-elyse/main/homard-bisque/v1"]
    });
    assert.deepEqual(files, []);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

test("owner 3D runner migration adds atomic claim fencing and private RPC grants", () => {
  assert.equal(existsSync(migrationPath), true);
  const migration = readFileSync(migrationPath, "utf8");

  for (const expected of [
    "lock_token uuid",
    "lease_expires_at timestamptz",
    "attempt_count integer",
    "owner_3d_claim_pipeline_job",
    "for update skip locked",
    "pg_try_advisory_xact_lock",
    "not exists",
    "owner_3d_heartbeat_pipeline_job",
    "owner_3d_complete_pipeline_job",
    "revoke all on function public.owner_3d_claim_pipeline_job",
    "grant execute on function public.owner_3d_claim_pipeline_job"
  ]) {
    assert.match(migration.toLowerCase(), new RegExp(expected));
  }
});

test("owner 3D jobs API remains request-safe while external runner handles long commands", () => {
  const routes = [
    join(process.cwd(), "app", "api", "owner", "3d-ar", "jobs", "route.ts"),
    join(process.cwd(), "app", "api", "owner", "3d-ar", "jobs", "[jobId]", "route.ts")
  ];

  for (const route of routes) {
    const source = readFileSync(route, "utf8");
    assert.doesNotMatch(source, /child_process|spawn\(|exec\(|execFile\(|npm run 3d:/);
  }

  const runner = readFileSync(runnerPath, "utf8");
  assert.match(runner, /child_process/);
  assert.match(runner, /owner_3d_claim_pipeline_job/);
});
