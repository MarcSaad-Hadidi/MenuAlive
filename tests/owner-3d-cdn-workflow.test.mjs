import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const cdnModel = await import("../lib/owner/threeDCdnWorkflow.ts");
const pipelineModel = await import("../lib/owner/threeDArPipelineModel.ts");

const IDENTITY = {
  restaurantSlug: "maison-elyse",
  menuSlug: "main",
  dishSlug: "homard-bisque",
  version: "v1"
};

const HASHES = {
  web: "a".repeat(64),
  mobile: "b".repeat(64),
  arLite: "c".repeat(64),
  iosUsdz: "d".repeat(64),
  poster: "e".repeat(64)
};

const CDN_BASE_URL = "https://cdn.vistaire.test/vistaire";

function manifest() {
  return {
    schemaVersion: 2,
    restaurantSlug: IDENTITY.restaurantSlug,
    menuSlug: IDENTITY.menuSlug,
    dishSlug: IDENTITY.dishSlug,
    activeVersion: IDENTITY.version,
    status: "review",
    validationStatus: "unvalidated",
    visualQuality: {
      status: "passed",
      manualReview: { status: "approved" }
    },
    quality: {
      manualVisualApproved: true,
      manualReview: { status: "approved" },
      realDeviceQa: {
        required: true,
        iphoneQuickLook: {
          required: true,
          status: "passed",
          device: "iPhone 15 Pro",
          os: "iOS 18.5",
          testedBy: "Owner",
          testedAt: "2026-05-31T12:00:00.000Z",
          evidence: { path: "assets/3d/reports/qa/iphone.md", sha256: "1".repeat(64), bytes: 128 }
        },
        androidSceneViewer: {
          required: true,
          status: "passed",
          device: "Pixel 8",
          os: "Android 15",
          testedBy: "Owner",
          testedAt: "2026-05-31T12:00:00.000Z",
          evidence: { path: "assets/3d/reports/qa/android.md", sha256: "2".repeat(64), bytes: 128 }
        }
      }
    },
    validation: { warnings: [], fails: [] },
    variants: {
      web: {
        url: "https://cdn.vistaire.test/vistaire/maison-elyse/main/homard-bisque/v1/web/homard-bisque-web.glb",
        bytes: 1200,
        sha256: HASHES.web
      },
      mobile: {
        url: "https://cdn.vistaire.test/vistaire/maison-elyse/main/homard-bisque/v1/mobile/homard-bisque-mobile.glb",
        bytes: 1100,
        sha256: HASHES.mobile
      },
      arLite: {
        url: "https://cdn.vistaire.test/vistaire/maison-elyse/main/homard-bisque/v1/ar-lite/homard-bisque-ar-lite.glb",
        bytes: 900,
        sha256: HASHES.arLite
      },
      iosUsdz: {
        url: "https://cdn.vistaire.test/vistaire/maison-elyse/main/homard-bisque/v1/ios/homard-bisque.usdz",
        bytes: 1800,
        sha256: HASHES.iosUsdz
      },
      poster: {
        url: "https://cdn.vistaire.test/vistaire/maison-elyse/main/homard-bisque/v1/poster/homard-bisque.webp",
        bytes: 400,
        sha256: HASHES.poster
      }
    }
  };
}

function uploadPlan() {
  return {
    ok: true,
    name: "3d:prepare-cdn-upload",
    generatedAt: "2026-05-31T12:00:00.000Z",
    uploads: cdnModel.CDN_VARIANTS.map((variant) => ({
      variant,
      localPath: `assets/3d/work/maison-elyse/main/homard-bisque/v1/${variant}/${variant}`,
      url: manifest().variants[variant].url,
      bytes: manifest().variants[variant].bytes,
      sha256: manifest().variants[variant].sha256,
      contentType: variant === "iosUsdz" ? "model/vnd.usdz+zip" : variant === "poster" ? "image/webp" : "model/gltf-binary",
      headers: {
        "Content-Type": variant === "iosUsdz" ? "model/vnd.usdz+zip" : variant === "poster" ? "image/webp" : "model/gltf-binary",
        "Cache-Control": "public, max-age=31536000, immutable",
        ...(variant === "iosUsdz" ? { "Content-Disposition": "inline" } : {})
      }
    }))
  };
}

