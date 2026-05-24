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
      total: 493_744
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

test("production dish manifest accepts the required multi-variant contract", () => {
  const result = validateDishManifest(validDishManifest(), { context: "production" });

  assert.equal(result.ok, true);
  assert.deepEqual(result.fails, []);
  assert.equal(result.metrics.validationStatus, "passed");
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
  const dishManifest = validDishManifest();
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
  assert.equal(summary.validationStatus, "passed");
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
