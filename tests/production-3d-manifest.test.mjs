import assert from "node:assert/strict";
import test from "node:test";

import {
  PRODUCTION_3D_BUDGETS,
  classifyBudget
} from "../scripts/3d/shared/budgets.mjs";
import {
  summarizeRestaurantManifest,
  validateDishManifest
} from "../scripts/3d/shared/manifest-schema.mjs";

const validManifest = {
  restaurantSlug: "maison-elyse",
  menuSlug: "demo",
  dishSlug: "homard-bisque",
  activeVersion: "v1",
  status: "review",
  isSignature: true,
  variants: {
    web: {
      url: "/models/restaurants/maison-elyse/demo/homard-bisque/v1/web/homard-bisque-web.glb",
      bytes: 4_200_000,
      sha256: "a".repeat(64)
    },
    mobile: {
      url: "/models/restaurants/maison-elyse/demo/homard-bisque/v1/mobile/homard-bisque-mobile.glb",
      bytes: 3_100_000,
      sha256: "b".repeat(64)
    },
    arLite: {
      url: "/models/restaurants/maison-elyse/demo/homard-bisque/v1/ar-lite/homard-bisque-ar.glb",
      bytes: 3_400_000,
      sha256: "c".repeat(64)
    },
    iosUsdz: {
      url: "/models/restaurants/maison-elyse/demo/homard-bisque/v1/ios/homard-bisque.usdz",
      bytes: 4_100_000,
      sha256: "d".repeat(64)
    },
    poster: {
      url: "/models/restaurants/maison-elyse/demo/homard-bisque/v1/poster/homard-bisque.webp",
      bytes: 180_000,
      sha256: "e".repeat(64)
    }
  },
  budgets: PRODUCTION_3D_BUDGETS,
  physicalDimensions: {
    unit: "meters",
    width: 0.21,
    height: 0.09,
    depth: 0.18
  },
  validation: {
    warnings: [],
    fails: []
  },
  generatedAt: "2026-05-22T00:00:00.000Z",
  approvedAt: null,
  publishedAt: null
};

test("production manifest accepts coherent restaurant model paths", () => {
  const result = validateDishManifest(validManifest, { context: "production" });

  assert.equal(result.valid, true);
  assert.deepEqual(result.fails, []);
});

test("production manifest rejects unstable iOS Quick Look URLs", () => {
  const result = validateDishManifest(
    {
      ...validManifest,
      variants: {
        ...validManifest.variants,
        iosUsdz: {
          ...validManifest.variants.iosUsdz,
          url: `${validManifest.variants.iosUsdz.url}?v=1`
        }
      }
    },
    { context: "production" }
  );

  assert.equal(result.valid, false);
  assert.match(result.fails.join("\n"), /iosUsdz.*query|hash/i);
});

test("production manifest rejects assets outside public restaurant model roots", () => {
  const result = validateDishManifest(
    {
      ...validManifest,
      variants: {
        ...validManifest.variants,
        web: {
          ...validManifest.variants.web,
          url: "/assets/3d/source/maison-elyse/demo/homard-bisque/v1/source.glb"
        }
      }
    },
    { context: "production" }
  );

  assert.equal(result.valid, false);
  assert.match(result.fails.join("\n"), /web.*\/models\/restaurants/i);
});

test("budget classifier distinguishes target, warning, and fail bands", () => {
  const webBudget = PRODUCTION_3D_BUDGETS.variants.webGlb.bytes;

  assert.equal(classifyBudget(webBudget.target, webBudget), "target");
  assert.equal(classifyBudget(webBudget.warning, webBudget), "warning");
  assert.equal(classifyBudget(webBudget.fail + 1, webBudget), "fail");
});

test("restaurant manifest summary rolls up dish status and active versions", () => {
  const summary = summarizeRestaurantManifest("maison-elyse", [validManifest]);

  assert.equal(summary.restaurantSlug, "maison-elyse");
  assert.equal(summary.globalValidationStatus, "review");
  assert.deepEqual(summary.activeVersions, {
    "demo/homard-bisque": "v1"
  });
  assert.equal(summary.dishes[0].dishSlug, "homard-bisque");
});
