import assert from "node:assert/strict";
import test from "node:test";

import { resolveDishModelAssets } from "../lib/dishModelAssets.ts";
import { resolveDishModelViewerSrc } from "../lib/dishModelVariantSelection.ts";

const legacyHomardAssets = {
  slug: "homard-bisque",
  model3dUrl: "/models/demo/homard-bisque.glb",
  webModel3dUrl: "/models/demo/homard-bisque-meshopt-73be7175.glb",
  arModel3dUrl: "/models/demo/ar-lite/homard-bisque-ar-lite.glb",
  usdzUrl: "/models/demo/homard-bisque.usdz",
  arUsdzUrl: "/models/demo/ar-lite/homard-bisque-ios-quicklook-ultra.usdz",
  arVisualStatus: "approved"
};

const productionManifest = {
  restaurantSlug: "maison-elyse",
  menuSlug: "main",
  dishSlug: "homard-bisque",
  activeVersion: "v1",
  status: "review",
  variants: {
    web: {
      url: "/models/restaurants/maison-elyse/main/homard-bisque/v1/web/homard-bisque-web.glb"
    },
    arLite: {
      url: "/models/restaurants/maison-elyse/main/homard-bisque/v1/ar-lite/homard-bisque-ar-lite.glb"
    },
    iosUsdz: {
      url: "/models/restaurants/maison-elyse/main/homard-bisque/v1/ios/homard-bisque-ios-quicklook-ultra.usdz",
      validationStatus: "approved"
    }
  },
  validation: {
    warnings: [],
    fails: []
  }
};

test("resolver uses a valid production manifest while preserving legacy source fields", () => {
  const resolved = resolveDishModelAssets(legacyHomardAssets, productionManifest);

  assert.equal(resolved.source, "manifest");
  assert.equal(resolved.model3dUrl, legacyHomardAssets.model3dUrl);
  assert.equal(resolved.usdzUrl, legacyHomardAssets.usdzUrl);
  assert.equal(
    resolved.webModel3dUrl,
    "/models/restaurants/maison-elyse/main/homard-bisque/v1/web/homard-bisque-web.glb"
  );
  assert.equal(
    resolved.arModel3dUrl,
    "/models/restaurants/maison-elyse/main/homard-bisque/v1/ar-lite/homard-bisque-ar-lite.glb"
  );
  assert.equal(
    resolved.arUsdzUrl,
    "/models/restaurants/maison-elyse/main/homard-bisque/v1/ios/homard-bisque-ios-quicklook-ultra.usdz"
  );
  assert.equal(resolved.arVisualStatus, "approved");
});

test("resolver falls back to legacy assets when manifest is absent or invalid", () => {
  assert.equal(resolveDishModelAssets(legacyHomardAssets, null).source, "legacy");

  const invalid = {
    ...productionManifest,
    validation: {
      warnings: [],
      fails: ["visual review failed"]
    }
  };
  const resolved = resolveDishModelAssets(legacyHomardAssets, invalid);

  assert.equal(resolved.source, "legacy");
  assert.equal(resolved.webModel3dUrl, legacyHomardAssets.webModel3dUrl);
  assert.equal(resolved.arModel3dUrl, legacyHomardAssets.arModel3dUrl);
  assert.equal(resolved.arUsdzUrl, legacyHomardAssets.arUsdzUrl);
});

test("viewer source keeps premium web GLB on desktop and lighter variants on mobile", () => {
  assert.equal(
    resolveDishModelViewerSrc({
      arModelSrc: "/models/restaurants/maison-elyse/main/homard-bisque/v1/ar-lite/homard-bisque-ar-lite.glb",
      isAndroid: false,
      mobileModelSrc: "",
      originalModelSrc: "/models/demo/homard-bisque.glb",
      prefersMobileModel: false,
      webModelSrc: "/models/restaurants/maison-elyse/main/homard-bisque/v1/web/homard-bisque-web.glb"
    }),
    "/models/restaurants/maison-elyse/main/homard-bisque/v1/web/homard-bisque-web.glb"
  );

  assert.equal(
    resolveDishModelViewerSrc({
      arModelSrc: "/models/restaurants/maison-elyse/main/homard-bisque/v1/ar-lite/homard-bisque-ar-lite.glb",
      isAndroid: true,
      mobileModelSrc: "",
      originalModelSrc: "/models/demo/homard-bisque.glb",
      prefersMobileModel: false,
      webModelSrc: "/models/restaurants/maison-elyse/main/homard-bisque/v1/web/homard-bisque-web.glb"
    }),
    "/models/restaurants/maison-elyse/main/homard-bisque/v1/ar-lite/homard-bisque-ar-lite.glb"
  );

  assert.equal(
    resolveDishModelViewerSrc({
      arModelSrc: "/models/restaurants/maison-elyse/main/homard-bisque/v1/ar-lite/homard-bisque-ar-lite.glb",
      isAndroid: false,
      mobileModelSrc: "/models/restaurants/maison-elyse/main/homard-bisque/v1/mobile/homard-bisque-mobile.glb",
      originalModelSrc: "/models/demo/homard-bisque.glb",
      prefersMobileModel: true,
      webModelSrc: "/models/restaurants/maison-elyse/main/homard-bisque/v1/web/homard-bisque-web.glb"
    }),
    "/models/restaurants/maison-elyse/main/homard-bisque/v1/mobile/homard-bisque-mobile.glb"
  );

  assert.equal(
    resolveDishModelViewerSrc({
      arModelSrc: "/models/restaurants/maison-elyse/main/homard-bisque/v1/ar-lite/homard-bisque-ar-lite.glb",
      isAndroid: true,
      mobileModelSrc: "",
      originalModelSrc: "",
      prefersMobileModel: false,
      webModelSrc: ""
    }),
    "/models/restaurants/maison-elyse/main/homard-bisque/v1/ar-lite/homard-bisque-ar-lite.glb"
  );

  assert.equal(
    resolveDishModelViewerSrc({
      arModelSrc: "",
      isAndroid: false,
      mobileModelSrc: "",
      originalModelSrc: "/models/demo/ravioles-chevre-miel.glb",
      prefersMobileModel: true,
      webModelSrc: ""
    }),
    "/models/demo/ravioles-chevre-miel.glb"
  );
});

test("resolver only upgrades iOS Quick Look when the manifest iOS variant is approved", () => {
  const resolved = resolveDishModelAssets(legacyHomardAssets, {
    ...productionManifest,
    status: "approved",
    variants: {
      ...productionManifest.variants,
      iosUsdz: {
        ...productionManifest.variants.iosUsdz,
        validationStatus: "failed"
      }
    }
  });

  assert.equal(resolved.source, "manifest");
  assert.equal(
    resolved.arUsdzUrl,
    "/models/restaurants/maison-elyse/main/homard-bisque/v1/ios/homard-bisque-ios-quicklook-ultra.usdz"
  );
  assert.equal(resolved.arVisualStatus, "needs-review");
});
