import assert from "node:assert/strict";
import test from "node:test";

import {
  PRODUCTION_3D_BUDGETS,
  classifyBudget
} from "../scripts/3d/shared/budgets.mjs";
import {
  summarizeRestaurantManifest,
  validateDishManifest,
  validateRestaurantManifest
} from "../scripts/3d/shared/manifest-schema.mjs";

const stableIso = "2026-05-24T00:00:00.000Z";
const strictPromise =
  "visually indistinguishable under deterministic multi-angle mobile dining-distance review within strict thresholds";

function strictVisualQuality(overrides = {}) {
  const angles = ["front", "left", "right", "top"];
  return {
    status: "passed",
    score: 0.991,
    promise: strictPromise,
    method: "deterministic-render-comparison",
    report: "assets/3d/reports/maison-elyse/main/homard-bisque/v1/visual-report.md",
    reportArtifacts: {
      web: {
        before: "renders/web/front-before.png",
        after: "renders/web/front-after.png",
        diff: "renders/web/front-diff.png"
      },
      mobile: {
        before: "renders/mobile/front-before.png",
        after: "renders/mobile/front-after.png",
        diff: "renders/mobile/front-diff.png"
      },
      arLite: {
        before: "renders/ar-lite/front-before.png",
        after: "renders/ar-lite/front-after.png",
        diff: "renders/ar-lite/front-diff.png"
      }
    },
    angleReports: ["web", "mobile", "arLite"].flatMap((variant) =>
      angles.map((angle) => ({
        variant,
        angle,
        status: "passed",
        before: `renders/${variant}/${angle}-before.png`,
        after: `renders/${variant}/${angle}-after.png`,
        diff: `renders/${variant}/${angle}-diff.png`,
        ssim: 0.992,
        perceptualScore: 0.991,
        maxDiffRatio: 0.001
      }))
    ),
    meanSsim: 0.992,
    perceptualScore: 0.991,
    maxDiffRatio: 0.001,
    maxSilhouetteDiff: 0.001,
    maxColorDelta: 0.01,
    maxTextureBlurDelta: 0.01,
    maxMaterialDrift: 0.01,
    maxScaleDriftMeters: 0.001,
    maxOriginDriftMeters: 0.001,
    lowPolyVisibilityScore: 0.001,
    appetitePreservationScore: 0.99,
    thresholds: {
      meanSsim: 0.985,
      perceptualScore: 0.98,
      maxDiffRatio: 0.004,
      maxSilhouetteDiff: 0.002,
      maxColorDelta: 0.015,
      maxTextureBlurDelta: 0.02,
      maxMaterialDrift: 0.02,
      maxScaleDriftMeters: 0.003,
      maxOriginDriftMeters: 0.003,
      maxLowPolyVisibility: 0.01,
      minAppetitePreservation: 0.98
    },
    checks: {
      textureSharpness: { status: "passed" },
      silhouette: { status: "passed" },
      color: { status: "passed" },
      material: { status: "passed" },
      scaleOrigin: { status: "passed" },
      lowPoly: { status: "passed" },
      appetite: { status: "passed" }
    },
    manualReview: {
      required: true,
      status: "approved",
      approvalType: "human",
      approvedBy: "QA Bot",
      approvedAt: stableIso
    },
    ...overrides
  };
}

function validDishManifest(overrides = {}) {
  return {
    schemaVersion: 1,
    restaurantSlug: "maison-elyse",
    menuSlug: "demo",
    dishSlug: "maison-elyse-n1",
    activeVersion: "v1",
    status: "review",
    validationStatus: "passed",
    variants: {
      web: {
        url: "/models/restaurants/maison-elyse/demo/maison-elyse-n1/v1/web/maison-elyse-n1.glb",
        bytes: 86_380,
        sha256: "a".repeat(64),
        validationStatus: "passed"
      },
      mobile: {
        url: "/models/restaurants/maison-elyse/demo/maison-elyse-n1/v1/mobile/maison-elyse-n1.glb",
        bytes: 86_380,
        sha256: "b".repeat(64),
        validationStatus: "passed"
      },
      arLite: {
        url: "/models/restaurants/maison-elyse/demo/maison-elyse-n1/v1/ar-lite/maison-elyse-n1.glb",
        bytes: 86_380,
        sha256: "c".repeat(64),
        validationStatus: "passed"
      },
      iosUsdz: {
        url: "/models/restaurants/maison-elyse/demo/maison-elyse-n1/v1/ios/maison-elyse-n1.usdz",
        bytes: 208_984,
        sha256: "d".repeat(64),
        validationStatus: "passed"
      },
      poster: {
        url: "/models/restaurants/maison-elyse/demo/maison-elyse-n1/v1/poster/maison-elyse-n1.webp",
        bytes: 112_000,
        sha256: "e".repeat(64),
        validationStatus: "passed"
      }
    },
    bytes: {
      total: 580_124
    },
    validation: {
      warnings: [],
      fails: []
    },
    generatedAt: stableIso,
    approvedAt: null,
    publishedAt: null,
    ...overrides
  };
}

