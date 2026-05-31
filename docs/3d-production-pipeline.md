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

public/models/restaurants/{restaurantSlug}/{menuSlug}/{dishSlug}/{version}/poster.webp
public/models/restaurants/{restaurantSlug}/{menuSlug}/{dishSlug}/{version}/manifest.json
public/models/restaurants/{restaurantSlug}/{menuSlug}/{dishSlug}/manifest.json
public/models/restaurants/{restaurantSlug}/manifest.json
```

Source, work, and report folders are ignored by Git. Production GLB/USDZ
binaries under `public/models/restaurants/**` are ignored by default and require
a reviewed asset-policy exception before they can be committed. Prefer
storage/CDN for heavy client assets; local `public/models/restaurants/**`
generation is for validation, review, and controlled deployment staging.

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
   source-analysis, optimization, and visual-quality reports:

```bash
npm run 3d:optimize-dish -- --restaurant maison-elyse --menu main --dish homard-bisque --version v1 --source assets/3d/source/maison-elyse/main/homard-bisque/v1/source.glb --write --allow-public-binaries --approved-by "Marc"
```

The optimizer requires `@gltf-transform/cli`. Web and mobile candidates use
`gltf-transform optimize` with Meshopt and WebP texture compression, with a
safe `copy` fallback recorded in the report when a source texture blocks
compression. Android AR-lite uses a no-required-extension GLB copy. The USDZ
builder creates a minimal Quick Look package for review staging; final client
delivery still requires manual iPhone validation and replacement with the
approved USDZ export when photoreal USD fidelity is required.

4. Review the generated schema v2 dish manifest with URLs, bytes, hashes,
   physical scale, bounds, budgets, validation state, source analysis, visual
   quality, lifecycle, rollback, and manual quality state.
5. Validate the manifest and files:

```bash
npm run 3d:validate-dish -- --manifest public/models/restaurants/maison-elyse/main/homard-bisque/v1/manifest.json --require-files --strict
```

6. Validate delivery headers after upload:

```bash
npm run 3d:validate-network -- --base-url https://example.com --manifest path/to/manifest.json --strict
```

7. Publish only after strict validation and visual approval:

```bash
npm run 3d:publish -- --manifest public/models/restaurants/maison-elyse/main/homard-bisque/v1/manifest.json --quality-approved --approved-by "Marc" --write
```

8. Roll back by changing the active version, never by deleting the previous
   assets:

```bash
npm run 3d:rollback -- --restaurant maison-elyse --menu main --dish homard-bisque --to v1 --approved-by "Marc" --write
```

9. Inspect stale inactive version folders without deleting active assets:

```bash
npm run 3d:clean-stale -- --restaurant maison-elyse --menu main --dish homard-bisque --dry-run
```

Use `--write` only after the active manifest and rollback target have been
reviewed.

## Non-Negotiables

- No GLB/USDZ before user intent in the frontend.
- No production Quick Look URL with query strings or hashes.
- No broad Git LFS rules.
- No unvalidated candidates in `public/`.
- No claim of real iPhone Quick Look or Android Scene Viewer validation without
  testing on those devices.
- Automated visual quality is a deterministic structural proxy. It catches
  geometry, scale, material, and texture coverage regressions, but manual visual
  approval and real-device QA remain release gates.
