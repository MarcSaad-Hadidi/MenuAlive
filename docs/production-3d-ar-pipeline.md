# Vistaire Production 3D/AR Pipeline

This PR rebuilds the useful pipeline ideas from the old PR #24 without merging
that branch, copying its binaries, activating runtime dishes, or changing the
landing hero.

## Objectives

- Define a multi-restaurant 3D/AR manifest contract.
- Validate dish and restaurant manifests before runtime activation.
- Validate GLB and USDZ files when local files are explicitly provided.
- Validate delivery headers only when a base URL is explicitly provided.
- Produce JSON/Markdown quality reports for human review.
- Keep Git free of new heavy GLB, USDZ, video, ZIP, source, and review assets.

## Structure

```text
scripts/3d/
  analyze.mjs
  validate.mjs
  validate-dish.mjs
  validate-restaurant.mjs
  validate-network.mjs
  manifest.mjs
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

## Storage/CDN Future

Future production assets should normally live in storage/CDN, not Git. A later
PR can add a CDN allowlist and runtime resolver after this pipeline proves the
manifest, checksum, budget, and header contract.

## Migrating One Dish

1. Prepare source/work files outside Git.
2. Generate optimized web, mobile, AR-lite, iOS USDZ, and poster variants.
3. Upload heavy variants to storage/CDN or an approved non-Git delivery path.
4. Generate a lightweight dish manifest with URLs, bytes, and SHA-256 values.
5. Run schema, budget, file, and network validation as applicable.
6. Produce a quality report.
7. Complete visual QA and real-device Quick Look/Scene Viewer QA before runtime activation.

## Not In This PR

- No GLB/USDZ/MP4/WebM/MOV/ZIP binaries are added.
- No `public/models`, `public/videos`, or `public/frames` changes are made.
- No `app/page.tsx`, landing hero, demo runtime, or AR runtime wiring changes are made.
- No `next.config.ts` restaurant asset headers are added.
- No real iPhone Quick Look validation is claimed.

## Next PR

Pilot one dish manifest without Git binaries: add one approved dish manifest
that points to storage/CDN or disabled metadata, then validate headers and
runtime loading only after user intent.
