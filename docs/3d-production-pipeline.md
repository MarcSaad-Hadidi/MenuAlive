# Vistaire 3D Production Pipeline

This is the production workflow for client dishes. It prepares Vistaire for
multiple restaurants without making Git the delivery channel for heavy models.

## Identity

Every asset version is addressed by:

```text
restaurantSlug -> menuSlug -> dishSlug -> assetVersion
```

Example:

```text
maison-elyse/main/homard-bisque/v1
```

## File Structure

```text
assets/3d/source/{restaurantSlug}/{menuSlug}/{dishSlug}/{version}/
assets/3d/work/{restaurantSlug}/{menuSlug}/{dishSlug}/{version}/
assets/3d/reports/{restaurantSlug}/{menuSlug}/{dishSlug}/{version}/

public/models/restaurants/{restaurantSlug}/{menuSlug}/{dishSlug}/{version}/poster.png
public/models/restaurants/{restaurantSlug}/{menuSlug}/{dishSlug}/{version}/manifest.json
public/models/restaurants/{restaurantSlug}/{menuSlug}/{dishSlug}/manifest.json
public/models/restaurants/{restaurantSlug}/manifest.json
```

Source, work, and report folders are ignored by Git. Production GLB/USDZ
binaries under `public/models/restaurants/**` are ignored by default and require
a reviewed asset-policy exception before they can be committed. Prefer
storage/CDN for heavy client assets. `--cdn-base-url` rewrites manifest variant
URLs to an allowlisted HTTPS origin while keeping generated binaries under
ignored `assets/3d/work/**`; it does not upload files.

## Workflow

1. Put source assets outside Git or under ignored `assets/3d/source/**`.
2. Analyze the source:

```bash
npm run 3d:analyze-source -- --source assets/3d/source/maison-elyse/main/homard-bisque/v1/source.glb --out assets/3d/reports/maison-elyse/main/homard-bisque/v1/source-analysis.json --markdown assets/3d/reports/maison-elyse/main/homard-bisque/v1/source-analysis.md
```

The analysis parses the GLB JSON chunk and records bytes, SHA-256, meshes,
primitives, vertices, triangles, materials, textures, embedded image metadata,
extensions, external URI references, bounds, scale/origin evidence, draw-call
estimate, and a simple/signature classification. Missing files, malformed GLBs,
Git LFS pointers, and external URI dependencies fail the command.

3. Produce web, mobile, Android AR-lite, iOS USDZ, poster, schema v2 manifest,
   source-analysis, optimization, and a rejected visual-quality report:

```bash
npm run 3d:optimize-dish -- --restaurant maison-elyse --menu main --dish homard-bisque --version v1 --source assets/3d/source/maison-elyse/main/homard-bisque/v1/source.glb --write --allow-public-binaries --approved-by "Marc"
```

For storage/CDN mode, allow the origin and omit public binary writes:

```bash
VISTAIRE_3D_CDN_ORIGINS=https://cdn.example.com npm run 3d:optimize-dish -- --restaurant maison-elyse --menu main --dish homard-bisque --version v1 --source assets/3d/source/maison-elyse/main/homard-bisque/v1/source.glb --write --cdn-base-url https://cdn.example.com/vistaire
```

The optimizer requires `@gltf-transform/cli`. Web and mobile candidates use
`gltf-transform optimize` with Meshopt and WebP texture compression. AR-lite
uses a separate no-required-extension simplification profile for Android Scene
Viewer; a plain `copy` is a failure, not a fallback. The iOS USDZ candidate is
generated from the optimized AR-lite GLB geometry/textures, never from a
hard-coded proxy package. `productionFaithful` stays false until real evidence
and device QA prove the USDZ path. The optimizer also records conservative,
balanced, and aggressive candidate metadata and refuses to select a candidate
that is merely lighter without passing the strict visual gate. Generated files
are written under ignored `assets/3d/work/**` as review/staging outputs only.
Review poster outputs are rejected by default and cannot be presented as
production posters or exposed as runtime assets.