test("production dish manifest rejects schema v1 passed manifests without strict visual identity evidence", () => {
  const result = validateDishManifest(validDishManifest(), { context: "production" });

  assert.equal(result.ok, false);
  assert.match(result.fails.join("\n"), /schemaVersion.*2.*passed.*approved.*published/i);
});

test("production dish manifest accepts the schema v2 contract with physical scale and quality gates", () => {
  const result = validateDishManifest(
    {
      schemaVersion: 2,
      kind: "vistaire.dish-3d-manifest",
      restaurantSlug: "maison-elyse",
      menuSlug: "main",
      dishSlug: "homard-bisque",
      activeVersion: "v1",
      status: "approved",
      validationStatus: "passed",
      generatedAt: stableIso,
      approvedAt: stableIso,
      publishedAt: null,
      variants: {
        poster: {
          url: "/models/restaurants/maison-elyse/main/homard-bisque/v1/poster.webp",
          bytes: 120_000,
          sha256: "a".repeat(64),
          width: 1200,
          height: 900,
          placeholder: false,
          productionPoster: true
        },
        web: {
          url: "/models/restaurants/maison-elyse/main/homard-bisque/v1/web.glb",
          bytes: 5_800_000,
          sha256: "b".repeat(64),
          triangleCount: 140_000,
          vertexCount: 90_000,
          materialCount: 6,
          textureCount: 5,
          maxTextureSize: 2048,
          extensionsUsed: ["EXT_meshopt_compression"],
          extensionsRequired: ["EXT_meshopt_compression"]
        },
        mobile: {
          url: "/models/restaurants/maison-elyse/main/homard-bisque/v1/mobile.glb",
          bytes: 2_900_000,
          sha256: "c".repeat(64),
          triangleCount: 80_000,
          vertexCount: 52_000,
          materialCount: 5,
          textureCount: 4,
          maxTextureSize: 1024,
          extensionsUsed: [],
          extensionsRequired: []
        },
        arLite: {
          url: "/models/restaurants/maison-elyse/main/homard-bisque/v1/ar-lite.glb",
          bytes: 7_600_000,
          sha256: "d".repeat(64),
          triangleCount: 70_000,
          vertexCount: 48_000,
          materialCount: 5,
          textureCount: 4,
          maxTextureSize: 1024,
          extensionsUsed: [],
          extensionsRequired: [],
          optimizationMethod: "mesh-simplification",
          arPlacement: "floor",
          arScale: "fixed"
        },
        iosUsdz: {
          url: "/models/restaurants/maison-elyse/main/homard-bisque/v1/ios.usdz",
          bytes: 3_600_000,
          sha256: "e".repeat(64),
          usdLayerCount: 1,
          textureCount: 4,
          productionQuickLook: true,
          productionFaithful: true
        }
      },
      physicalScaleMeters: {
        width: 0.22,
        height: 0.08,
        depth: 0.22
      },
      bounds: {
        centeredXZ: true,
        groundedY: true,
        min: [-0.11, 0, -0.11],
        max: [0.11, 0.08, 0.11]
      },
      budgets: {
        profile: "signature",
        publicTotalBytes: {
          target: 14_000_000,
          warning: 24_000_000,
          fail: 33_554_432
        }
      },
      validation: {
        warnings: [],
        fails: [],
        reports: []
      },
      quality: {
        manualVisualApprovalRequired: true,
        manualVisualApproved: true,
        approvedBy: "QA Bot",
        notes: []
      },
      sourceAnalysis: {
        bytes: 29_000_000,
        sha256: "f".repeat(64),
        meshes: 4,
        primitives: 6,
        triangles: 140_000,
        vertices: 90_000,
        materials: 6,
        textures: 5,
        images: 5,
        externalUris: [],
        classification: "signature"
      },
      visualQuality: strictVisualQuality(),
      lifecycle: {
        phase: "approved",
        generatedBy: "scripts/3d/optimize-dish.mjs",
        generatedAt: stableIso
      },
      rollback: {
        previousVersion: null,
        fromVersion: null,
        toVersion: null
      }
    },
    { context: "production" }
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.fails, []);
  assert.equal(result.metrics.validationStatus, "passed");
  assert.equal(result.metrics.publicTotalBytes, 20_020_000);
});

