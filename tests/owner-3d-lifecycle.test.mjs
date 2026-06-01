import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const lifecycleModel = await import("../lib/owner/threeDLifecycleModel.ts");
const cdnModel = await import("../lib/owner/threeDCdnWorkflow.ts");
const reviewModel = await import("../lib/owner/threeDVisualReviewModel.ts");

const IDENTITY = {
  restaurantSlug: "maison-elyse",
  menuSlug: "main",
  dishSlug: "homard-bisque",
  version: "v1"
};

const CDN_BASE_URL = "https://cdn.vistaire.test/vistaire";
const HASHES = {
  source: "0".repeat(64),
  web: "1".repeat(64),
  mobile: "2".repeat(64),
  arLite: "3".repeat(64),
  iosUsdz: "4".repeat(64),
  poster: "5".repeat(64)
};

function deviceQaBlock() {
  return {
    required: true,
    iphoneQuickLook: {
      required: true,
      status: "passed",
      device: "iPhone 15 Pro",
      os: "iOS 18.5",
      testedBy: "Owner",
      testedAt: "2026-05-31T12:00:00.000Z",
      evidence: {
        path: "assets/3d/reports/maison-elyse/main/homard-bisque/v1/device-qa/iphone.md",
        sha256: "a".repeat(64),
        bytes: 512
      }
    },
    androidSceneViewer: {
      required: true,
      status: "passed",
      device: "Pixel 8",
      os: "Android 15",
      testedBy: "Owner",
      testedAt: "2026-05-31T12:05:00.000Z",
      evidence: {
        path: "assets/3d/reports/maison-elyse/main/homard-bisque/v1/device-qa/android.md",
        sha256: "b".repeat(64),
        bytes: 640
      }
    }
  };
}

function visualArtifacts() {
  return Object.fromEntries(
    ["web", "mobile", "arLite"].map((variant) => [
      variant,
      {
        before: `assets/3d/reports/maison-elyse/main/homard-bisque/v1/visual/${variant}/before/front.png`,
        after: `assets/3d/reports/maison-elyse/main/homard-bisque/v1/visual/${variant}/after/front.png`,
        diff: `assets/3d/reports/maison-elyse/main/homard-bisque/v1/visual/${variant}/diff/front.png`
      }
    ])
  );
}

function manifest(overrides = {}) {
  const qa = deviceQaBlock();
  return {
    schemaVersion: 2,
    restaurantSlug: IDENTITY.restaurantSlug,
    menuSlug: IDENTITY.menuSlug,
    dishSlug: IDENTITY.dishSlug,
    activeVersion: IDENTITY.version,
    status: "review",
    validationStatus: "unvalidated",
    sourceAnalysis: { sha256: HASHES.source },
    visualQuality: {
      status: "passed",
      report: "assets/3d/reports/maison-elyse/main/homard-bisque/v1/visual-report.json",
      reportArtifacts: visualArtifacts(),
      manualReview: {
        required: true,
        status: "approved",
        approvalType: "human",
        approvedBy: "Owner",
        approvedAt: "2026-05-31T11:00:00.000Z"
      },
      realDeviceQa: qa
    },
    quality: {
      manualVisualApprovalRequired: true,
      manualVisualApproved: true,
      approvedBy: "Owner",
      manualReview: {
        status: "approved",
        approvalType: "human",
        approvedBy: "Owner",
        approvedAt: "2026-05-31T11:00:00.000Z"
      },
      realDeviceQa: qa
    },
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
        sha256: HASHES.arLite,
        optimizationMethod: "meshopt",
        optimizer: { command: "gltf-transform optimize homard-bisque.glb" },
        extensionsRequired: [],
        externalUris: []
      },
      iosUsdz: {
        url: "https://cdn.vistaire.test/vistaire/maison-elyse/main/homard-bisque/v1/ios/homard-bisque.usdz",
        bytes: 1800,
        sha256: HASHES.iosUsdz,
        productionFaithful: true,
        proxy: false
      },
      poster: {
        url: "https://cdn.vistaire.test/vistaire/maison-elyse/main/homard-bisque/v1/poster/homard-bisque.webp",
        bytes: 400,
        sha256: HASHES.poster,
        placeholder: false,
        productionPoster: true
      }
    },
    validation: { warnings: [], fails: [] },
    lifecycle: {
      phase: "review",
      generatedBy: "scripts/3d/optimize-dish.mjs",
      generatedAt: "2026-05-31T10:00:00.000Z"
    },
    rollback: { previousVersion: null, fromVersion: null, toVersion: null },
    generatedAt: "2026-05-31T10:00:00.000Z",
    approvedAt: null,
    publishedAt: null,
    ...overrides
  };
}

