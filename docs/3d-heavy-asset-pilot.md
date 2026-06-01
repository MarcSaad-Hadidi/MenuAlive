# Vistaire Heavy 3D Asset Pilot

Status: `real_heavy_local_rejected`  
proofMode: `real-heavy-local`  
Real heavy asset run recorded: `true`  
Real heavy asset validated: `false`  
Production evidence: `false`  
Generated at: `2026-05-31T16:00:00.000Z`

This report is a local pipeline benchmark, not a finalize, publish, CDN, iPhone Quick Look, or Android Scene Viewer approval.
Automated visual compare only means deterministic render evidence was produced by the CLI; it is still separate from human approval and real device QA.

## Boundaries

- Generated outputs are not committed.
- Heavy source, work GLB/USDZ, visual PNGs, posters, raw reports, and logs must stay outside Git.
- Do not write benchmark binaries into `public/models/restaurants/**`.
- CDN is not validated unless a real upload plus network header/hash validation report is attached.
- Device QA is not validated unless real iPhone and Android evidence is attached.

## Identity

- Restaurant: `maison-elyse`
- Menu: `pilot`
- Dish: `ravioli-assiette`
- Version: `pilot-heavy-20260531`

## Source Evidence

- Source label: `3D Plat/RavioliAvecAssiete.glb`
- Source bytes: 76,747,968
- Source SHA-256: `0911a4a20635f9d7b76dc8d81b5552c0440cd3d9d8fbbe41daccc517043b1b59`
- Triangles: 832,238
- Vertices: 1,669,603
- Materials: 3
- Textures: 4
- Images: 2
- Classification: `signature`

## Candidate Decision

- Selected candidate: `none`
- Measured candidate for output metrics: `balanced`
- Decision: No adaptive candidate passed every budget, GLB, AR-lite, visual, and anti-cheat gate.

| Candidate | Total bytes | Visual | Budgets | GLB | AR-lite | Anti-cheat |
| --- | ---: | --- | --- | --- | --- | --- |
| conservative | 190,754,376 | failed | failed | passed | failed | passed |
| balanced | 190,203,409 | failed | failed | passed | failed | passed |
| aggressive | 189,441,135 | failed | failed | passed | failed | passed |

## Outputs

- Measured candidate total output bytes: 190,203,409

### Output bytes by variant

| Variant | Value |
| --- | ---: |
| web | 14,859,684 |
| mobile | 13,915,816 |
| arLite | 73,327,688 |
| iosUsdz | 88,089,629 |
| poster | 10,592 |

## Reductions

| Metric | Source | Output | Reduction |
| --- | ---: | ---: | ---: |
| Measured candidate bytes | 76,747,968 | 190,203,409 | -147.8% |

### Triangle Reductions

| Variant | Source | Output | Reduction |
| --- | ---: | ---: | ---: |
| web | 832,238 | 829,271 | 0.4% |
| mobile | 832,238 | 829,271 | 0.4% |
| arLite | 832,238 | 829,380 | 0.3% |

### Material Reductions

| Variant | Source | Output | Reduction |
| --- | ---: | ---: | ---: |
| web | 3 | 2 | 33.3% |
| mobile | 3 | 2 | 33.3% |
| arLite | 3 | 2 | 33.3% |

### Texture Reductions

| Variant | Source | Output | Reduction |
| --- | ---: | ---: | ---: |
| web | 4 | 2 | 50.0% |
| mobile | 4 | 2 | 50.0% |
| arLite | 4 | 2 | 50.0% |

## Visual Quality

- Status: `automated_visual_compare_failed`
- Visual score: 0.969
- Mean SSIM: 0.957
- Perceptual score: 0.969
- Max diff ratio: 0.998
- Max silhouette diff: 0
- Max color delta: 0.04
- Max texture blur delta: 0.003
- Max material drift: 0.058

## Rejected Candidates

- conservative: budgets: web: 14.17 MiB exceeds fail budget 11.44 MiB; mobile: 13.70 MiB exceeds fail budget 7.63 MiB; arLite: 69.96 MiB exceeds fail budget 15.00 MiB; iosUsdz: 84.08 MiB exceeds fail budget 5.00 MiB; publicTotal: 181.92 MiB exceeds fail budget 32.00 MiB; arLiteValidation: AR-lite must be embedded, extension-light, grounded, and centered; visualGate: web: failed; mobile: failed; arLite: failed
- balanced: budgets: web: 14.17 MiB exceeds fail budget 11.44 MiB; mobile: 13.27 MiB exceeds fail budget 7.63 MiB; arLite: 69.93 MiB exceeds fail budget 15.00 MiB; iosUsdz: 84.01 MiB exceeds fail budget 5.00 MiB; publicTotal: 181.39 MiB exceeds fail budget 32.00 MiB; arLiteValidation: AR-lite must be embedded, extension-light, grounded, and centered; visualGate: web: failed; mobile: failed; arLite: failed
- aggressive: budgets: web: 13.70 MiB exceeds fail budget 11.44 MiB; mobile: 13.11 MiB exceeds fail budget 7.63 MiB; arLite: 69.90 MiB exceeds fail budget 15.00 MiB; iosUsdz: 83.95 MiB exceeds fail budget 5.00 MiB; publicTotal: 180.67 MiB exceeds fail budget 32.00 MiB; arLiteValidation: AR-lite must be embedded, extension-light, grounded, and centered; visualGate: web: failed; mobile: failed; arLite: failed

## CDN And Device Gates

- CDN validation: `not_validated`
- Delivery mode: `cdn`
- iPhone Quick Look: `not_tested`
- Android Scene Viewer: `not_tested`

## iPhone Quick Look manual checklist

- [ ] Use a real iPhone with Safari.
- [ ] Open a stable HTTPS USDZ URL with no query string and no hash.
- [ ] Confirm Quick Look opens instead of downloading.
- [ ] Check scale, grounding, orientation, texture fidelity, and material drift.
- [ ] Record device, iOS version, Safari version, network, tester, timestamp, notes, and evidence.

## Android Scene Viewer manual checklist

- [ ] Use a real Android device with Chrome and ARCore support.
- [ ] Open the stable HTTPS GLB/Scene Viewer link.
- [ ] Confirm Scene Viewer opens, or record the unsupported fallback.
- [ ] Check scale, grounding, orientation, texture fidelity, and material drift.
- [ ] Record device, Android version, Chrome version, ARCore status, network, tester, timestamp, notes, and evidence.

## Remaining Risk

- No candidate was selected by the pipeline.
- Strict automated visual compare is not passed.
- bounds.groundedY: must be true for production AR
- web: 14.17 MiB exceeds fail budget 11.44 MiB
- mobile: 13.27 MiB exceeds fail budget 7.63 MiB
- arLite: 69.93 MiB exceeds fail budget 15.00 MiB
- iosUsdz: 84.01 MiB exceeds fail budget 5.00 MiB
- publicTotal: 181.39 MiB exceeds fail budget 32.00 MiB
- No human visual approval was recorded by this benchmark.
- No real iPhone Quick Look test was performed.
- No real Android Scene Viewer test was performed.
- No real CDN upload or network header/hash validation was performed.

