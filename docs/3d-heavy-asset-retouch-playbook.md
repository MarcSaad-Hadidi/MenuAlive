# Vistaire Heavy Asset Retouch Playbook

Automatic optimization is allowed to reject a dish. It must not hide visible degradation or publish a proxy.

Use `npm run 3d:retouch-report` after a failed source analysis or candidate report:

```bash
npm run 3d:retouch-report -- \
  --source-analysis assets/3d/reports/<restaurant>/<menu>/<dish>/<version>/source-analysis.json \
  --candidate-report assets/3d/reports/<restaurant>/<menu>/<dish>/<version>/candidate-report.json \
  --out assets/3d/reports/<restaurant>/<menu>/<dish>/<version>/artist-retouch.md
```

## Artist Instructions

Typical retouch blockers:

- move the lowest visible geometry to Y=0;
- center the plated dish around X=0 and Z=0;
- remove hidden shells, duplicate plates, duplicate triangles, and tiny detached islands;
- produce a dedicated AR mesh under 70k triangles, with an emergency fallback closer to 30k-50k when silhouette allows;
- consolidate duplicate materials;
- bake variant-specific texture atlases;
- use 2048 textures for web when needed, 1024 for mobile, and 512/1024 for AR-lite and iOS;
- keep food color, gloss, translucency, and appetite cues intact;
- avoid gray, blurry, over-smoothed, or visibly low-poly results.

## Required Evidence After Retouch

A retouched asset returns to the normal pipeline. It still needs:

- source byte and SHA-256 verification;
- repair report;
- candidate report for conservative, balanced, aggressive, and emergency AR strategies when `--heavy-asset` is used;
- strict visual before/after/diff evidence;
- human approval;
- CDN validation;
- real iPhone Quick Look QA;
- real Android Scene Viewer QA.

## Rejection Is Valid

If the source cannot fit the AR-lite or USDZ budgets without visible degradation, mark the candidate as artist-retouch-required. The owner dashboard should show exact blockers rather than a fake success state.