function uploadPlan(inputManifest) {
  return {
    ok: true,
    name: "3d:prepare-cdn-upload",
    generatedAt: "2026-05-31T12:10:00.000Z",
    uploads: cdnModel.CDN_VARIANTS.map((variant) => ({
      variant,
      localPath: `assets/3d/work/maison-elyse/main/homard-bisque/v1/${variant}/${variant}`,
      url: inputManifest.variants[variant].url,
      bytes: inputManifest.variants[variant].bytes,
      sha256: inputManifest.variants[variant].sha256,
      contentType:
        variant === "iosUsdz"
          ? "model/vnd.usdz+zip"
          : variant === "poster"
            ? "image/webp"
            : "model/gltf-binary"
    }))
  };
}

function networkReport(inputManifest, overrides = {}) {
  return {
    ok: true,
    name: "network-headers",
    metrics: {
      assets: cdnModel.CDN_VARIANTS.map((variant) => ({
        role: variant,
        url: inputManifest.variants[variant].url,
        status: 200,
        getStatus: 200,
        contentType:
          variant === "iosUsdz"
            ? "model/vnd.usdz+zip"
            : variant === "poster"
              ? "image/webp"
              : "model/gltf-binary",
        contentDisposition: variant === "iosUsdz" ? "inline" : "",
        cacheControl: "public, max-age=31536000, immutable",
        accessControlAllowOrigin: variant === "iosUsdz" ? "" : "*",
        contentLength: inputManifest.variants[variant].bytes,
        fetchedBytes: inputManifest.variants[variant].bytes,
        fetchedSha256: inputManifest.variants[variant].sha256,
        ...(overrides[variant] ?? {})
      }))
    }
  };
}

function lifecycleState(inputManifest, networkOverrides = {}) {
  const cdn = cdnModel.buildCdnWorkflowState({
    identity: IDENTITY,
    manifest: inputManifest,
    uploadPlan: uploadPlan(inputManifest),
    networkReport: networkReport(inputManifest, networkOverrides),
    allowedOrigins: ["https://cdn.vistaire.test"],
    cdnBaseUrl: CDN_BASE_URL
  });

  return lifecycleModel.buildOwner3dLifecycleState({
    identity: IDENTITY,
    manifest: inputManifest,
    source: "manifest",
    manifestPath: "public/models/restaurants/maison-elyse/main/homard-bisque/v1/manifest.json",
    reportDirectory: "assets/3d/reports/maison-elyse/main/homard-bisque/v1",
    visualReport: { status: "passed" },
    cdn
  });
}

test("owner lifecycle disables finalize when a required gate is missing", () => {
  const state = lifecycleState(
    manifest({
      quality: {
        ...manifest().quality,
        manualReview: { status: "pending" }
      }
    })
  );

  assert.equal(state.canFinalize, false);
  assert.match(state.finalizeDisabledReason, /Human approval|approval/i);
  assert.equal(
    state.gates.find((gate) => gate.id === "human_approval").status,
    "missing"
  );
});

