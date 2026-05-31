# Vistaire 3D Asset Budgets

Authoritative budget values live in `scripts/3d/shared/budgets.mjs`. This page
is an operator reference only; do not duplicate policy thresholds outside the
validator without updating tests.

## Byte Budgets

| Variant | Target | Warning | Fail |
| --- | ---: | ---: | ---: |
| Web GLB | 6 MB | 8 MB | 12 MB |
| Mobile GLB | 3 MB | 5 MB | 8 MB |
| Android AR-lite GLB | 8 MiB | 12 MiB | 15 MiB |
| iOS USDZ Quick Look | 3.5 MB | 4.5 MB | 5 MiB |
| Poster image | 150 KB | 250 KB | 500 KB |
| Simple dish public total | 8 MB | 14 MB | 22 MiB |
| Signature dish public total | 14 MB | 24 MB | 32 MiB |

## Geometry And Material Targets

These are production goals for optimization reports. Source analysis now records
triangle, vertex, bounds, material, texture, image, extension, and external URI
evidence. Byte and schema gates are hard validators; geometry and visual-quality
scores are review gates and should be tightened per restaurant once several real
client assets have been measured.

| Metric | Target | Warning | Fail |
| --- | ---: | ---: | ---: |
| Web triangles | 150k | 250k | 350k |
| Mobile triangles | 80k | 140k | 220k |
| AR-lite triangles | 70k | 110k | 150k |
| Mobile vertices | 60k | 120k | 180k |
| Materials | 6 | 10 | 16 |
| Textures | 6 | 10 | 16 |
| Web max texture size | 2048 | 3072 | 4096 |
| Mobile/AR max texture size | 1024 | 1536 | 2048 |

## Automatic Failures

- Missing, empty, malformed, or Git LFS pointer files.
- Unsafe URLs, path traversal, protocol URLs, or Quick Look query/hash URLs.
- External URI resources in production GLBs.
- Required extensions in Android AR-lite manifests.
- Public bytes above fail budgets.
- Published manifests that are not validation-passed or visually approved.
- Runtime selection of any GLB/USDZ outside approved demo or restaurant asset
  roots.
