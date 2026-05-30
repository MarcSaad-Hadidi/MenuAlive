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

Source and work folders are ignored by Git. Production GLB/USDZ binaries under
`public/models/restaurants/**` are ignored by default and require a reviewed
asset-policy exception. Prefer storage/CDN for heavy client assets.

## Workflow

1. Put source assets outside Git or under ignored `assets/3d/source/**`.
2. Analyze the source:

```bash
npm run 3d:analyze-source -- --restaurant maison-elyse --menu main --dish homard-bisque --version v1
```

3. Produce web, mobile, Android AR-lite, iOS USDZ, and poster variants in
   ignored work folders:

```bash
npm run 3d:optimize-dish -- --restaurant maison-elyse --menu main --dish homard-bisque --version v1 --dry-run
```

4. Generate a schema v2 dish manifest with URLs, bytes, hashes, physical scale,
   bounds, budgets, validation state, and manual quality state.
5. Validate the manifest and files:

```bash
npm run 3d:validate-dish -- --manifest path/to/manifest.json --strict
```

6. Validate delivery headers after upload:

```bash
npm run 3d:validate-network -- --base-url https://example.com --manifest path/to/manifest.json --strict
```

7. Publish only after strict validation and visual approval:

```bash
npm run 3d:publish -- --manifest path/to/manifest.json --quality-approved --approved-by "Marc" --dry-run
```

8. Roll back by changing the active version, never by deleting the previous
   assets:

```bash
npm run 3d:rollback -- --restaurant maison-elyse --menu main --dish homard-bisque --to previous --dry-run
```

## Non-Negotiables

- No GLB/USDZ before user intent in the frontend.
- No production Quick Look URL with query strings or hashes.
- No broad Git LFS rules.
- No unvalidated candidates in `public/`.
- No claim of real iPhone Quick Look or Android Scene Viewer validation without
  testing on those devices.
