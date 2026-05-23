import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { dishHasImmersiveAsset } from "../lib/menuQuery.ts";
import { resolveActiveQuickLookUsdzUrl } from "../lib/quickLookAssets.ts";

const ROOT = process.cwd();

test("DishModelViewer passes visual approval status into the Quick Look URL resolver", () => {
  const source = readFileSync(
    join(ROOT, "components", "dish", "DishModelViewer.tsx"),
    "utf8"
  );

  assert.match(
    source,
    /resolveActiveQuickLookUsdzUrl\(\{\s*arUsdzUrl:\s*dish\.arUsdzUrl,\s*arVisualStatus:\s*dish\.arVisualStatus\s*\}\)/s
  );
});

test("dishHasImmersiveAsset ignores raw iPhone AR USDZ unless visual status is approved", () => {
  assert.equal(
    dishHasImmersiveAsset({
      model3dUrl: "",
      webModel3dUrl: "",
      arModel3dUrl: "",
      usdzUrl: "/models/demo/souffle-chocolat.usdz",
      arUsdzUrl: "/models/demo/ar-lite/souffle-chocolat-ios-quicklook-ultra.usdz",
      arVisualStatus: "failed-real-device"
    }),
    false
  );

  assert.equal(
    dishHasImmersiveAsset({
      model3dUrl: "",
      webModel3dUrl: "",
      arModel3dUrl: "",
      usdzUrl: "/models/demo/homard-bisque.usdz",
      arUsdzUrl: "/models/demo/ar-lite/homard-bisque-ios-quicklook-ultra.usdz",
      arVisualStatus: "approved"
    }),
    true
  );
});

test("Quick Look resolver rejects known real-device failed USDZ filenames even if mis-marked approved", () => {
  for (const arUsdzUrl of [
    "/models/demo/ar-lite/souffle-chocolat-ios-quicklook-ultra.usdz",
    "/models/demo/ar-lite/ravioles-chevre-miel-ios-quicklook-ultra.usdz"
  ]) {
    assert.equal(
      resolveActiveQuickLookUsdzUrl({
        arUsdzUrl,
        arVisualStatus: "approved"
      }),
      ""
    );

    assert.equal(
      dishHasImmersiveAsset({
        model3dUrl: "",
        webModel3dUrl: "",
        arModel3dUrl: "",
        usdzUrl: "",
        arUsdzUrl,
        arVisualStatus: "approved"
      }),
      false
    );
  }
});

test("Quick Look resolver accepts approved production restaurant USDZ URLs", () => {
  const arUsdzUrl =
    "/models/restaurants/maison-elyse/main/homard-bisque/v1/ios/homard-bisque-ios-quicklook-ultra.usdz";

  assert.equal(
    resolveActiveQuickLookUsdzUrl({
      arUsdzUrl,
      arVisualStatus: "approved"
    }),
    arUsdzUrl
  );

  assert.equal(
    dishHasImmersiveAsset({
      model3dUrl: "",
      webModel3dUrl: "",
      mobileModel3dUrl: "",
      arModel3dUrl: "",
      usdzUrl: "",
      arUsdzUrl,
      arVisualStatus: "approved"
    }),
    true
  );
});

test("runtime and validator policy surfaces deny known failed real-device USDZ filenames", () => {
  const policyFiles = [
    join(ROOT, "lib", "quickLookAssets.ts"),
    join(ROOT, "lib", "dishAssetWarmup.ts"),
    join(ROOT, "lib", "menuQuery.ts"),
    join(ROOT, "scripts", "validate-demo-assets.mjs"),
    join(ROOT, "scripts", "validate-demo-ar-lite-assets.mjs"),
    join(ROOT, "scripts", "validate-ios-quicklook-budget.mjs")
  ];

  for (const filePath of policyFiles) {
    const source = readFileSync(filePath, "utf8");
    assert.match(
      source,
      /ravioles-chevre-miel-ios-quicklook-ultra\.usdz/,
      filePath
    );
    assert.match(
      source,
      /souffle-chocolat-ios-quicklook-ultra\.usdz/,
      filePath
    );
  }
});
