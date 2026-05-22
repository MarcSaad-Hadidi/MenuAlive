# AR Asset Optimization Pipeline

Use this flow one dish at a time. The original source GLB/USDZ in `public/models/demo` stays untouched and is never the iPhone Quick Look production target.

## Asset Roles

- Original source asset: high-quality GLB/USDZ master, allowed to be large.
- Web 3D preview asset: `webModel3dUrl` GLB for `model-viewer`, allowed to use web-only compression.
- iPhone Quick Look production asset: `arUsdzUrl` USDZ under `/models/demo/ar-lite/`, no query string, `<= 5 MiB`.
- Candidate assets: temporary review outputs outside production under ignored `asset-review/3d-candidates/`; delete them before finishing unless intentionally documented.

## Build Candidates

```bash
npm run demo:build-ios-ultra -- homard-bisque
npm run demo:build-ios-ultra -- ravioles-chevre-miel
npm run demo:build-ios-ultra -- souffle-chocolat
```

The script creates conservative, balanced, ultra, and extreme candidates. It only promotes a production USDZ when a human visual review passes. Dishes with a previous real-iPhone failure also require a fresh real-device approval for the exact candidate hash:

```bash
npm run demo:build-ios-ultra -- homard-bisque --promote ultra --quality-approved
npm run demo:build-ios-ultra -- ravioles-chevre-miel --promote ultra --quality-approved --real-device-approved
npm run demo:build-ios-ultra -- souffle-chocolat --promote ultra --quality-approved --real-device-approved
```

Reject candidates that look cheap, cartoon-like, toy-like, visibly low-poly, blurry, fake, or that damage the dish silhouette, plate, scale, or grounding.

Current real-device production iPhone Quick Look status:

- `homard-bisque`: approved and active at `/models/demo/ar-lite/homard-bisque-ios-quicklook-ultra.usdz`
- `ravioles-chevre-miel`: failed real iPhone visual QA and must not declare `arUsdzUrl` until a clean candidate passes real-device review.
- `souffle-chocolat`: failed real iPhone visual QA and must not declare `arUsdzUrl` until material/color fidelity passes real-device review.

## Hard-Case Dishes

`ravioles-chevre-miel` was the first dish that failed the generic pipeline badly. Its source contains two nearly coincident high-density food shells with identical bounds, plus thousands of tiny loose geometry islands. Generic simplification preserved too much duplicated/split topology, so candidates stayed around 50 MB.

The former ravioles iPhone asset required deeper AR-only source preparation, but later real iPhone Quick Look QA showed it was visually unacceptable: fragmented, hole-filled, noisy, and not premium enough. Treat that asset as failed, not approved.

- delete the duplicated expensive food shell while keeping the visible ravioles shell
- remove the unnecessary metallic/roughness texture and use scalar food roughness
- prune tiny loose components per candidate level
- simplify the retained visible shell, resize/recompress the base-color atlas, normalize, ground, and optimize USDZ binary layers

Future complex dishes that remain above budget after the standard candidate build should follow this pattern before activation: inspect for duplicated shells/internal geometry, remove invisible or phone-distance-insignificant islands, bake material detail into one small base-color texture where possible, then build a dedicated AR-only source. Do not activate `arUsdzUrl` until the production USDZ is valid, grounded, visually acceptable on real iPhone Quick Look, and `<= 5 MiB`.

## Real-Device Failure Status

The latest real iPhone Safari / Quick Look QA supersedes earlier structural approvals:

- Ravioles failed visual QA: broken/fragmented/hole-filled/noisy look, not premium.
- Souffle failed visual QA: black plate, gray ice cream, broken material/color fidelity.
- Homard remains the reference approved asset and should not be changed unless a regression is discovered.

If a dish fails visual QA, remove its `arUsdzUrl` and do not prefetch or hand off the large source USDZ as a fallback.

## Current Candidate Decisions

Souffle root cause is likely material/export fidelity rather than source intent:
the source plate is a warm off-white scalar material, but the previous iPhone
ultra path did not apply the souffle-specific plate normal/material safeguards
used by the source USDZ converter. The food base-color texture also contains
substantial alpha while the material is opaque, and the previous ultra path
compressed food textures to 512px / low JPEG quality. The builder now applies a
souffle material-safe plate pass and refuses promotion of previously failed
dishes without explicit real-device approval, but no souffle candidate is active
until Safari / Quick Look confirms the black plate and gray ice cream are gone.

Ravioles root cause is source topology: the source contains duplicate food
shells and a very high number of tiny disconnected components. Automatic shell
deletion, island pruning, and simplification can therefore remove visible food
detail and create holes/noise. Do not promote ravioles from the automatic
pipeline as-is; rebuild or retopologize a clean AR-specific ravioles plate,
bake detail into reliable textures, then test on real iPhone before activation.

## Gates

Run:

```bash
npm run demo:validate-ios-budget
npm run demo:validate-ar-lite
npm run demo:validate-assets
npm run demo:validate-network
```

`arUsdzUrl` must point only to a production-approved USDZ `<= 5 MiB`. Do not fall back to `usdzUrl` for iPhone Quick Look. If no candidate passes both size and visual quality, keep the original source untouched, mark the dish as failed/not production-approved, and request artist work: texture atlas, baked details, mesh cleanup, retopology, or better source preparation.

## QA

Use Chrome DevTools to verify URL wiring, headers, console health, DOM `ios-src`/`rel="ar"` state, prefetch, mobile viewport, and throttled network behavior. Chrome DevTools proves web-side readiness only; it does not prove Apple Quick Look material fidelity. Then test real iPhone Safari on 5G and WiFi, first and second open, with and without clearing Safari website data. Approval must be tied to the exact USDZ URL, byte size, SHA-256, commit/deploy ID, device/iOS version, and review evidence.

Quick Look cache reuse is native iOS behavior outside React control. Use small USDZ files, stable URLs, correct headers, current-dish prefetch, and readiness UX, but do not promise full native cache control.