test("production schema v2 requires source, visual, lifecycle, and rollback evidence", () => {
  const manifest = {
    schemaVersion: 2,
    kind: "vistaire.dish-3d-manifest",
    restaurantSlug: "maison-elyse",
    menuSlug: "main",
    dishSlug: "homard-bisque",
    activeVersion: "v1",
    status: "approved",
    validationStatus: "passed",
    generatedAt: stableIso,
    approvedAt: stableIso,
    publishedAt: null,
    variants: validDishManifest().variants,
    physicalScaleMeters: { width: 0.22, height: 0.08, depth: 0.22 },
    bounds: {
      centeredXZ: true,
      groundedY: true,
      min: [-0.11, 0, -0.11],
      max: [0.11, 0.08, 0.11]
    },
    budgets: { profile: "simpleDish" },
    validation: { warnings: [], fails: [] },
    quality: {
      manualVisualApprovalRequired: true,
      manualVisualApproved: true
    }
  };

  const result = validateDishManifest(manifest, { context: "production" });

  assert.equal(result.ok, false);
  assert.match(result.fails.join("\n"), /sourceAnalysis/i);
  assert.match(result.fails.join("\n"), /visualQuality/i);
  assert.match(result.fails.join("\n"), /lifecycle/i);
  assert.match(result.fails.join("\n"), /rollback/i);
});

test("production schema v2 rejects structural visualQuality proxies as approved evidence", () => {
  const result = validateDishManifest(
    {
      schemaVersion: 2,
      kind: "vistaire.dish-3d-manifest",
      restaurantSlug: "maison-elyse",
      menuSlug: "main",
      dishSlug: "homard-bisque",
      activeVersion: "v1",
      status: "approved",
      validationStatus: "passed",
      generatedAt: stableIso,
      approvedAt: stableIso,
      publishedAt: null,
      variants: validDishManifest().variants,
      physicalScaleMeters: { width: 0.22, height: 0.08, depth: 0.22 },
      bounds: {
        centeredXZ: true,
        groundedY: true,
        min: [-0.11, 0, -0.11],
        max: [0.11, 0.08, 0.11]
      },
      budgets: { profile: "simpleDish" },
      validation: { warnings: [], fails: [] },
      quality: {
        manualVisualApprovalRequired: true,
        manualVisualApproved: true,
        approvedBy: "QA Bot"
      },
      sourceAnalysis: {
        bytes: 29_000_000,
        sha256: "f".repeat(64),
        meshes: 4,
        primitives: 6,
        triangles: 140_000,
        vertices: 90_000,
        materials: 6,
        textures: 5,
        images: 5,
        externalUris: [],
        classification: "signature"
      },
      visualQuality: {
        status: "passed",
        score: 0.99,
        threshold: 0.85,
        method: "deterministic-structural-render-proxy",
        deterministicViews: ["front", "left", "right", "top", "three-quarter"],
        checks: {
          silhouette: { status: "passed", score: 1 },
          materialCoverage: { status: "passed", score: 1 }
        },
        manualReview: {
          required: true,
          status: "approved",
          approvedBy: "QA Bot",
          approvedAt: stableIso
        }
      },
      lifecycle: {
        phase: "approved",
        generatedBy: "scripts/3d/optimize-dish.mjs",
        generatedAt: stableIso
      },
      rollback: {
        previousVersion: null,
        fromVersion: null,
        toVersion: null
      }
    },
    { context: "production" }
  );

  assert.equal(result.ok, false);
  assert.match(result.fails.join("\n"), /visualQuality.*rendered before\/after\/diff/i);
  assert.match(result.fails.join("\n"), /structural.*proxy/i);
});