test("owner lifecycle blocks every final production gate independently", () => {
  const cases = [
    {
      gate: "visual_report",
      mutate(input) {
        input.visualQuality.reportArtifacts = {};
      }
    },
    {
      gate: "iphone_qa",
      mutate(input) {
        input.quality.realDeviceQa.iphoneQuickLook.evidence = null;
        input.visualQuality.realDeviceQa.iphoneQuickLook.evidence = null;
      }
    },
    {
      gate: "android_qa",
      mutate(input) {
        input.quality.realDeviceQa.androidSceneViewer.status = "failed";
        input.visualQuality.realDeviceQa.androidSceneViewer.status = "failed";
      }
    },
    {
      gate: "no_warnings",
      mutate(input) {
        input.validation.warnings = ["Poster should be rechecked."];
      }
    },
    {
      gate: "production_faithful",
      mutate(input) {
        input.variants.iosUsdz.productionFaithful = false;
      }
    },
    {
      gate: "poster_production",
      mutate(input) {
        input.variants.poster.placeholder = true;
      }
    },
    {
      gate: "arlite_not_copy",
      mutate(input) {
        input.variants.arLite.sha256 = input.variants.web.sha256;
      }
    }
  ];

  for (const item of cases) {
    const input = JSON.parse(JSON.stringify(manifest()));
    item.mutate(input);
    const state = lifecycleState(input);
    assert.equal(state.canFinalize, false, item.gate);
    assert.notEqual(
      state.gates.find((gate) => gate.id === item.gate).status,
      "passed",
      item.gate
    );
  }

  const cdnMismatch = lifecycleState(manifest(), {
    web: { fetchedBytes: 11, fetchedSha256: "c".repeat(64) }
  });
  assert.equal(cdnMismatch.canFinalize, false);
  assert.notEqual(
    cdnMismatch.gates.find((gate) => gate.id === "cdn_or_local").status,
    "passed"
  );
});

test("owner lifecycle allows finalize only after all final gates pass", () => {
  const state = lifecycleState(manifest());

  assert.equal(state.canFinalize, true);
  assert.equal(state.effects.finalizePublishes, false);
  assert.match(state.finalizationCommand, /3d:finalize-manifest/);
  assert.equal(
    lifecycleModel.validateLifecycleConfirmation({
      action: "finalize",
      state,
      typed: state.confirmations.finalize
    }).ok,
    true
  );
});

test("owner lifecycle disables publish unless the manifest is finalized and approved", () => {
  const reviewState = lifecycleState(manifest());
  assert.equal(reviewState.canPublish, false);
  assert.match(reviewState.publishDisabledReason, /status approved/i);

  const approvedState = lifecycleState(
    manifest({
      status: "approved",
      validationStatus: "passed",
      approvedAt: "2026-05-31T12:15:00.000Z",
      lifecycle: {
        phase: "approved",
        generatedAt: "2026-05-31T10:00:00.000Z",
        finalizedAt: "2026-05-31T12:15:00.000Z"
      }
    })
  );

  assert.equal(approvedState.canPublish, true);
  assert.equal(approvedState.effects.publishWritesActiveVersion, true);
  assert.equal(approvedState.effects.publishRefreshesRestaurantManifest, true);
  assert.equal(approvedState.effects.publishDeletesPrevious, false);
  assert.equal(
    lifecycleModel.validateLifecycleConfirmation({
      action: "publish",
      state: approvedState,
      typed: approvedState.confirmations.publish
    }).ok,
    true
  );
});

test("owner lifecycle rollback requires a previous target and never deletes versions", () => {
  const state = lifecycleState(
    manifest({
      status: "published",
      validationStatus: "passed",
      approvedAt: "2026-05-31T12:15:00.000Z",
      publishedAt: "2026-05-31T12:30:00.000Z",
      lifecycle: {
        phase: "published",
        generatedAt: "2026-05-31T10:00:00.000Z",
        finalizedAt: "2026-05-31T12:15:00.000Z",
        publishedAt: "2026-05-31T12:30:00.000Z",
        publishedBy: "Owner"
      }
    })
  );

  assert.equal(state.effects.rollbackDeletesPrevious, false);
  assert.equal(state.effects.rollbackCreatesEvent, true);
  assert.equal(
    lifecycleModel.validateLifecycleConfirmation({
      action: "rollback",
      state,
      typed: lifecycleModel.lifecycleRollbackConfirmation(IDENTITY, "v1"),
      targetVersion: "v1"
    }).ok,
    false
  );

  const event = lifecycleModel.createOwner3dLifecycleAuditEvent({
    identity: IDENTITY,
    action: "rollback_requested",
    actorLabel: "owner@example.com",
    oldState: "v2",
    newState: "v1",
    timestamp: "2026-05-31T12:40:00.000Z",
    evidenceLinks: [{ label: "Manifest", path: "public/models/restaurants/maison-elyse/main/homard-bisque/v1/manifest.json" }]
  });

  assert.equal(event.action, "rollback_requested");
  assert.equal(event.actor.label, "owner@example.com");
  assert.equal(event.oldState, "v2");
  assert.equal(event.newState, "v1");
  assert.equal(event.evidenceLinks.length, 1);
});

