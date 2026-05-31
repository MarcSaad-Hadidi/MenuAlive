# Vistaire 3D Visual Quality Gate

Vistaire rejects optimized 3D assets by default. A candidate becomes eligible
only after it proves premium visual equivalence with real rendered comparison
evidence, strict metrics, and human approval.

The production wording for "exactly the same visual" is:

```text
visually indistinguishable under deterministic multi-angle mobile dining-distance review within strict thresholds
```

## Required Evidence

Every approved or published production manifest must include:

- before, after, and diff artifacts for web
- before, after, and diff artifacts for mobile
- before, after, and diff artifacts for AR-lite
- per-angle reports for at least four deterministic angles per variant
- SSIM and perceptual scores
- strict pixel diff and silhouette thresholds
- texture sharpness, color drift, material drift, scale/origin, low-poly, and
  appetite-preservation checks
- a visual report path
- human approval with reviewer name and date

## Automatic Rejection

Reject the candidate when any of these are true:

- visual quality is based only on geometry, material, or texture presence
- the USDZ is a minimal proxy package
- the poster is a placeholder
- AR-lite is a copy presented as optimization
- before/after/diff artifacts are missing
- the visual report is missing
- manual human approval is missing
- textures are blurry
- silhouette, color, material, scale, or origin changes
- visible low-poly artifacts appear
- the dish loses appetite appeal

If a source model cannot meet budgets without visible loss, do not force it.
Reject it, keep the previous version, and request artist retouching or manual
source simplification.

## Publish Rule

`npm run 3d:publish` may only promote a manifest that is already approved by
the strict visual gate. `--quality-approved` confirms the publish operation; it
does not create approval, does not clear failures, and does not replace the
visual report. Approved publication requires schema v2 and existing local
report artifacts at validation time.

Generated variants that have not passed this gate stay in ignored
`assets/3d/work/**`; they must not be exposed under `public/models/restaurants/**`
as runtime assets.
