import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const deviceQaModel = await import("../lib/owner/threeDDeviceQaModel.ts");

const IDENTITY = {
  restaurantSlug: "maison-elyse",
  menuSlug: "main",
  dishSlug: "homard-bisque",
  version: "v1"
};

const VALID_MANIFEST = {
  variants: {
    iosUsdz: {
      url: "/models/restaurants/maison-elyse/main/homard-bisque/v1/ios/homard-bisque.usdz"
    },
    arLite: {
      url: "/models/restaurants/maison-elyse/main/homard-bisque/v1/ar-lite/homard-bisque-ar-lite.glb"
    }
  },
  quality: {
    realDeviceQa: {
      iphoneQuickLook: {
        status: "not-tested"
      },
      androidSceneViewer: {
        status: "not-tested"
      }
    }
  }
};

const VALID_EVIDENCE = {
  originalName: "iphone-quick-look.md",
  mimeType: "text/markdown",
  bytes: Buffer.from("# Evidence\nQuick Look opened on real device.\n")
};

test("owner Device QA defaults to not-tested and blocks publish readiness", () => {
  const state = deviceQaModel.buildDeviceQaState({
    identity: IDENTITY,
    manifest: null
  });

  assert.deepEqual(
    state.targets.map((target) => [target.target, target.status]),
    [
      ["iphoneQuickLook", "not-tested"],
      ["androidSceneViewer", "not-tested"]
    ]
  );
  assert.equal(state.canPublish, false);
  assert.match(state.publishBlockReason, /iPhone Quick Look/i);
});

test("owner Device QA passes publish readiness only when both real devices passed", () => {
  const state = deviceQaModel.buildDeviceQaState({
    identity: IDENTITY,
    manifest: {
      ...VALID_MANIFEST,
      quality: {
        realDeviceQa: {
          iphoneQuickLook: {
            status: "passed",
            evidence: { sha256: "a".repeat(64), bytes: 512 }
          },
          androidSceneViewer: {
            status: "passed",
            evidence: { sha256: "b".repeat(64), bytes: 640 }
          }
        }
      }
    }
  });

  assert.equal(state.canPublish, true);
  assert.equal(state.publishBlockReason, "");
});

test("owner Device QA URL safety blocks unstable or wrong-platform assets", () => {
  assert.equal(
    deviceQaModel.sanitizeDeviceQaAssetUrl(
      "/models/restaurants/maison/main/dish/v1/ios/dish.usdz",
      "iphoneQuickLook"
    ).ok,
    true
  );
  assert.equal(
    deviceQaModel.sanitizeDeviceQaAssetUrl(
      "/models/restaurants/maison/main/dish/v1/ar-lite/dish.glb",
      "androidSceneViewer"
    ).ok,
    true
  );
  assert.equal(
    deviceQaModel.sanitizeDeviceQaAssetUrl(
      "https://cdn.vistaire.test/models/restaurants/maison/main/dish/v1/ios/dish.usdz",
      "iphoneQuickLook",
      { allowedOrigins: ["https://cdn.vistaire.test"] }
    ).ok,
    true
  );

  for (const [target, url] of [
    ["iphoneQuickLook", "/models/restaurants/maison/main/dish/v1/ios/dish.usdz?v=1"],
    ["iphoneQuickLook", "/models/restaurants/maison/main/dish/v1/web/dish.glb"],
    ["iphoneQuickLook", "/api/owner/3d-ar/review-artifact?path=x.usdz"],
    ["androidSceneViewer", "/models/restaurants/maison/main/dish/v1/ios/dish.usdz"],
    ["androidSceneViewer", "https://evil.test/model.glb"],
    ["androidSceneViewer", "javascript:alert(1)"]
  ]) {
    assert.equal(
      deviceQaModel.sanitizeDeviceQaAssetUrl(url, target).ok,
      false,
      `${target} ${url}`
    );
  }
});

