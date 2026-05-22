# USDZ Optimization Notes

## Current Demo Assets

These assets are served from `public/models/demo`. GLB files are used by
`model-viewer` for web 3D and Android AR. Source USDZ files remain public
reference assets, but iPhone Quick Look production handoff must use only an
approved `arUsdzUrl` under `/models/demo/ar-lite/`.

| Dish | GLB bytes | GLB MiB | USDZ bytes | USDZ MiB | USDZ change |
| --- | ---: | ---: | ---: | ---: | ---: |
| Ravioles chevre miel | 76,609,104 | 73.06 | 70,375,208 | 67.12 | -60.30% |
| Homard bisque | 29,010,112 | 27.67 | 26,352,806 | 25.13 | -48.33% |
| Souffle chocolat | 27,286,348 | 26.02 | 24,873,890 | 23.72 | -47.29% |
| Maison Elyse N1 | 86,380 | 0.08 | 208,984 | 0.20 | unchanged |

Only these production 3D assets should live in `public/models/demo`:

- `ravioles-chevre-miel.glb`
- `ravioles-chevre-miel.usdz`
- `homard-bisque.glb`
- `homard-bisque.usdz`
- `ar-lite/homard-bisque-ar-lite.glb`
- `ar-lite/homard-bisque-ios-quicklook-ultra.usdz`
- `souffle-chocolat.glb`
- `souffle-chocolat.usdz`
- `maison-elyse-n1.glb`
- `maison-elyse-n1.usdz`

The former ravioles and souffle iPhone AR-lite USDZ files failed real iPhone
Quick Look visual QA and must not remain as public production assets:

- `ar-lite/ravioles-chevre-miel-ios-quicklook-ultra.usdz`
- `ar-lite/souffle-chocolat-ios-quicklook-ultra.usdz`

## Public Asset Hygiene

The `public` directory is served directly by Next.js. Backups, generated
intermediates, source drops, and unvalidated candidates must not be kept there,
because they become public URLs and can be fetched even when they are not
referenced by `demoMenuData.ts`.

These Homard intermediate files were removed from `public/models/demo` because
they were not production references:

- `homard-bisque-ar.glb`
- `homard-bisque-ar.usdz`
- `homard-bisque-ar-lite.usdz`
- `homard-bisque-ios-quicklook-v2.usdz`
- `homard-bisque.before-mesh-opt.glb`
- `homard-bisque.before-texture-opt.glb`
- `homard-bisque.pre-opt.glb`
- `homard-bisque.raw-backup.glb`
- `homard-bisque.user-source.glb`
- `homard-bisque.user-source.usdz`

Future 3D candidates and heavy source drops should stay outside `public` until
they are structurally valid, visually reviewed, and intentionally wired into the
frontend. If a source asset must remain in the repo, place it in a documented
non-public source area; otherwise keep local drops ignored and outside commits.

## Ravioles Diagnosis

`ravioles-chevre-miel.usdz` is heavy because geometry dominates the package.
The two largest USDZ entries are USDA geometry files:

| Entry | Bytes | MiB | Points |
| --- | ---: | ---: | ---: |
| `geometries/Geometry_5.usda` | 116,087,039 | 110.71 | 1,231,088 |
| `geometries/Geometry_11.usda` | 47,565,520 | 45.36 | 433,119 |

The two included 2048x2048 PNG textures are only about 12.78 MiB combined.
Texture compression alone cannot meaningfully solve the ravioles USDZ size.

## Applied Optimization

The production USDZ files were rebuilt with Pixar OpenUSD (`usd-core`) by
converting package layers from text USDA to binary USDC and repacking with
`UsdUtils.CreateNewUsdzPackage`.

This is a data-preserving optimization:

- geometry point, face, and index counts stayed identical;
- material, shader, texture count, and resolved texture filenames stayed
  identical;
- world bounds stayed identical;
- GLB files and web 3D rendering paths were not changed;
- public USDZ URLs stayed stable.

Do not use blind geometry simplification or texture resizing for these final
USDZ files unless a rendered old-vs-new review proves the result is visually
lossless.

## Real-Device Failure Status

The latest real iPhone Safari / Quick Look testing invalidated two earlier
technical approvals:

- Ravioles: visually broken, fragmented, hole-filled/noisy, not premium.
- Souffle: plate rendered black, ice cream rendered gray, material/color
  fidelity broken.
- Homard: remains the approved reference and should not be changed unless a
  regression is discovered.

Ravioles and souffle must keep their original `model3dUrl`, `webModel3dUrl`,
and `usdzUrl` source fields, but they must not declare `arUsdzUrl` until a new
candidate passes both the 5 MiB production gate and real iPhone visual review.