4. Review the generated schema v2 dish manifest with URLs, bytes, hashes,
   physical scale, bounds, budgets, validation state, source analysis, visual
   quality, lifecycle, rollback, and manual quality state. The manifest remains
   `review`/`failed` until a real rendered visual report is attached. Rejected
   variants are not promoted into `public/models/restaurants/**`.
5. Generate rendered visual comparison evidence:

```bash
npm run 3d:visual-compare -- --source assets/3d/source/maison-elyse/main/homard-bisque/v1/source.glb --candidate assets/3d/work/maison-elyse/main/homard-bisque/v1/mobile/homard-bisque-mobile.glb --variant mobile --out assets/3d/reports/maison-elyse/main/homard-bisque/v1/visual/mobile --threshold strict
```

The renderer uses Playwright Chromium with fixed DPR, viewport, camera,
background, and software WebGL settings. It writes before/after/diff PNGs,
`visual-report.json`, and `visual-report.md` under ignored report folders.

6. Validate the manifest and files:

```bash
npm run 3d:validate-dish -- --manifest public/models/restaurants/maison-elyse/main/homard-bisque/v1/manifest.json --require-files --strict
```

7. Record human visual approval only after the rendered report passes:

```bash
npm run 3d:approve-visual -- --manifest public/models/restaurants/maison-elyse/main/homard-bisque/v1/manifest.json --approved-by "Marc" --write
```

This command verifies report files, hashes, dimensions, diff behavior, and
source/candidate SHA-256 binding before stamping the human visual-review
fields. It does not change lifecycle status, clear validation failures, or mark
iPhone/Android real-device QA as passed.

8. Validate delivery headers after upload:

```bash
npm run 3d:validate-network -- --base-url https://example.com --manifest path/to/manifest.json --strict
```

For CDN publication, save the strict network validation JSON and pass it to
publish:

```bash
npm run 3d:validate-network -- --base-url https://example.com --manifest path/to/manifest.json --strict > assets/3d/reports/.../network-validation.json
npm run 3d:publish -- --manifest path/to/manifest.json --network-validation-report assets/3d/reports/.../network-validation.json --quality-approved --approved-by "Marc" --write
```

The report must include matching fetched byte counts and SHA-256 values for each
CDN asset.

9. Publish only after strict validation, real rendered visual evidence,
   pre-existing human approval, and explicit passed real-device Quick
   Look/Scene Viewer QA:

```bash
npm run 3d:publish -- --manifest public/models/restaurants/maison-elyse/main/homard-bisque/v1/manifest.json --quality-approved --approved-by "Marc" --write
```

10. Roll back by changing the active version, never by deleting the previous
   assets:

```bash
npm run 3d:rollback -- --restaurant maison-elyse --menu main --dish homard-bisque --to v1 --approved-by "Marc" --write
```

11. Inspect stale inactive version folders without deleting active assets:

```bash
npm run 3d:clean-stale -- --restaurant maison-elyse --menu main --dish homard-bisque --dry-run
```

Use `--write` only after the active manifest and rollback target have been
reviewed. If no active dish manifest exists, `clean-stale --write` refuses to
delete anything because there is no preserved active version to compare against.

## Non-Negotiables

See `docs/3d-visual-quality-gate.md` for the full visual identity gate.

- No GLB/USDZ before user intent in the frontend.
- No production Quick Look URL with query strings or hashes.
- No broad Git LFS rules.
- No unvalidated candidates in `public/`.
- No production approval based only on geometry/material/texture presence.
- No USDZ proxy, poster placeholder, or AR-lite copy may be presented as
  production optimization.
- No publish without before/after/diff evidence for web, mobile, and AR-lite.
- No publish without a visual report, strict SSIM/perceptual thresholds, human
  visual approval, and passed real-device iPhone/Android QA already present in
  the manifest.
- No claim of real iPhone Quick Look or Android Scene Viewer validation without
  testing on those devices.
- The phrase "exactly the same visual" means "visually indistinguishable under
  deterministic multi-angle mobile dining-distance review within strict
  thresholds." It is not a pixel-perfect claim.
- If a heavy source cannot meet delivery budgets without visible loss, reject
  it, keep the previous version, and request artist simplification or retouching.
