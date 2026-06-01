# Vistaire Real Dish Production Pilot

Status: `real_dish_candidate_rejected`  
proofMode: `real-dish-production-pilot`  
Real dish run recorded: `true`  
Runner job recorded: `false`  
Real dish validated: `false`  
Production evidence: `false`  
Generated at: `2026-06-01T14:40:27.5733992Z`

This is a real local production-pilot run, not a publish approval, CDN approval,
iPhone Quick Look approval, Android Scene Viewer approval, or visual success
claim. The pipeline produced staging outputs and evidence, then correctly
refused approval.

## Boundaries

- Generated GLB/USDZ/poster binaries were written only under ignored
  `assets/3d/work/**`.
- Source copies and rendered visual artifacts were written only under ignored
  `assets/3d/source/**` and `assets/3d/reports/**`, then removed during final
  cleanup after their metrics were copied here.
- No new heavy binary is intentionally committed.
- The public manifest added for owner dashboard visibility is metadata only and
  remains `status: "review"` / `validationStatus: "failed"`.
- The external job runner is not present on this clean `origin/main` branch, so
  the pilot used the existing CLI pipeline directly and records runner execution
  as a blocker.
- The previous heavy report source `3D Plat/RavioliAvecAssiete.glb`
  (76,747,968 bytes) is not available in this worktree and was not claimed.

## Identity

- Restaurant: `maison-elyse`
- Menu: `pilot`
- Dish: `homard-bleu-bisque-fenouil`
- Version: `pilot-real-20260601`
- Source: `3D Plat/Homard bleu, bisque corsee & fenouil.glb`
- Local source copy: `assets/3d/source/maison-elyse/pilot/homard-bleu-bisque-fenouil/pilot-real-20260601/source.glb`
- Manifest: `public/models/restaurants/maison-elyse/pilot/homard-bleu-bisque-fenouil/pilot-real-20260601/manifest.json`
- Evidence directory produced during run: `assets/3d/reports/maison-elyse/pilot/homard-bleu-bisque-fenouil/pilot-real-20260601/`

## Before Summary

- Current runtime state for this identity: no prior production manifest.
- Current guest impact: unchanged; this pilot is not published.
- Current source: tracked grandfathered local source drop, copied into ignored
  source workspace before running.
- Known pre-run risks: large embedded PNG textures, high triangle count, no
  real CDN upload, no physical iPhone/Android evidence.

## Source Evidence

| Metric | Value |
| --- | ---: |
| Source bytes | 24,905,692 |
| SHA-256 | `c0fa60aaaf47be44895b14fe460f118882661aacaf9ed87fc9fc2e98f14b8048` |
| Triangles | 307,152 |
| Vertices | 335,122 |
| Materials | 1 |
| Textures / images | 2 / 2 |
| External URI dependencies | 0 |
| Classification | `signature` |
| Centered XZ | `true` |
| Grounded Y | `false` |

The GLB parser accepted the file, rejected no LFS pointer, and found no external
URI dependency. Grounding failed because the source bounds cross below Y=0.

## Commands Run

```powershell
npm.cmd install --prefer-offline --no-audit --no-fund
npm.cmd run 3d:analyze-source -- --source assets/3d/source/maison-elyse/pilot/homard-bleu-bisque-fenouil/pilot-real-20260601/source.glb --out assets/3d/reports/maison-elyse/pilot/homard-bleu-bisque-fenouil/pilot-real-20260601/source-analysis.json --markdown assets/3d/reports/maison-elyse/pilot/homard-bleu-bisque-fenouil/pilot-real-20260601/source-analysis.md
$env:VISTAIRE_3D_CDN_ORIGINS='https://cdn.example.com'; $env:VISTAIRE_3D_CDN_BASE_URL='https://cdn.example.com/vistaire'; npm.cmd run 3d:optimize-dish -- --restaurant maison-elyse --menu pilot --dish homard-bleu-bisque-fenouil --version pilot-real-20260601 --source assets/3d/source/maison-elyse/pilot/homard-bleu-bisque-fenouil/pilot-real-20260601/source.glb --write --cdn-base-url https://cdn.example.com/vistaire --approved-by Marc --run-visual-compare --visual-threshold strict
$env:VISTAIRE_3D_CDN_ORIGINS='https://cdn.example.com'; $env:VISTAIRE_3D_CDN_BASE_URL='https://cdn.example.com/vistaire'; $env:VISTAIRE_APP_ORIGIN='https://vistaire.example.com'; npm.cmd run 3d:prepare-cdn-upload -- --manifest public/models/restaurants/maison-elyse/pilot/homard-bleu-bisque-fenouil/pilot-real-20260601/manifest.json --out assets/3d/reports/maison-elyse/pilot/homard-bleu-bisque-fenouil/pilot-real-20260601/upload-plan.json --write
npm.cmd run 3d:approve-visual -- --manifest public/models/restaurants/maison-elyse/pilot/homard-bleu-bisque-fenouil/pilot-real-20260601/manifest.json --approved-by Marc --write
npm.cmd run 3d:finalize-manifest -- --manifest public/models/restaurants/maison-elyse/pilot/homard-bleu-bisque-fenouil/pilot-real-20260601/manifest.json --network-validation-report assets/3d/reports/maison-elyse/pilot/homard-bleu-bisque-fenouil/pilot-real-20260601/network-validation.json --write
```

