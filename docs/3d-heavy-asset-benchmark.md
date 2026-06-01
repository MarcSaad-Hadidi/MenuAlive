# Vistaire Heavy Asset Benchmark

Vistaire treats a heavy 3D dish as production-ready only after all of these gates pass:

- private source upload resolved with byte and SHA-256 verification;
- external runner claim, heartbeat, repair, optimization, and artifact persistence;
- web, mobile, AR-lite GLB, iOS USDZ, and poster variants generated;
- strict deterministic visual evidence for web, mobile, and AR-lite;
- human visual approval;
- CDN byte, hash, and header validation;
- real iPhone Quick Look QA;
- real Android Scene Viewer QA.

`npm run 3d:benchmark-heavy` is intentionally source-first. It finds available pilot sources such as Homard and Ravioli, records source geometry, grounding, centering, triangle count, and duplicate/tiny-island risk, and keeps missing fixtures explicit. It does not claim that a dish passed.

## Command

```bash
npm run 3d:benchmark-heavy -- --markdown --out docs/3d-heavy-asset-benchmark.local.md
```

Use `--source path/to/source.glb` to add a one-off local source to the benchmark table.

## Benchmark Targets

| Target | Required source | Pass claim allowed? |
| --- | --- | --- |
| Homard pilot | Local private GLB or uploaded Supabase source | Only after optimize-heavy, visual, CDN, and device gates |
| Ravioli pilot | Local private GLB or uploaded Supabase source | Only after optimize-heavy, visual, CDN, and device gates |
| Synthetic geometry-heavy fixture | Lightweight generated fixture or explicit source | Protocol coverage only |
| Synthetic texture-heavy fixture | Lightweight generated fixture or explicit source | Protocol coverage only |
| Synthetic mixed-heavy fixture | Lightweight generated fixture or explicit source | Protocol coverage only |
| Already-optimized control | Lightweight generated fixture or explicit source | Protocol coverage only |

## Honest Status Rules

- `productionClaim: false` means no production claim was made.
- `realHeavyAssetPassed: false` remains false until a real dish passes every downstream gate.
- Missing real sources are reported as missing instead of silently skipped.
- Synthetic fixtures prove command wiring and validation behavior, not market-level heavy-asset success.

## Follow-Up Evidence

For each real dish, keep generated binaries and visual artifacts outside Git and store review evidence through the owner 3D artifact path. The benchmark row should link to:

- `source-analysis.json`;
- `repair-report.json`;
- `candidate-report.json`;
- `visual-quality.json`;
- before, after, and diff images for each required angle;
- storage artifact refs and checksums;
- CDN validation report;
- iPhone and Android device QA records.
