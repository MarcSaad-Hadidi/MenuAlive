import { expect, type Page, test } from "@playwright/test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const OWNER_E2E_TOKEN =
  process.env.VISTAIRE_OWNER_E2E_AUTH_BYPASS_TOKEN ??
  "vistaire-owner-e2e-local-token";

const IDENTITY = {
  restaurantSlug: "e2e-owner",
  menuSlug: "e2e-menu",
  dishSlug: "e2e-dish"
};

const VERSION_V1 = "v1";
const VERSION_V2 = "v2";
const MODEL_ASSET_RE = /\.(?:glb|usdz)(?:$|[?#]|%|&)/i;
const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64"
);

type PageHealth = {
  expectClean: () => void;
};

function tinyGlb(): Buffer {
  const json = JSON.stringify({
    asset: { version: "2.0" },
    scene: 0,
    scenes: [{ nodes: [] }],
    nodes: []
  });
  const jsonPadding = (4 - (Buffer.byteLength(json) % 4)) % 4;
  const jsonChunk = Buffer.concat([
    Buffer.from(json),
    Buffer.alloc(jsonPadding, 0x20)
  ]);
  const totalLength = 12 + 8 + jsonChunk.byteLength;
  const buffer = Buffer.alloc(totalLength);
  buffer.writeUInt32LE(0x46546c67, 0);
  buffer.writeUInt32LE(2, 4);
  buffer.writeUInt32LE(totalLength, 8);
  buffer.writeUInt32LE(jsonChunk.byteLength, 12);
  buffer.writeUInt32LE(0x4e4f534a, 16);
  jsonChunk.copy(buffer, 20);
  return buffer;
}

function installPageHealth(page: Page): PageHealth {
  const networkIssues: string[] = [];
  const consoleErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (text.includes("Failed to load resource")) return;
    consoleErrors.push(text);
  });

  page.on("pageerror", (error) => {
    consoleErrors.push(error.message);
  });

  page.on("response", (response) => {
    const status = response.status();
    if (status === 404 || status >= 500) {
      networkIssues.push(`${status} ${response.url()}`);
    }
  });

  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText ?? "request failed";
    if (failure === "net::ERR_ABORTED") return;
    networkIssues.push(`${failure} ${request.url()}`);
  });

  return {
    expectClean() {
      expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
      expect(networkIssues, networkIssues.join("\n")).toEqual([]);
    }
  };
}

function collectModelAssetRequests(page: Page) {
  const requests: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (MODEL_ASSET_RE.test(url)) requests.push(url);
  });
  return requests;
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth - root.clientWidth;
  });
  expect(overflow).toBeLessThanOrEqual(2);
}

async function routeReviewArtifacts(page: Page) {
  const glb = tinyGlb();
  await page.route("**/api/owner/3d-ar/review-artifact?**", async (route) => {
    const url = new URL(route.request().url());
    const artifactPath = url.searchParams.get("path") ?? "";
    if (artifactPath.endsWith(".glb")) {
      await route.fulfill({
        status: 200,
        contentType: "model/gltf-binary",
        body: glb
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "image/png",
      body: TRANSPARENT_PNG
    });
  });
}

async function enableOwnerBypass(page: Page) {
  await page.route("**/api/owner/3d-ar/jobs", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        configured: false,
        persisted: false,
        mode: "fallback",
        note: "E2E fallback jobs.",
        jobs: [
          {
            id: "e2e-job-analyze",
            restaurantSlug: IDENTITY.restaurantSlug,
            menuSlug: IDENTITY.menuSlug,
            dishSlug: IDENTITY.dishSlug,
            version: VERSION_V2,
            step: "analyze",
            status: "queued",
            startedAt: null,
            finishedAt: null,
            logs: ["Queued by owner e2e fixture."],
            stepLogs: [],
            artifacts: [],
            error: null,
            initiatedBy: "owner-e2e",
            nextAction: "Run analyze",
            manualRunnerCommand: "npm run 3d:analyze-source -- --source <private>",
            createdAt: "2026-05-31T12:00:00.000Z",
            updatedAt: "2026-05-31T12:00:00.000Z",
            observability: {
              qualityStatus: "queued",
              metrics: {
                sourceSizeBytes: null,
                selectedCandidateSizeBytes: null,
                reductionPercent: null,
                visualStatus: "not_run",
                candidatesRejected: 0,
                durationMs: null
              },
              errors: [],
              artifactRefs: []
            }
          }
        ]
      })
    });
  });
  await page.route("**/api/owner/3d-ar/sources/status**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        configured: false,
        message: "storage not configured",
        provider: "not-configured",
        record: null
      })
    });
  });
  await page.route("**/api/owner/3d-ar/device-qa**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true })
    });
  });
  await page.route("**/api/owner/3d-ar/lifecycle**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, configured: false, events: [] })
    });
  });
}

