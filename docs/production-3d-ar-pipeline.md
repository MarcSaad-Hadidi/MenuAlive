# Vistaire Production 3D/AR Pipeline

This document describes the current Vistaire production 3D/AR pipeline. It
keeps Git out of the heavy-asset delivery path while providing real source
analysis, variant generation, strict validation, publication, rollback, and
runtime selection gates.

## Objectives

- Define a multi-restaurant 3D/AR manifest contract.
- Validate dish and restaurant manifests before runtime activation.
- Validate GLB and USDZ files when local files are explicitly provided.
- Validate delivery headers only when a base URL is explicitly provided.
- Produce JSON/Markdown source and optimization reports, then reject the asset
  until a real rendered visual-quality report exists.
- Keep Git free of new heavy GLB, USDZ, video, ZIP, source, and review assets.
- Provide progressive runtime helpers that adapt the existing demo data into a
  manifest-shaped contract without moving heavy demo binaries.

## Structure

```text
scripts/3d/
  analyze.mjs
  validate.mjs
  validate-dish.mjs
  validate-restaurant.mjs
  validate-network.mjs
  manifest.mjs
  analyze-source.mjs
  optimize.mjs
  optimize-dish.mjs
  optimize-menu.mjs
  preview.mjs
  publish.mjs
  rollback.mjs
  clean-stale.mjs
  report.mjs
  quality-report.mjs
  shared/
    budgets.mjs
    file-utils.mjs
    manifest-schema.mjs
    report-utils.mjs
    validators/
      budget-checks.mjs
      file-exists.mjs
      file-signature.mjs
      glb-basic.mjs
      manifest-schema.mjs
      network-headers.mjs
      report-writer.mjs
      sha256.mjs
      usdz-basic.mjs
assets/3d/fixtures/
  maison-elyse/demo/maison-elyse-n1/v1/manifest.json
```

`assets/3d/fixtures/**` is for lightweight JSON only. Source/work/review assets
remain out of Git under the policy in `docs/repo-asset-policy.md`.

## Commands

```bash
npm run 3d:analyze
npm run 3d:validate
npm run 3d:validate-dish -- --manifest assets/3d/fixtures/maison-elyse/demo/maison-elyse-n1/v1/manifest.json
npm run 3d:manifest -- --dish-manifest assets/3d/fixtures/maison-elyse/demo/maison-elyse-n1/v1/manifest.json
npm run 3d:report
npm run 3d:quality-report
npm run 3d:analyze-source -- --source path/to/source.glb --out path/to/source-analysis.json --markdown path/to/source-analysis.md
npm run 3d:optimize-dish -- --restaurant maison-elyse --menu main --dish homard-bisque --version v1 --source path/to/source.glb --write --allow-public-binaries --approved-by "Marc"
npm run 3d:visual-compare -- --source path/to/source.glb --candidate assets/3d/work/maison-elyse/main/homard-bisque/v1/mobile/homard-bisque-mobile.glb --variant mobile --out assets/3d/reports/maison-elyse/main/homard-bisque/v1/visual/mobile --threshold strict
npm run 3d:approve-visual -- --manifest public/models/restaurants/maison-elyse/main/homard-bisque/v1/manifest.json --approved-by "Marc" --write
npm run 3d:publish -- --manifest public/models/restaurants/maison-elyse/main/homard-bisque/v1/manifest.json --quality-approved --approved-by "Marc" --write
npm run 3d:rollback -- --restaurant maison-elyse --menu main --dish homard-bisque --to v1 --approved-by "Marc" --write
npm run 3d:clean-stale -- --restaurant maison-elyse --menu main --dish homard-bisque --dry-run
```

File validation is opt-in:

```bash
npm run 3d:validate -- --manifest path/to/manifest.json --require-files --root .
```

Network/header validation is also opt-in:

```bash
npm run 3d:validate-network -- --base-url http://localhost:3000 --manifest path/to/manifest.json
```

Exit rules:

- fails: exit 1
- warnings only: exit 0
- warnings with `--strict`: exit 1

## Dish Manifest

Dish manifests contain:

