import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDemoDish3dManifest,
  selectImmersiveVariant
} from "../lib/dish3dManifest.ts";

const baseDish = {
  slug: "homard-bisque",
  categorySlug: "plats-signatures",
  name: "Homard bleu",
  model3dUrl: "/models/demo/homard-bisque.glb",
  webModel3dUrl: "/models/demo/homard-bisque-meshopt-73be7175.glb",
  arModel3dUrl: "/models/demo/ar-lite/homard-bisque-ar-lite.glb",
  arUsdzUrl: "/models/demo/ar-lite/homard-bisque-ios-quicklook-ultra.usdz",
  image: "/images/demo/dishes/homard-bleu-bisque-fenouil.png"
};

function select(overrides = {}) {
  return selectImmersiveVariant({
    manifest: buildDemoDish3dManifest(baseDish),
    device: "desktop",
    browser: "chrome",
    viewport: { width: 1440, height: 900 },
    connection: { effectiveType: "4g", saveData: false },
    userIntent: "view3d",
    prefersReducedMotion: false,
    ...overrides
  });
}

test("demo adapter exposes a schema v2 manifest without mutating legacy dish fields", () => {
  const dish = { ...baseDish };
  const manifest = buildDemoDish3dManifest(dish);

  assert.equal(manifest.schemaVersion, 2);
  assert.equal(manifest.kind, "vistaire.dish-3d-manifest");
  assert.equal(manifest.restaurantSlug, "maison-elyse");
  assert.equal(manifest.menuSlug, "demo");
  assert.equal(manifest.dishSlug, "homard-bisque");
  assert.equal(manifest.status, "approved");
  assert.equal(manifest.validationStatus, "passed");
  assert.equal(manifest.variants.web.url, baseDish.webModel3dUrl);
  assert.equal(manifest.variants.mobile.url, baseDish.arModel3dUrl);
  assert.equal(manifest.variants.arLite.url, baseDish.arModel3dUrl);
  assert.equal(manifest.variants.iosUsdz.url, baseDish.arUsdzUrl);
  assert.equal(manifest.variants.poster.url, baseDish.image);
  assert.equal(dish.webModel3dUrl, baseDish.webModel3dUrl);
});

test("variant selector keeps all models behind explicit user intent", () => {
  const result = select({ userIntent: "none" });

  assert.equal(result.kind, "poster");
  assert.equal(result.url, baseDish.image);
  assert.equal(result.shouldLoadModel, false);
  assert.match(result.reason, /intent/i);
});

test("variant selector chooses desktop web and mobile preview variants for 3D intent", () => {
  assert.equal(select().kind, "web");
  assert.equal(select().url, baseDish.webModel3dUrl);

  const mobile = select({
    device: "android",
    browser: "chrome",
    viewport: { width: 390, height: 844 }
  });

  assert.equal(mobile.kind, "mobile");
  assert.equal(mobile.url, baseDish.arModel3dUrl);
  assert.equal(mobile.shouldLoadModel, true);
});

test("variant selector offers Android AR only when an AR-lite variant exists", () => {
  const android = select({
    device: "android",
    browser: "chrome",
    userIntent: "ar"
  });

  assert.equal(android.kind, "arLite");
  assert.equal(android.url, baseDish.arModel3dUrl);

  const noArLiteManifest = buildDemoDish3dManifest({
    ...baseDish,
    arModel3dUrl: ""
  });
  const fallback = selectImmersiveVariant({
    manifest: noArLiteManifest,
    device: "android",
    browser: "chrome",
    viewport: { width: 390, height: 844 },
    connection: { effectiveType: "4g", saveData: false },
    userIntent: "ar",
    prefersReducedMotion: false
  });

  assert.equal(fallback.kind, "mobile");
  assert.equal(fallback.shouldLoadModel, true);
  assert.match(fallback.message, /3D reste disponible/i);
});

test("variant selector handles iOS Safari, iOS Chrome, slow network, and unsafe URLs", () => {
  const safari = select({
    device: "ios",
    browser: "safari",
    userIntent: "ar",
    viewport: { width: 390, height: 844 }
  });
  assert.equal(safari.kind, "iosUsdz");
  assert.equal(safari.url, baseDish.arUsdzUrl);

  const chrome = select({
    device: "ios",
    browser: "chrome",
    userIntent: "ar",
    viewport: { width: 390, height: 844 }
  });
  assert.equal(chrome.kind, "mobile");
  assert.match(chrome.message, /Safari/i);

  const slow = select({
    device: "android",
    browser: "chrome",
    connection: { effectiveType: "3g", saveData: true },
    viewport: { width: 390, height: 844 }
  });
  assert.equal(slow.kind, "poster");
  assert.equal(slow.requiresConfirmation, true);
  assert.equal(slow.shouldLoadModel, false);

  const unsafeManifest = buildDemoDish3dManifest({
    ...baseDish,
    webModel3dUrl: "/models/demo/homard-bisque.glb?v=1"
  });
  const unsafe = selectImmersiveVariant({
    manifest: unsafeManifest,
    device: "desktop",
    browser: "chrome",
    viewport: { width: 1440, height: 900 },
    connection: { effectiveType: "4g", saveData: false },
    userIntent: "view3d",
    prefersReducedMotion: false
  });
  assert.equal(unsafe.kind, "none");
  assert.equal(unsafe.shouldLoadModel, false);
  assert.match(unsafe.reason, /unsafe/i);
});