test("owner lifecycle audit timeline contains actor state transitions and evidence", () => {
  const state = lifecycleState(
    manifest({
      status: "approved",
      validationStatus: "passed",
      approvedAt: "2026-05-31T12:15:00.000Z",
      lifecycle: {
        phase: "approved",
        generatedBy: "scripts/3d/optimize-dish.mjs",
        generatedAt: "2026-05-31T10:00:00.000Z",
        finalizedAt: "2026-05-31T12:15:00.000Z"
      }
    })
  );

  const finalized = state.auditEvents.find((event) => event.action === "finalized");
  assert.ok(finalized);
  assert.equal(finalized.oldState, "review");
  assert.equal(finalized.newState, "approved");
  assert.equal(finalized.persisted, false);
  assert.ok(finalized.evidenceLinks.some((link) => link.path?.includes("manifest.json")));
});

test("owner lifecycle UI exists without model preloads or request-side process execution", () => {
  const componentPath = join(process.cwd(), "components", "owner", "Owner3dLifecyclePanel.tsx");
  const pipelinePath = join(process.cwd(), "components", "owner", "Owner3dArPipeline.tsx");
  const modelPath = join(process.cwd(), "lib", "owner", "threeDLifecycleModel.ts");
  const storePath = join(process.cwd(), "lib", "owner", "threeDLifecycleEventsStore.ts");
  const apiPath = join(process.cwd(), "app", "api", "owner", "3d-ar", "lifecycle", "route.ts");

  for (const path of [componentPath, pipelinePath, modelPath, storePath, apiPath]) {
    assert.equal(existsSync(path), true, path);
  }

  const component = readFileSync(componentPath, "utf8");
  for (const text of ["Finalize panel", "Publish panel", "Rollback panel", "Audit timeline"]) {
    assert.match(component, new RegExp(text));
  }
  assert.doesNotMatch(component, /model-viewer|@google\/model-viewer|ios-src|preload/i);
  assert.doesNotMatch(component, /child_process|spawn\(|exec\(/i);

  const pipeline = readFileSync(pipelinePath, "utf8");
  assert.match(pipeline, /Owner3dLifecyclePanel/);

  const api = readFileSync(apiPath, "utf8");
  assert.match(api, /requireVistaireOwnerApi\(\)/);
  assert.match(api, /requireSameOriginOwnerMutation/);
  assert.match(api, /publish_requested/);
  assert.match(api, /rollback_requested/);
  assert.doesNotMatch(api, /child_process|spawn\(|exec\(/i);
});

test("visual review decisions still cannot finalize or publish accidentally", () => {
  const state = reviewModel.buildVisualReviewState({
    visualReport: {
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
      source: { path: "assets/3d/source/maison-elyse/main/homard-bisque/v1/source.glb" },
      candidate: { path: "assets/3d/work/maison-elyse/main/homard-bisque/v1/mobile/homard-bisque-mobile.glb" },
      angleReports: [
        {
          variant: "mobile",
          angle: "front",
          status: "passed",
          before: "assets/3d/reports/maison-elyse/main/homard-bisque/v1/visual/mobile/before/front.png",
          after: "assets/3d/reports/maison-elyse/main/homard-bisque/v1/visual/mobile/after/front.png",
          diff: "assets/3d/reports/maison-elyse/main/homard-bisque/v1/visual/mobile/diff/front.png"
        }
      ]
    },
    candidateReport: { selectedCandidate: "mobile-balanced" },
    manifest: null,
    identity: IDENTITY
  });

  const decision = reviewModel.validateVisualReviewAction(
    { action: "reject", note: "Texture blur visible on the sauce." },
    state
  );

  assert.equal(decision.ok, true);
  assert.equal(decision.finalizesOrPublishes, false);
});