- `schemaVersion`
- `restaurantSlug`, `menuSlug`, `dishSlug`
- `activeVersion`
- lifecycle `status`: `draft`, `review`, `approved`, `published`, `archived`
- quality `validationStatus`: `unvalidated`, `passed`, `warning`, `failed`
- `variants.web`, `variants.mobile`, `variants.arLite`, `variants.iosUsdz`, `variants.poster`
- variant `url`, `bytes`, `sha256`, `validationStatus`
- aggregate `bytes.total`
- `validation.warnings`, `validation.fails`
- `generatedAt`, `approvedAt`, `publishedAt`

The lifecycle status and quality validation status are deliberately separate.
Published production manifests require `approvedAt`, `publishedAt`, no fails,
and `validationStatus: "passed"`.

## Restaurant Manifest

Restaurant manifests are rollups, not runtime activation switches. They include:

- `restaurantSlug`
- `menus`
- `dishes`
- active versions keyed by `menuSlug/dishSlug`
- `generatedAt`
- rollup `validationStatus`

The rollup can be generated with `npm run 3d:manifest`.

`npm run 3d:publish` also writes the active dish manifest and refreshes the
restaurant rollup from active manifests.

## Budgets

Delivery budgets live in `scripts/3d/shared/budgets.mjs`. Git/LFS thresholds,
dangerous extensions, and allowlists remain in `docs/repo-asset-policy.md`.

Initial warning/fail bands:

| Scope | Target | Warning | Fail |
| --- | ---: | ---: | ---: |
| Web GLB | 6 MB | 8 MB | 12 MB |
| Mobile GLB | 3 MB | 5 MB | 8 MB |
| AR-lite GLB | 8 MiB | 12 MiB | 15 MiB |
| iOS USDZ | 3.5 MB | 4.5 MB | 5 MiB |
| Poster | 150 KB | 250 KB | 500 KB |
| Total simple dish | 8 MB | 14 MB | 22 MiB |
| Total signature dish | 14 MB | 24 MB | 32 MiB |

The iOS USDZ fail budget remains exactly `5 * 1024 * 1024` bytes.

## Validators

- File exists: file presence, non-empty file, and basic stat evidence.
- File signature: magic bytes such as `glTF` and `PK`.
- SHA-256: optional expected hash comparison.
- GLB basic: GLB header, version, declared length, JSON/BIN chunks, asset
  version, core references, scene counts, external URI warnings, AR extension
  warnings, and LFS pointer rejection.
- USDZ basic: ZIP magic, EOCD, unzip readability, unsafe paths, USD layers,
  text USDA geometry/material indicators, texture signatures, missing texture
  references, and LFS pointer rejection.
- Manifest schema: required fields, lifecycle, validation status, URL safety,
  variant extensions, SHA-256 format, iOS query/hash rejection, lifecycle dates,
  and budgets.
- Network headers: HEAD first, GET Range fallback, `Content-Range` total size,
  GLB/USDZ MIME, inline USDZ disposition, immutable public cache headers, and
  Quick Look network budget.
- Report writer: Markdown/JSON output for human QA.

These validators are structural gates. They do not claim real iPhone Quick Look
or Android Scene Viewer validation.

## Source And Optimization

`3d:analyze-source` parses the GLB JSON chunk and emits byte/hash, mesh,
primitive, vertex, triangle, material, texture, image, extension, external URI,
bounds, orientation, and draw-call evidence. Git LFS pointers, missing files,
malformed GLBs, and external URI dependencies are rejected.

`3d:optimize-dish` requires `@gltf-transform/cli`. Web and mobile GLB variants
run through `gltf-transform optimize` with Meshopt and WebP texture compression.
AR-lite uses a separate Android profile with no required compression extension,
mesh simplification, and no copy fallback. The optimizer records conservative,
balanced, and aggressive candidate metadata and refuses to select the lightest
candidate unless it also passes the strict visual gate. The iOS USDZ candidate
is generated from the AR-lite GLB geometry/textures instead of a minimal proxy
package, but its `productionFaithful` field remains false until evidence and
real-device QA prove that path. The command rejects by default and writes
generated variants under ignored `assets/3d/work/**` until strict visual proof
exists. Review poster outputs are not production assets. `--approved-by`
records the reviewer request but cannot turn missing visual proof into approval.