function networkReport(overrides = {}) {
  const assets = cdnModel.CDN_VARIANTS.map((variant) => ({
    label: `${variant} asset`,
    role: variant,
    url: manifest().variants[variant].url,
    status: 200,
    getStatus: 200,
    contentType: variant === "iosUsdz" ? "model/vnd.usdz+zip" : variant === "poster" ? "image/webp" : "model/gltf-binary",
    contentDisposition: variant === "iosUsdz" ? "inline" : "",
    cacheControl: "public, max-age=31536000, immutable",
    accessControlAllowOrigin: variant === "iosUsdz" ? "" : "*",
    contentLength: manifest().variants[variant].bytes,
    fetchedBytes: manifest().variants[variant].bytes,
    fetchedSha256: manifest().variants[variant].sha256,
    ...(overrides[variant] ?? {})
  }));
  return {
    ok: true,
    name: "network-headers",
    metrics: { assets }
  };
}

test("owner CDN workflow displays a generated upload plan for five variants", () => {
  const state = cdnModel.buildCdnWorkflowState({
    identity: IDENTITY,
    manifest: manifest(),
    uploadPlan: uploadPlan(),
    allowedOrigins: ["https://cdn.vistaire.test"],
    cdnBaseUrl: CDN_BASE_URL
  });

  assert.equal(state.uploadPlanGenerated, true);
  assert.equal(state.variants.length, 5);
  assert.deepEqual(state.variants.map((variant) => variant.variant), [
    "web",
    "mobile",
    "arLite",
    "iosUsdz",
    "poster"
  ]);
  assert.equal(state.variants.find((variant) => variant.variant === "iosUsdz").requiredHeaders["Content-Disposition"], "inline");
  assert.match(state.manualUploadCommand, /3d:prepare-cdn-upload/);
  assert.match(state.validateNetworkCommand, /3d:validate-network/);
});

test("owner CDN workflow rejects non-allowlisted and unstable target URLs", () => {
  const bad = manifest();
  bad.variants.web.url = "https://evil.test/vistaire/maison-elyse/main/homard-bisque/v1/web/x.glb";
  bad.variants.iosUsdz.url = "https://cdn.vistaire.test/vistaire/maison-elyse/main/homard-bisque/v1/ios/x.usdz?v=1";

  const state = cdnModel.buildCdnWorkflowState({
    identity: IDENTITY,
    manifest: bad,
    allowedOrigins: ["https://cdn.vistaire.test"],
    cdnBaseUrl: CDN_BASE_URL
  });

  assert.equal(state.variants.find((variant) => variant.variant === "web").urlSafe, false);
  assert.equal(state.variants.find((variant) => variant.variant === "iosUsdz").urlSafe, false);
  assert.equal(state.readyToFinalize, false);
});

test("owner CDN workflow requires passing network bytes and hashes before finalize", () => {
  const passing = cdnModel.buildCdnWorkflowState({
    identity: IDENTITY,
    manifest: manifest(),
    uploadPlan: uploadPlan(),
    networkReport: networkReport(),
    allowedOrigins: ["https://cdn.vistaire.test"],
    cdnBaseUrl: CDN_BASE_URL
  });
  assert.equal(passing.networkReportOk, true);
  assert.equal(passing.readyToFinalize, true);

  const mismatched = cdnModel.buildCdnWorkflowState({
    identity: IDENTITY,
    manifest: manifest(),
    uploadPlan: uploadPlan(),
    networkReport: networkReport({ web: { fetchedBytes: 77, fetchedSha256: "f".repeat(64) } }),
    allowedOrigins: ["https://cdn.vistaire.test"],
    cdnBaseUrl: CDN_BASE_URL
  });
  assert.equal(mismatched.networkReportOk, false);
  assert.equal(mismatched.readyToFinalize, false);
  assert.match(mismatched.blockReason, /network/i);
});

