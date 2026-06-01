# Owner 3D/AR source uploads

`/owner/3d-ar` can stage raw GLB source files only when private storage is
configured. The upload path is deliberately separate from `public/models/**` and
from ignored local source folders.

## Storage

- Source GLB files: private Supabase Storage bucket.
- Metadata: `public.owner_3d_ar_source_uploads`.
- Public runtime GLB/USDZ/posters: still require the existing validated
  pipeline/CDN publish flow.
- No signed URLs are returned by the owner upload APIs.
- Persistent pipeline tracking: staged sources can be referenced by the
  `owner_3d_*` tables in `docs/owner-3d-ar-persistent-pipeline.md`.

Recommended private bucket name:

```text
vistaire-3d-sources
```

Objects are written under:

```text
sources/{restaurantSlug}/{menuSlug}/{dishSlug}/{version}/{sha256}.glb
```

## Apply

This repo has no Supabase CLI wired in, so apply the migration manually:

1. Create a private Supabase Storage bucket.
2. Apply `supabase/migrations/0003_owner_3d_ar_source_uploads.sql`.
3. Set the server environment:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Existing Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only owner API access |
| `VISTAIRE_3D_SOURCE_BUCKET` | Private source bucket name |
| `VISTAIRE_3D_SOURCE_UPLOAD_MAX_BYTES` | Optional byte cap, default 25 MiB |

## Failure state

If storage or metadata is not configured, `/owner/3d-ar` shows
`storage not configured`. Upload actions do not claim success and the API
returns `503` for source creation.

The first upload route intentionally requires `content-length` and keeps the
default cap conservative because App Router multipart parsing buffers the body
before the file object is available. Larger source packages should move to a
streaming or resumable upload path before raising that cap.

## Asset policy

Raw source uploads must not be committed to Git, Git LFS, `public/models/**`,
`assets/3d/source/**`, or `assets/3d/work/**`. Keep this flow aligned with
`docs/repo-asset-policy.md`.
