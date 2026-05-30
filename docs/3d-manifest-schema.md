# Vistaire 3D Manifest Schema

Vistaire supports legacy schema v1 manifests and production schema v2 manifests.
New production work should use schema v2.

## Dish Manifest V2

Required identity and lifecycle fields:

```json
{
  "schemaVersion": 2,
  "kind": "vistaire.dish-3d-manifest",
  "restaurantSlug": "maison-elyse",
  "menuSlug": "main",
  "dishSlug": "homard-bisque",
  "activeVersion": "v1",
  "status": "approved",
  "validationStatus": "passed"
}
```

Required variants:

- `poster`
- `web`
- `mobile`
- `arLite`
- `iosUsdz`

Each variant must have a stable URL, byte count, and SHA-256 hash. Production
local paths must stay under `/models/restaurants/**`; demo fixture paths may use
`/models/demo/**` only in demo contexts. Quick Look URLs must end in `.usdz`
with no query string or hash.

Schema v2 also requires:

- `physicalScaleMeters`
- `bounds.centeredXZ`
- `bounds.groundedY`
- `budgets.profile`
- `quality.manualVisualApprovalRequired`
- `quality.manualVisualApproved`

Published manifests must have no warnings or fails, `validationStatus:
"passed"`, `approvedAt`, `publishedAt`, and manual visual approval when
required.

## Restaurant Manifest V2

Restaurant manifests roll up dish manifests:

```json
{
  "schemaVersion": 2,
  "kind": "vistaire.restaurant-3d-manifest",
  "restaurantSlug": "maison-elyse",
  "menus": [
    {
      "menuSlug": "main",
      "dishes": ["homard-bisque"],
      "activeVersions": {
        "homard-bisque": "v1"
      }
    }
  ],
  "validationStatus": "passed",
  "validation": {
    "warnings": [],
    "fails": []
  }
}
```

Use `npm run 3d:manifest` to generate the rollup from one or more dish
manifests.