test("owner CDN workflow requires the configured immutable CDN namespace", () => {
  const bad = manifest();
  bad.variants.mobile.url = "https://cdn.vistaire.test/other/maison-elyse/main/homard-bisque/v1/mobile/x.glb";

  const state = cdnModel.buildCdnWorkflowState({
    identity: IDENTITY,
    manifest: bad,
    allowedOrigins: ["https://cdn.vistaire.test"],
    cdnBaseUrl: CDN_BASE_URL
  });

  const mobile = state.variants.find((variant) => variant.variant === "mobile");
  assert.equal(mobile.urlSafe, false);
  assert.match(mobile.warning, /must start/i);
  assert.equal(state.readyToFinalize, false);
});

test("owner CDN workflow blocks stale upload plans even when network report passes", () => {
  const stalePlan = uploadPlan();
  stalePlan.uploads.find((entry) => entry.variant === "web").sha256 = "f".repeat(64);

  const state = cdnModel.buildCdnWorkflowState({
    identity: IDENTITY,
    manifest: manifest(),
    uploadPlan: stalePlan,
    networkReport: networkReport(),
    allowedOrigins: ["https://cdn.vistaire.test"],
    cdnBaseUrl: CDN_BASE_URL
  });

  assert.equal(state.uploadPlanGenerated, true);
  assert.equal(state.uploadPlanCurrent, false);
  assert.equal(state.networkReportOk, true);
  assert.equal(state.readyToFinalize, false);
  assert.match(state.blockReason, /stale|manifest/i);
  assert.equal(state.variants.find((variant) => variant.variant === "web").planMatchesManifest, false);
});

test("owner CDN workflow blocks finalize when the manifest is missing", () => {
  const state = cdnModel.buildCdnWorkflowState({
    identity: IDENTITY,
    manifest: null,
    uploadPlan: uploadPlan(),
    networkReport: networkReport(),
    allowedOrigins: ["https://cdn.vistaire.test"],
    cdnBaseUrl: CDN_BASE_URL
  });

  assert.equal(state.uploadPlanCurrent, false);
  assert.equal(state.readyToFinalize, false);
  assert.equal(
    state.variants.every((variant) => variant.uploadStatus === "missing_manifest"),
    true
  );
});

test("owner status mapping blocks ready-to-finalize until CDN network validation passes", () => {
  assert.equal(
    pipelineModel.resolvePipelineStatus({
      manifest: manifest(),
      requiresCdnValidation: true,
      hasPassingCdnValidation: false
    }).id,
    "needs_review"
  );
  assert.equal(
    pipelineModel.resolvePipelineStatus({
      manifest: manifest(),
      requiresCdnValidation: true,
      hasPassingCdnValidation: true
    }).id,
    "ready_to_finalize"
  );
});

test("owner CDN API and UI are auth-gated and do not fake uploads", () => {
  const apiPath = join(process.cwd(), "app", "api", "owner", "3d-ar", "cdn", "route.ts");
  const componentPath = join(process.cwd(), "components", "owner", "Owner3dCdnWorkflowPanel.tsx");

  for (const path of [apiPath, componentPath]) {
    assert.equal(existsSync(path), true, path);
  }

  const api = readFileSync(apiPath, "utf8");
  assert.match(api, /requireVistaireOwnerApi\(\)/);
  assert.match(api, /requireSameOriginOwnerMutation/);
  assert.match(api, /buildCdnWorkflowFromFiles/);
  assert.doesNotMatch(api, /child_process|spawn\(|exec\(|public\/models.*write/i);

  const component = readFileSync(componentPath, "utf8");
  for (const text of [
    "Upload plan",
    "Validate network",
    "Network validation report",
    "web",
    "mobile",
    "arLite",
    "iosUsdz",
    "poster",
    "storage not configured"
  ]) {
    assert.match(component, new RegExp(text));
  }
  assert.doesNotMatch(component, /model-viewer|@google\/model-viewer|preload/i);
});