test("owner Device QA pass requires uploaded evidence and required device fields", () => {
  const state = deviceQaModel.buildDeviceQaState({
    identity: IDENTITY,
    manifest: VALID_MANIFEST
  });

  assert.equal(
    deviceQaModel.validateDeviceQaSubmission(
      {
        target: "iphoneQuickLook",
        status: "passed",
        deviceName: "iPhone 15 Pro",
        osVersion: "iOS 18.5",
        browserVersion: "Safari 18",
        network: "Wi-Fi restaurant",
        testedBy: "Marc",
        testedAt: "2026-05-31T12:00:00.000Z",
        notes: "Scale, grounding, orientation and texture passed."
      },
      state
    ).ok,
    false
  );

  assert.equal(
    deviceQaModel.validateDeviceQaSubmission(
      {
        target: "iphoneQuickLook",
        status: "passed",
        deviceName: "iPhone 15 Pro",
        osVersion: "iOS 18.5",
        browserVersion: "Safari 18",
        network: "Wi-Fi restaurant",
        testedBy: "Marc",
        testedAt: "2026-05-31T12:00:00.000Z",
        notes: "Scale, grounding, orientation and texture passed.",
        evidence: VALID_EVIDENCE
      },
      state
    ).ok,
    true
  );

  assert.equal(
    deviceQaModel.validateDeviceQaSubmission(
      {
        target: "androidSceneViewer",
        status: "passed",
        deviceName: "Pixel 8",
        osVersion: "Android 15",
        browserVersion: "Chrome 125",
        network: "Wi-Fi restaurant",
        testedBy: "Marc",
        testedAt: "2026-05-31T12:00:00.000Z",
        notes: "Scale, grounding, orientation and texture passed.",
        evidence: VALID_EVIDENCE
      },
      state
    ).ok,
    false
  );

  assert.equal(
    deviceQaModel.validateDeviceQaSubmission(
      {
        target: "androidSceneViewer",
        status: "passed",
        deviceName: "Pixel 8",
        osVersion: "Android 15",
        browserVersion: "Chrome 125",
        arcoreStatus: "ARCore installed and supported",
        network: "Wi-Fi restaurant",
        testedBy: "Marc",
        testedAt: "2026-05-31T12:00:00.000Z",
        notes: "Scale, grounding, orientation and texture passed.",
        evidence: VALID_EVIDENCE
      },
      state
    ).ok,
    true
  );
});

test("owner Device QA fail requires and records a note", () => {
  const state = deviceQaModel.buildDeviceQaState({
    identity: IDENTITY,
    manifest: VALID_MANIFEST
  });

  assert.equal(
    deviceQaModel.validateDeviceQaSubmission(
      {
        target: "androidSceneViewer",
        status: "failed",
        notes: ""
      },
      state
    ).ok,
    false
  );

  const result = deviceQaModel.validateDeviceQaSubmission(
    {
      target: "androidSceneViewer",
      status: "failed",
      notes: "Scene Viewer opened, but model floated above the table."
    },
    state
  );
  assert.equal(result.ok, true);
  assert.equal(result.record.status, "failed");
  assert.match(result.record.notes, /floated/);
});

test("owner Device QA UI and API routes exist without early model fetching", () => {
  const componentPath = join(process.cwd(), "components", "owner", "Owner3dDeviceQaPanel.tsx");
  const apiPath = join(process.cwd(), "app", "api", "owner", "3d-ar", "device-qa", "route.ts");
  const migrationPath = join(
    process.cwd(),
    "supabase",
    "migrations",
    "0004_owner_3d_pipeline_jobs.sql"
  );

  for (const path of [componentPath, apiPath, migrationPath]) {
    assert.equal(existsSync(path), true, path);
  }

  const component = readFileSync(componentPath, "utf8");
  for (const text of [
    "iPhone Quick Look",
    "Android Scene Viewer",
    "Safari",
    "Chrome",
    "ARCore",
    "Evidence upload",
    "Pass",
    "Fail"
  ]) {
    assert.match(component, new RegExp(text));
  }
  assert.doesNotMatch(component, /model-viewer|@google\/model-viewer|prefetch|preload/i);

  const api = readFileSync(apiPath, "utf8");
  assert.match(api, /requireVistaireOwnerApi\(\)/);
  assert.match(api, /requireSameOriginOwnerMutation/);
  assert.match(api, /validateDeviceQaSubmission/);
  assert.match(api, /superseded_at: supersededAt/);
  assert.match(api, /Existing Device QA result could not be superseded/);
  assert.match(api, /update\(\{ superseded_at: null \}\)/);
  assert.ok(
    api.indexOf("superseded_at: supersededAt") < api.indexOf(".from(DEVICE_QA_TABLE)\n    .insert"),
    "active Device QA rows should be superseded before inserting a replacement"
  );
  assert.doesNotMatch(api, /child_process|spawn\(|exec\(|public\/models/);

  const migration = readFileSync(migrationPath, "utf8");
  assert.match(migration, /owner_3d_device_qa/);
  assert.match(migration, /restaurant_slug text not null/);
  assert.match(migration, /evidence_storage_path/);
  assert.match(migration, /asset_url/);
  assert.match(migration, /owner_3d_device_qa_active_identity_target_key/);
});