`3d:optimize-dish`, `3d:approve-visual`, and `3d:finalize-manifest` exited
non-zero by design because the gates below are not satisfied.

## Candidate Decision

- Selected candidate: `none`
- Measured fallback manifest candidate: `balanced`
- Decision: rejected
- Reason: no adaptive candidate passed every budget, GLB, AR-lite, visual, and
  anti-cheat gate.

| Candidate | Total bytes | Web | Mobile | AR-lite | iOS USDZ | Visual | Budgets | GLB | AR-lite gate | Anti-cheat | Decision |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- | --- | --- |
| conservative | 63,977,093 | 4,362,716 | 3,605,132 | 24,023,784 | 31,974,868 | failed | failed | passed | failed | passed | rejected |
| balanced | 58,318,226 | 4,362,716 | 3,019,544 | 22,262,592 | 28,662,781 | failed | failed | passed | failed | passed | rejected |
| aggressive | 53,434,671 | 3,605,132 | 2,742,432 | 20,927,952 | 26,148,562 | failed | failed | passed | failed | passed | rejected |

## After Summary

- Resulting manifest status: `review`
- Resulting validation status: `failed`
- Runtime activation: none
- Guest impact after pilot: unchanged; the candidate is not published.
- What improved: web/mobile GLB sizes are within hard delivery budgets.
- What did not improve: AR-lite, iOS USDZ, total public bytes, grounding, visual
  approval, CDN validation, runner execution, and device QA are still blocked.

## Output Metrics

| Variant | Balanced bytes | Budget status | SHA-256 | Notes |
| --- | ---: | --- | --- | --- |
| web | 4,362,716 | target | `98df1a3b77825f44ddf09fff65b96171442cb60f27ffc89a877c6f1334e5c442` | CDN staging only |
| mobile | 3,019,544 | advisory | `918eb55e455a14fd3054d99f80f8a6cdde503b6c876272e64daf082ff5571aa7` | CDN staging only |
| arLite | 22,262,592 | failed | `554347a40369e0f9ee53b4a91384309bbf8617419b258c7c34e28eeb5ea523b6` | 21.23 MiB over 15 MiB fail budget |
| iosUsdz | 28,662,781 | failed | `4570641aa13a37a0405cd4819c4b9c3f9f34c949c9f72a3031ff05fe7a7e6a12` | 27.33 MiB over 5 MiB fail budget |
| poster | 10,593 | target | `25a971c10d04d1259e19e14992bbea39c1438f3ce72d43c13834996e8770b354` | Generated review poster, not production art |

Total balanced bytes: 58,318,226. Signature fail budget: 32 MiB.

## Visual Quality

The full rendered compare ran for the three candidates and all GLB variants,
writing ignored before/after/diff PNG evidence under `assets/3d/reports/**`
during the run. The generated evidence files were removed before final cleanup.
Every candidate failed the strict visual gate.

| Candidate | Variant | Mean SSIM | Perceptual | Max diff ratio | Status |
| --- | --- | ---: | ---: | ---: | --- |
| conservative | web | 0.996435 | 0.984942 | 0.996483 | failed |
| conservative | mobile | 0.995170 | 0.981549 | 0.998062 | failed |
| conservative | arLite | 0.999397 | 0.999097 | 0.114548 | failed |
| balanced | web | 0.996435 | 0.984942 | 0.996483 | failed |
| balanced | mobile | 0.991542 | 0.975057 | 0.999039 | failed |
| balanced | arLite | 0.997016 | 0.996370 | 0.354031 | failed |
| aggressive | web | 0.995170 | 0.981549 | 0.998062 | failed |
| aggressive | mobile | 0.986617 | 0.968786 | 0.999359 | failed |
| aggressive | arLite | 0.983678 | 0.987271 | 0.630512 | failed |