`3d:visual-compare` is the deterministic rendered evidence generator. It uses
Playwright Chromium, a fixed `model-viewer` harness, fixed DPR/camera/background,
and software WebGL settings to render source and candidate GLBs. It emits
before/after/diff PNGs for front, left, right, top, three-quarter,
close-up-signature, table-distance, and mobile-distance angles, plus JSON and
Markdown reports with SSIM, perceptual, diff, silhouette, color, texture,
material, low-poly, and appetite metrics.

`3d:approve-visual` verifies the rendered report files before stamping human
visual approval fields. The report must be bound to the manifest source and
candidate SHA-256 values. The command does not change lifecycle status, clear
validation failures, or auto-fill real-device iPhone Quick Look or Android
Scene Viewer results.

The required visual promise is: "visually indistinguishable under deterministic
multi-angle mobile dining-distance review within strict thresholds." A manifest
cannot be approved or published unless `visualQuality` records real rendered
comparison evidence for web, mobile, and AR-lite: before/after/diff artifacts,
per-angle reports, SSIM/perceptual scores, texture sharpness, silhouette, color,
material, scale/origin, low-poly, and appetite-preservation checks, plus human
approval. A structural visualQuality proxy is a rejection, not a warning.

`npm run 3d:publish` verifies that strict evidence already exists. The
`--quality-approved` flag is a publish confirmation only; it does not create
manual approval and it does not clear visual failures. If a heavy source cannot
meet budgets without visible loss, keep the previous version and request artist
retouching or source simplification. Publication requires schema v2, existing
visual report files, before/after/diff images, per-angle metrics, valid local
variant files, existing human approval in the manifest, and passed real-device
iPhone Quick Look plus Android Scene Viewer QA.

`--cdn-base-url` rewrites variant URLs to an HTTPS origin listed in
`VISTAIRE_3D_CDN_ORIGINS` and keeps generated binaries in ignored staging
folders. It does not upload artifacts and does not bypass checksum, visual,
manual approval, or real-device QA gates. CDN publish requires a saved strict
`3d:validate-network` report whose fetched byte counts and SHA-256 values match
the manifest.

`3d:clean-stale --write` requires an active dish manifest. Without one, the
command cannot distinguish stale versions from unpublished generated versions,
so it exits without deleting any version directory.

## Storage/CDN

Production assets should normally live in storage/CDN, not Git. The pipeline can
emit allowlisted CDN URLs and SHA-256 metadata, but operators must upload the
staged binaries and run network/header validation before publish.

## Migrating One Dish

1. Prepare source/work files outside Git.
2. Generate optimized web, mobile, AR-lite, iOS USDZ, and poster variants.
3. Upload heavy variants to storage/CDN or an approved non-Git delivery path.
4. Generate a lightweight dish manifest with URLs, bytes, and SHA-256 values.
5. Run schema, budget, file, and network validation as applicable.
6. Produce a quality report.
7. Complete visual QA and real-device Quick Look/Scene Viewer QA before runtime activation.

## Runtime Integration

The current runtime keeps the demo working through a progressive adapter:
`buildDemoDish3dManifest(dish)` converts legacy demo fields such as
`webModel3dUrl`, `arModel3dUrl`, and `arUsdzUrl` into an internal schema v2
manifest. `selectImmersiveVariant(...)` then chooses web, mobile, AR-lite, iOS
USDZ, or poster fallback by device, browser, network, and user intent.

The selector is intentionally fail-closed:

- no model before explicit intent;
- Save-Data and slow network get a poster confirmation step;
- Android AR requires an AR-lite variant;
- iOS Quick Look requires Safari and a stable USDZ URL;
- unsafe URLs return no model.

## Not In This PR

- No GLB/USDZ/MP4/WebM/MOV/ZIP binaries are added.
- No tracked runtime binaries are added under `public/models`, `public/videos`,
  or `public/frames`.
- No `app/page.tsx` or landing hero changes are made.
- No production restaurant GLB/USDZ binaries are added.
- No real iPhone Quick Look validation is claimed.

## Next PR

Pilot one dish manifest without Git binaries: add one approved dish manifest
that points to storage/CDN or disabled metadata, then validate headers and
runtime loading only after user intent.
