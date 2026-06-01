# Vistaire Heavy Asset Acceptance Matrix

The production visual definition is:

> visually indistinguishable under deterministic multi-angle mobile dining-distance review within strict thresholds.

This is not pixel-perfect, and it is not a license to publish a visibly degraded mesh.

| Gate | Target | Hard stop |
| --- | --- | --- |
| Web GLB bytes | 6 MB target, 8 MB warning | 12 MB fail |
| Mobile GLB bytes | 3 MB target, 5 MB warning | 8 MB fail |
| AR-lite GLB bytes | 8 MiB target, 12 MiB warning | 15 MiB fail |
| AR-lite triangles | 30k-70k target, 100k warning | 150k fail |
| iOS USDZ bytes | 3.5 MB target, 4.5 MB warning | 5 MiB fail |
| Signature dish total runtime payload | 14 MB target, 24 MB warning | 32 MiB fail |
| AR placement | floor, fixed scale, centered X/Z, grounded Y | Any false geometry gate blocks publish |
| GLB structure | embedded buffers/images, no unsafe external URI | External runtime dependency blocks publish |
| USDZ delivery | stable HTTPS, no query/hash, inline disposition | Missing Quick Look headers block publish |
| Visual evidence | strict multi-angle before/after/diff | Missing or failing visual evidence blocks approval |
| Human review | approved by an accountable reviewer | Missing approval blocks finalize/publish |
| Device QA | real iPhone and real Android evidence | Not-tested blocks publish |
| CDN | byte, SHA-256, content-type, cache headers | Missing or mismatched validation blocks finalize |

## Strategy Matrix

| Strategy | Purpose | Expected use |
| --- | --- | --- |
| Conservative | Preserve food detail and material fidelity | First high-quality candidate |
| Balanced | Primary production candidate | Usually best tradeoff |
| Aggressive | Try to fit mobile and total budgets | Use when balanced is over budget |
| Emergency AR | Dedicated AR-lite rescue path | Use only if visual evidence remains acceptable |
| Artist retouch required | Honest rejection state | Use when automation would visibly damage the dish |

## Non-Negotiable Publish Rule

Publishing requires all production gates. `productionFaithful` remains false unless real evidence exists. A local benchmark, generated USDZ, or dashboard preview is not an iPhone or Android validation.