function ownerUrl(path: string): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}__vistaire_owner_e2e=${encodeURIComponent(OWNER_E2E_TOKEN)}`;
}

function manifestFor(version: string, status: "draft" | "published") {
  const base = `/models/restaurants/${IDENTITY.restaurantSlug}/${IDENTITY.menuSlug}/${IDENTITY.dishSlug}/${version}`;
  const published = status === "published";
  return {
    schemaVersion: 2,
    restaurantSlug: IDENTITY.restaurantSlug,
    menuSlug: IDENTITY.menuSlug,
    dishSlug: IDENTITY.dishSlug,
    activeVersion: version,
    restaurantName: "E2E Owner",
    dishName: "E2E Dish",
    status: published ? "published" : "draft",
    validationStatus: published ? "passed" : "warning",
    generatedAt: "2026-05-31T12:00:00.000Z",
    approvedAt: published ? "2026-05-31T12:05:00.000Z" : null,
    publishedAt: published ? "2026-05-31T12:10:00.000Z" : null,
    validation: {
      warnings: published ? [] : ["E2E fixture intentionally missing final gates."],
      fails: []
    },
    variants: {
      web: { url: `${base}/web/e2e-dish.glb`, bytes: 1024, sha256: "a".repeat(64) },
      mobile: { url: `${base}/mobile/e2e-dish.glb`, bytes: 900, sha256: "b".repeat(64) },
      arLite: { url: `${base}/ar-lite/e2e-dish.glb`, bytes: 800, sha256: "c".repeat(64) },
      iosUsdz: { url: `${base}/ios/e2e-dish.usdz`, bytes: 700, sha256: "d".repeat(64) },
      poster: { url: `${base}/poster/e2e-dish.webp`, bytes: 600, sha256: "e".repeat(64) }
    },
    candidateReport: { selectedCandidate: "mobile-balanced" },
    visualQuality: {
      status: published ? "passed" : "missing",
      manualReview: { status: published ? "approved" : "pending" }
    },
    quality: {
      manualVisualApproved: published,
      manualReview: { status: published ? "approved" : "pending" },
      realDeviceQa: {
        required: true,
        iphoneQuickLook: {
          required: true,
          status: published ? "passed" : "not-tested",
          device: published ? "iPhone 15 Pro" : "",
          os: published ? "iOS 18.5" : "",
          testedBy: published ? "Owner E2E" : "",
          testedAt: published ? "2026-05-31T12:06:00.000Z" : null,
          evidence: published
            ? { sha256: "f".repeat(64), bytes: 64, path: "device-qa/iphone.md" }
            : null
        },
        androidSceneViewer: {
          required: true,
          status: published ? "passed" : "not-tested",
          device: published ? "Pixel 8" : "",
          os: published ? "Android 15" : "",
          testedBy: published ? "Owner E2E" : "",
          testedAt: published ? "2026-05-31T12:07:00.000Z" : null,
          evidence: published
            ? { sha256: "1".repeat(64), bytes: 64, path: "device-qa/android.md" }
            : null
        }
      }
    },
    lifecycle: {
      phase: published ? "published" : "draft",
      finalizedAt: published ? "2026-05-31T12:05:00.000Z" : null,
      publishedAt: published ? "2026-05-31T12:10:00.000Z" : null
    }
  };
}

async function writeJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeFixtureFiles() {
  const root = process.cwd();
  for (const [version, status] of [
    [VERSION_V1, "published"],
    [VERSION_V2, "draft"]
  ] as const) {
    await writeJson(
      join(
        root,
        "public",
        "models",
        "restaurants",
        IDENTITY.restaurantSlug,
        IDENTITY.menuSlug,
        IDENTITY.dishSlug,
        version,
        "manifest.json"
      ),
      manifestFor(version, status)
    );
  }

  const reportsRoot = join(
    root,
    "assets",
    "3d",
    "reports",
    IDENTITY.restaurantSlug,
    IDENTITY.menuSlug,
    IDENTITY.dishSlug,
    VERSION_V1
  );
  await writeJson(join(reportsRoot, "candidate-report.json"), {
    selectedCandidate: "mobile-balanced",
    decision: { status: "selected", reason: "E2E selected candidate." },
    rejectedCandidates: [{ name: "aggressive", reason: "Texture drift." }]
  });
  await writeJson(join(reportsRoot, "visual-report.json"), {
    status: "passed",
    meanSsim: 0.991,
    maxDiffRatio: 0.001,
    maxSilhouetteDiff: 0.001,
    maxColorDelta: 0.01,
    maxTextureBlurDelta: 0.01,
    maxMaterialDrift: 0.01,
    maxScaleDriftMeters: 0.001,
    maxOriginDriftMeters: 0.001,
    selectedCandidate: "mobile-balanced",
    source: {
      path: `assets/3d/source/${IDENTITY.restaurantSlug}/${IDENTITY.menuSlug}/${IDENTITY.dishSlug}/${VERSION_V1}/source.glb`
    },
    candidate: {
      path: `assets/3d/work/${IDENTITY.restaurantSlug}/${IDENTITY.menuSlug}/${IDENTITY.dishSlug}/${VERSION_V1}/mobile/e2e-dish-mobile.glb`
    },
    decision: { reason: "E2E visual report passes strict gates." },
    angleReports: [
      {
        variant: "mobile",
        angle: "front",
        status: "passed",
        before: `assets/3d/reports/${IDENTITY.restaurantSlug}/${IDENTITY.menuSlug}/${IDENTITY.dishSlug}/${VERSION_V1}/visual/mobile/before/front.png`,
        after: `assets/3d/reports/${IDENTITY.restaurantSlug}/${IDENTITY.menuSlug}/${IDENTITY.dishSlug}/${VERSION_V1}/visual/mobile/after/front.png`,
        diff: `assets/3d/reports/${IDENTITY.restaurantSlug}/${IDENTITY.menuSlug}/${IDENTITY.dishSlug}/${VERSION_V1}/visual/mobile/diff/front.png`
      }
    ]
  });
}

async function cleanupFixtureFiles() {
  const root = process.cwd();
  await rm(join(root, "public", "models", "restaurants", IDENTITY.restaurantSlug), {
    recursive: true,
    force: true
  });
  await rm(join(root, "assets", "3d", "reports", IDENTITY.restaurantSlug), {
    recursive: true,
    force: true
  });
}

test.describe.serial("owner 3D/AR pipeline operations center", () => {
  test.beforeAll(async () => {
    await writeFixtureFiles();
  });

  test.afterAll(async () => {
    await cleanupFixtureFiles();
  });

  test("signed-out visitors are blocked from owner pipeline pages and APIs", async ({
    request
  }, testInfo) => {
    const baseURL = String(testInfo.project.use.baseURL ?? "http://localhost:3000");
    for (const path of [
      "/owner/3d-ar",
      `/owner/3d-ar/${IDENTITY.restaurantSlug}/${IDENTITY.menuSlug}/${IDENTITY.dishSlug}/${VERSION_V1}/review`
    ]) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status()).toBe(307);
      expect(new URL(response.headers().location!, baseURL).pathname).toBe("/sign-in");
    }

    for (const path of [
      "/api/owner/3d-ar/jobs",
      `/api/owner/3d-ar/sources/status?restaurantSlug=${IDENTITY.restaurantSlug}&menuSlug=${IDENTITY.menuSlug}&dishSlug=${IDENTITY.dishSlug}&version=${VERSION_V1}`,
      `/api/owner/3d-ar/device-qa?restaurantSlug=${IDENTITY.restaurantSlug}&menuSlug=${IDENTITY.menuSlug}&dishSlug=${IDENTITY.dishSlug}&version=${VERSION_V1}`,
      `/api/owner/3d-ar/lifecycle?restaurantSlug=${IDENTITY.restaurantSlug}&menuSlug=${IDENTITY.menuSlug}&dishSlug=${IDENTITY.dishSlug}&version=${VERSION_V1}`
    ]) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status()).toBe(401);
      await expect(response.json()).resolves.toEqual({
        ok: false,
        error: "Authentification requise."
      });
    }
  });

  test("source upload rejects invalid file and job list renders without overflow", async ({
    page
  }) => {
    await enableOwnerBypass(page);
    const health = installPageHealth(page);
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto(ownerUrl("/owner/3d-ar"), { waitUntil: "domcontentloaded" });
    await expect(page.getByLabel("Upload source GLB")).toBeVisible();
    await expect(page.getByLabel("3D/AR pipeline jobs")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Job queue" })).toBeVisible();

    await page
      .getByTestId("owner-3d-source-file-input")
      .setInputFiles({
        name: "not-a-model.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("nope")
      });
    await expect(page.getByTestId("owner-3d-source-status")).toContainText(
      "extension .glb requise"
    );
    await expect(page.getByRole("button", { name: "Upload source" })).toBeDisabled();
    await expectNoHorizontalOverflow(page);
    health.expectClean();
  });

  test("review page avoids early GLB and loads the source model only after click", async ({
    page
  }) => {
    await enableOwnerBypass(page);
    await routeReviewArtifacts(page);
    const health = installPageHealth(page);
    const modelRequests = collectModelAssetRequests(page);
    await page.setViewportSize({ width: 1280, height: 900 });

    await page.goto(
      ownerUrl(
        `/owner/3d-ar/${IDENTITY.restaurantSlug}/${IDENTITY.menuSlug}/${IDENTITY.dishSlug}/${VERSION_V1}/review`
      ),
      { waitUntil: "domcontentloaded" }
    );

    await expect(page.getByLabel("Owner visual review")).toBeVisible();
    await expect(page.locator("model-viewer")).toHaveCount(0);
    expect(modelRequests).toEqual([]);
    await expectNoHorizontalOverflow(page);

    await page.getByRole("button", { name: "Load source model" }).click();
    await expect(page.getByTestId("owner-3d-model-source")).toBeVisible();
    await expect
      .poll(() => modelRequests.some((url) => url.includes("source.glb")))
      .toBe(true);
    expect(modelRequests.some((url) => /\.usdz(?:$|[?#]|%|&)/i.test(url))).toBe(false);
    health.expectClean();
  });

  test("review, device QA, finalize, publish and rollback gates stay locked until evidence", async ({
    page
  }) => {
    await enableOwnerBypass(page);
    await routeReviewArtifacts(page);
    const health = installPageHealth(page);
    await page.setViewportSize({ width: 430, height: 932 });

    await page.goto(
      ownerUrl(
        `/owner/3d-ar/${IDENTITY.restaurantSlug}/${IDENTITY.menuSlug}/${IDENTITY.dishSlug}/${VERSION_V2}/review`
      ),
      { waitUntil: "domcontentloaded" }
    );
    await expect(page.getByRole("button", { name: "Approve visual" })).toBeDisabled();

    await page.goto(
      ownerUrl(
        `/owner/3d-ar/${IDENTITY.restaurantSlug}/${IDENTITY.menuSlug}/${IDENTITY.dishSlug}/${VERSION_V1}/review`
      ),
      { waitUntil: "domcontentloaded" }
    );
    await expect(page.getByTestId("owner-3d-deviceqa-iphoneQuickLook-pass")).toBeDisabled();
    await expect(page.locator('input[type="file"][accept*=".png"]').first()).toBeVisible();

    await page.goto(
      ownerUrl(
        `/owner/3d-ar/${IDENTITY.restaurantSlug}/${IDENTITY.menuSlug}/${IDENTITY.dishSlug}/${VERSION_V2}`
      ),
      { waitUntil: "domcontentloaded" }
    );
    await expect(page.getByTestId("owner-3d-finalize-submit")).toBeDisabled();
    await expect(page.getByTestId("owner-3d-publish-submit")).toBeDisabled();

    const rollbackSubmit = page.getByTestId("owner-3d-rollback-submit");
    await expect(rollbackSubmit).toBeDisabled();
    await page
      .locator("#lifecycle-rollback-confirm")
      .fill(`ROLLBACK ${IDENTITY.restaurantSlug}/${IDENTITY.menuSlug}/${IDENTITY.dishSlug} TO ${VERSION_V1}`);
    await expect(rollbackSubmit).toBeEnabled();
    await expectNoHorizontalOverflow(page);
    health.expectClean();
  });
});