test("production schema v2 requires rendered evidence metrics on every angle report", () => {
  const visualQuality = strictVisualQuality({
    angleReports: ["web", "mobile", "arLite"].flatMap((variant) =>
      ["front", "left", "right", "top"].map((angle) => ({ variant, angle }))
    )
  });
  const result = validateDishManifest(
    {
      schemaVersion: 2,
      kind: "vistaire.dish-3d-manifest",
      restaurantSlug: "maison-elyse",
      menuSlug: "main",
      dishSlug: "homard-bisque",
      activeVersion: "v1",
      status: "approved",
      validationStatus: "passed",
      generatedAt: stableIso,
      approvedAt: stableIso,
      publishedAt: null,
      variants: {
        ...validDishManifest().variants,
        poster: {
          ...validDishManifest().variants.poster,
          placeholder: false,
          productionPoster: true
        },
        arLite: {
          ...validDishManifest().variants.arLite,
          optimizationMethod: "mesh-simplification"
        },
        iosUsdz: {
          ...validDishManifest().variants.iosUsdz,
          productionFaithful: true
        }
      },
      physicalScaleMeters: { width: 0.22, height: 0.08, depth: 0.22 },
      bounds: {
        centeredXZ: true,
        groundedY: true,
        min: [-0.11, 0, -0.11],
        max: [0.11, 0.08, 0.11]
      },
      budgets: { profile: "simpleDish" },
      validation: { warnings: [], fails: [] },
      quality: {
        manualVisualApprovalRequired: true,
        manualVisualApproved: true,
        approvedBy: "QA Bot"
      },
      sourceAnalysis: {
        bytes: 29_000_000,
        sha256: "f".repeat(64),
        meshes: 4,
        primitives: 6,
        triangles: 140_000,
        vertices: 90_000,
        materials: 6,
        textures: 5,
        images: 5,
        externalUris: [],
        classification: "signature"
      },
      visualQuality,
      lifecycle: {
        phase: "approved",
        generatedBy: "scripts/3d/optimize-dish.mjs",
        generatedAt: stableIso
      },
      rollback: {
        previousVersion: null,
        fromVersion: null,
        toVersion: null
      }
    },
    { context: "production" }
  );

  assert.equal(result.ok, false);
  assert.match(result.fails.join("\n"), /angleReports.*before/i);
  assert.match(result.fails.join("\n"), /angleReports.*ssim/i);
});

test("production dish manifest fails when required fields are missing", () => {
  const manifest = validDishManifest();
  delete manifest.restaurantSlug;
  delete manifest.variants.web;

  const result = validateDishManifest(manifest, { context: "production" });

  assert.equal(result.ok, false);
  assert.match(result.fails.join("\n"), /restaurantSlug.*required/i);
  assert.match(result.fails.join("\n"), /variants\.web.*required/i);
});

test("production dish manifest rejects unknown lifecycle status", () => {
  const result = validateDishManifest(
    validDishManifest({ status: "client-ready" }),
    { context: "production" }
  );

  assert.equal(result.ok, false);
  assert.match(result.fails.join("\n"), /status.*draft.*review.*approved.*published.*archived/i);
});

test("production dish manifest rejects unknown validation status", () => {
  const result = validateDishManifest(
    validDishManifest({ validationStatus: "approved" }),
    { context: "production" }
  );

  assert.equal(result.ok, false);
  assert.match(result.fails.join("\n"), /validationStatus.*unvalidated.*passed.*warning.*failed/i);
});

test("production dish manifest rejects a declared passed status when validation warnings exist", () => {
  const result = validateDishManifest(
    validDishManifest({
      validationStatus: "passed",
      validation: { warnings: ["visual review pending"], fails: [] }
    }),
    { context: "production" }
  );

  assert.equal(result.ok, false);
  assert.match(result.fails.join("\n"), /validationStatus.*passed.*warning/i);
});

test("draft dish manifest may remain unvalidated before validation has run", () => {
  const result = validateDishManifest(
    validDishManifest({
      status: "draft",
      validationStatus: "unvalidated",
      validation: { warnings: [], fails: [] }
    }),
    { context: "production" }
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.fails, []);
  assert.equal(result.metrics.validationStatus, "unvalidated");
});

test("review dish manifest may record known validation failures before publication", () => {
  const result = validateDishManifest(
    validDishManifest({
      status: "review",
      validationStatus: "failed",
      validation: { warnings: [], fails: ["USDZ geometry requires re-export"] }
    }),
    { context: "production" }
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.fails, []);
  assert.equal(result.metrics.validationStatus, "failed");
});