Souffle investigation notes:

- Source plate material is warm off-white, metallic `0`, roughness about `0.68`;
  a black plate is therefore a Quick Look/export/candidate failure, not the
  intended art direction.
- The source food base-color texture has alpha despite an opaque material. Avoid
  letting Quick Look interpret that texture alpha as opacity.
- The old ultra path used a 512px texture cap and very low final JPEG quality,
  which is a likely cause of gray/flat ice cream and weak dessert color.
- The iOS builder now reuses the source converter's souffle plate material and
  normal-safety approach before candidate export, but candidates still require
  real iPhone approval.

Ravioles investigation notes:

- The source food topology is fragmented: duplicate shells plus many tiny
  disconnected components.
- Automatic duplicate-shell removal and island pruning can delete visible food,
  sauce, and herb detail.
- Simplifying that topology with unlocked borders can produce holes and noisy
  scan-like fragments.
- A clean retopology or dedicated AR rebuild is required before reactivation.

## Quality Rule

Do not replace a production USDZ unless the candidate is visually lossless:

- same perceived colors and material response;
- same scale, pivot, orientation, and plate/support;
- no visible food, garnish, plate, or premium detail removed;
- no blind texture downscaling;
- no geometry simplification without old-vs-new visual QA.

## Safe Pipeline

1. Keep the original production assets untouched.
2. Create candidates outside production URLs.
3. Prefer versioned filenames over replacing existing immutable URLs.
4. Regenerate USDZ through a known USDZ-capable pipeline, not by manually
   rezipping package contents.
5. Run structural validation before any visual review.
6. Run browser/model-viewer visual QA for GLB candidates.
7. Run real iPhone Safari Quick Look QA for USDZ candidates before production.
   Without real-device evidence tied to the exact URL, byte size, SHA-256, and
   commit/deploy ID, the candidate remains `needs-review` and must not declare
   `arUsdzUrl`.

## Validation Commands

Use `npm.cmd` on Windows PowerShell when `npm.ps1` is blocked by execution
policy.

```powershell
npm.cmd run demo:validate-assets
npm.cmd run demo:validate-network
npm.cmd run lint
npm.cmd run build
npm.cmd run dev
```

USDZ binary-layer optimization and binary USDZ asset validation require the
Python `usd-core` package. `demo:validate-assets` intentionally fails for
binary-only USDZ files if OpenUSD is not available, because otherwise it cannot
verify geometry, plate meshes, placement, materials, or resolved textures.

```powershell
python -m pip install --user usd-core
$env:USDZ_VALIDATION_PYTHON = "python"
npm.cmd run demo:validate-assets
python scripts/optimize-usdz-binary-layers.py public/models/demo/ravioles-chevre-miel.usdz public/models/demo/review/ravioles-chevre-miel.candidate.usdz
python scripts/compare-usdz-scenes.py path/to/original.usdz path/to/candidate.usdz
```

For `demo:validate-network`, start the app first and set the base URL if needed:

```powershell
$env:VALIDATE_DEMO_BASE_URL = "http://localhost:3000"
npm.cmd run demo:validate-network
```

## iPhone Safari Checklist

Run this on a real iPhone in Safari over HTTPS:

1. Freeze the candidate manifest: dish slug, URL, byte size, SHA-256,
   commit/deploy ID, device model, iOS/Safari version, network, and reviewer.
2. Open each active dish in iPhone Safari over HTTPS.
3. Confirm inactive dishes show no `Vue AR prête`, no Quick Look button, and no
   source or failed-candidate USDZ request.
4. For active dishes, tap `Voir en 3D`, then `Afficher devant moi`.
5. Record first-open and second-open timings on WiFi and 5G, with and without
   clearing Safari website data.
6. Capture screen recording plus an external AR photo/video with a scale
   reference.
7. Check color, material, plate/support, orientation, visible details, scale,
   grounding, and redownload behavior.

Desktop Chrome or Playwright with an iOS user agent can verify UI branching, but
it does not validate real Apple Quick Look behavior.

## Tools Needed For Deeper Optimization

The local Windows environment now has Pixar OpenUSD Python bindings installed as
`usd-core`. For any future optimization that changes geometry, textures, or
materials, use one of these reliable pipelines:

- Blender 3.6+ with the original source model to inspect and selectively reduce
  invisible or redundant geometry, then export GLB and regenerate USDZ.
- Reality Converter or Xcode tools on macOS to export Quick Look-compatible
  USDZ and verify package validity.
- OpenUSD tools (`usdchecker`, `usdcat`, `usdzip`) to inspect and package USDZ
  safely.