Strict thresholds require mean SSIM >= 0.985, perceptual score >= 0.98, and max
diff ratio <= 0.004, plus the other visual identity gates. The high max diff
ratios alone block approval.

## Dashboard Status

- Route: `/owner/3d-ar`
- Manifest source: `public/models/restaurants/maison-elyse/pilot/homard-bleu-bisque-fenouil/pilot-real-20260601/manifest.json`
- Expected owner status: `rejected`
- Status label: `Rejected`
- Next action: `Run optimize`
- Artifact behavior: metadata only; no committed GLB/USDZ binaries.
- Caveat: ignored local reports made the running dashboard richer during the
  pilot. The tracked manifest alone still keeps the dashboard in a failed
  review state because `visualQuality.status` is `failed`.

## CDN And Device Gates

- CDN upload plan: generated locally with 5 entries; the ignored raw
  `upload-plan.json` was removed after the plan summary was recorded here.
- CDN upload: not performed.
- Network/header/hash validation: not performed.
- iPhone Quick Look: not tested.
- Android Scene Viewer: not tested.
- USDZ URL shape: stable `.usdz` path, no query string, no hash.

The upload plan specifies immutable cache headers, `model/vnd.usdz+zip`, and
`Content-Disposition: inline` for USDZ. It is not CDN proof.

## Exact Blockers

- `runner`: no external runner exists on this clean branch, so no Supabase job
  claim/heartbeat/status update was executed.
- `source.groundedY`: source and candidates are not grounded; production AR
  requires `groundedY: true`.
- `arLite.bytes`: balanced AR-lite is 22,262,592 bytes, above the 15 MiB fail
  budget.
- `iosUsdz.bytes`: balanced USDZ is 28,662,781 bytes, above the 5 MiB fail
  budget.
- `publicTotal.bytes`: balanced total is 58,318,226 bytes, above the 32 MiB
  signature fail budget.
- `visual.maxDiffRatio`: every candidate/variant exceeded the 0.004 strict max
  diff threshold.
- `manualReview`: approval command refused the manifest because strict visual
  evidence is not passing.
- `deviceQa`: no real iPhone or Android evidence exists.
- `cdn`: no upload or fetched-byte/hash/header validation exists.
- `finalize`: finalize command refused the manifest because visual, device, CDN,
  grounding, budget, and production-poster/USDZ faithfulness gates are missing.

## Lessons Learned

- The real Homard source is easier than the missing 76.7 MB ravioli source, but
  still not production-ready for AR.
- Web/mobile optimization can hit byte budgets without pretending the AR stack is
  safe.
- The current optimizer still leaves AR-lite and USDZ too heavy when AR-lite
  keeps 2048 PNG textures and substantial geometry.
- A failed manifest is useful dashboard evidence, but public metadata must not
  include local absolute workstation paths.
- CDN and device gates need real infrastructure and hardware; browser automation
  cannot substitute for them.

## Next Retouch Recommendations

- Geometry: ground the model at Y=0, freeze origin/scale, remove hidden shells,
  prune tiny islands, and target a dedicated AR mesh below 80k triangles.
- Textures/materials: bake detail into an atlas, create AR-specific 1024 or
  lower textures, and avoid embedding large PNGs in AR-lite.
- USDZ: generate from a true iOS-friendly low-poly/low-texture source, not from
  the current AR-lite output.
- Visual QA: rerun strict rendered comparison after retouch and inspect the
  high-diff angles before requesting human review.
- Acceptance target: AR-lite <= 15 MiB, USDZ <= 5 MiB, total <= 32 MiB, grounded
  bounds, strict visual pass, then human review plus both real devices.

## Remaining Risk

- No candidate was selected.
- External runner execution was not available.
- Strict visual compare did not pass.
- Human visual approval did not pass.
- CDN upload and network validation were not performed.
- Real iPhone Quick Look and Android Scene Viewer were not tested.
- The older `RavioliAvecAssiete.glb` heavy pilot remains non-reproducible in this
  worktree because the source file is absent.

## Git Hygiene

- Heavy outputs committed: `false`
- New LFS rules added: `false`
- Public runtime binaries added: `false`
- Tracked pilot metadata: report markdown plus failed version manifest
- Ignored evidence paths reviewed and removed: `assets/3d/source/**`,
  `assets/3d/work/**`, `assets/3d/reports/**`