test("published dish manifest requires lifecycle dates and passed validation", () => {
  const result = validateDishManifest(
    validDishManifest({
      status: "published",
      validationStatus: "warning",
      validation: { warnings: ["visual review pending"], fails: [] }
    }),
    { context: "production" }
  );

  assert.equal(result.ok, false);
  assert.match(result.fails.join("\n"), /approvedAt.*published/i);
  assert.match(result.fails.join("\n"), /publishedAt.*published/i);
  assert.match(result.fails.join("\n"), /validationStatus.*passed/i);
});

test("published dish manifest rejects warnings even when dates and declared validation status pass", () => {
  const result = validateDishManifest(
    validDishManifest({
      status: "published",
      validationStatus: "passed",
      approvedAt: stableIso,
      publishedAt: stableIso,
      validation: { warnings: ["real device QA pending"], fails: [] }
    }),
    { context: "production" }
  );

  assert.equal(result.ok, false);
  assert.match(result.fails.join("\n"), /published.*warnings/i);
});

test("production dish manifest rejects unsafe asset URLs", () => {
  const base = validDishManifest();
  const result = validateDishManifest(
    validDishManifest({
      variants: {
        ...base.variants,
        web: {
          ...base.variants.web,
          url: "/models/restaurants/maison-elyse/../secret.glb"
        },
        mobile: {
          ...base.variants.mobile,
          url: "javascript:alert(1)"
        }
      }
    }),
    { context: "production" }
  );

  assert.equal(result.ok, false);
  assert.match(result.fails.join("\n"), /variants\.web\.url.*stable/i);
  assert.match(result.fails.join("\n"), /variants\.mobile\.url.*stable/i);
});

test("production dish manifest rejects iOS Quick Look query strings and hashes", () => {
  const base = validDishManifest();
  const result = validateDishManifest(
    validDishManifest({
      variants: {
        ...base.variants,
        iosUsdz: {
          ...base.variants.iosUsdz,
          url: `${base.variants.iosUsdz.url}?v=1#ar`
        }
      }
    }),
    { context: "production" }
  );

  assert.equal(result.ok, false);
  assert.match(result.fails.join("\n"), /iosUsdz.*query.*hash/i);
});

test("budget classifier exposes target, warning, and fail bands", () => {
  const webBudget = PRODUCTION_3D_BUDGETS.variants.webGlb.bytes;

  assert.equal(classifyBudget(webBudget.target, webBudget), "target");
  assert.equal(classifyBudget(webBudget.target + 1, webBudget), "advisory");
  assert.equal(classifyBudget(webBudget.warning + 1, webBudget), "warning");
  assert.equal(classifyBudget(webBudget.fail + 1, webBudget), "fail");
});

test("restaurant manifest summary rolls up menus, dishes, active versions, and validation status", () => {
  const dishManifest = validDishManifest({
    validationStatus: "failed",
    validation: { warnings: [], fails: ["strict visual identity review pending"] }
  });
  const summary = summarizeRestaurantManifest("maison-elyse", [dishManifest], {
    generatedAt: stableIso
  });
  const result = validateRestaurantManifest(summary);

  assert.equal(result.ok, true);
  assert.equal(summary.restaurantSlug, "maison-elyse");
  assert.deepEqual(summary.menus, [
    {
      menuSlug: "demo",
      activeVersions: {
        "maison-elyse-n1": "v1"
      },
      dishes: ["maison-elyse-n1"]
    }
  ]);
  assert.equal(summary.dishes[0].dishSlug, "maison-elyse-n1");
  assert.equal(summary.validationStatus, "failed");
  assert.equal(summary.generatedAt, stableIso);
});

test("restaurant manifest rejects malformed dish rollup entries", () => {
  const result = validateRestaurantManifest({
    schemaVersion: 1,
    kind: "vistaire.restaurant-3d-manifest",
    restaurantSlug: "maison-elyse",
    generatedAt: stableIso,
    menus: [{ menuSlug: "demo", activeVersions: {}, dishes: ["maison-elyse-n1"] }],
    dishes: [
      {
        menuSlug: "demo",
        dishSlug: "Maison Elyse",
        activeVersion: "",
        status: "ready",
        validationStatus: "approved"
      }
    ],
    activeVersions: {},
    validationStatus: "passed"
  });

  assert.equal(result.ok, false);
  assert.match(result.fails.join("\n"), /dishes\[0\]\.dishSlug/i);
  assert.match(result.fails.join("\n"), /dishes\[0\]\.status/i);
  assert.match(result.fails.join("\n"), /activeVersions/i);
});
