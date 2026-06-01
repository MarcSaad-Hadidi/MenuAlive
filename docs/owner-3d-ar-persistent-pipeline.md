# Owner 3D/AR persistent pipeline jobs

`/owner/3d-ar` now has the first persistent job model for the 3D/AR
operations center. The dashboard records jobs and surfaces runner commands,
logs, artifacts, and next actions. It does not pretend that a serverless request
can run long optimization or visual QA work in the background.

## Data model

The user-facing model names map to Postgres-safe table names:

| Requested model | Supabase table |
| --- | --- |
| `3d_asset_sources` | `public.owner_3d_asset_sources` |
| `3d_asset_versions` | `public.owner_3d_asset_versions` |
| `3d_pipeline_jobs` | `public.owner_3d_pipeline_jobs` |
| `3d_pipeline_artifacts` | `public.owner_3d_pipeline_artifacts` |
| `3d_visual_reviews` | `public.owner_3d_visual_reviews` |
| `3d_device_qa` | `public.owner_3d_device_qa` |
| `3d_publish_events` | `public.owner_3d_publish_events` |

Postgres identifiers cannot start with a digit unless every reference is quoted,
so the migration uses the existing `owner_3d_*` convention instead of creating
fragile quoted `"3d_*"` tables.

Apply:

```bash
supabase/migrations/0004_owner_3d_pipeline_jobs.sql
```

This repository does not apply Supabase migrations automatically from the app.
Use the Supabase SQL editor or project migration workflow, then set
`NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for the owner APIs.

Configure 3D/AR restaurant access separately from the global owner allowlist.
The 3D owner APIs fail closed until one of these is set:

```text
VISTAIRE_OWNER_3D_RESTAURANT_SLUGS=maison-elyse,second-restaurant
VISTAIRE_OWNER_3D_RESTAURANT_ACCESS=owner@vistaire.ca=maison-elyse;user_123=*
```

Use `*` only for internal Vistaire operators who may see every restaurant.
Restaurant-scoped owners should receive only their own slugs.

## Job states

The first ledger supports:

```text
queued
running
analyzing
optimizing
visual_comparing
needs_visual_review
needs_device_qa
needs_cdn_upload
needs_finalize
ready_to_publish
published
rejected
failed
rolled_back
cancelled
```

Each job stores `id`, restaurant/menu/dish/version identity, `step`, `status`,
`startedAt`, `finishedAt`, logs, artifacts, error, initiator, next action, and a
manual runner command.

## Request safety

Owner API routes can list, detail, enqueue, retry, and cancel job records. They
do not spawn `npm`, `node`, shell commands, or the 3D CLI inside the request.

`publish` and `rollback` jobs are intentionally blocked by the enqueue API in
this version. They remain visible as manual actions until persisted readiness
checks can prove visual approval, device QA, CDN validation, and rollback target
eligibility.

The enqueue endpoint has a per-process owner mutation budget controlled by:

```text
VISTAIRE_OWNER_3D_JOB_POSTS_PER_MINUTE
```

This is an abuse guard, not a distributed quota. Production should move rate
limits and idempotency to Supabase or an edge/service layer.

## Fallback mode

When Supabase is not configured in local development, job listing returns a
non-persistent fallback queue seeded from manifests/reports so the dashboard can
be reviewed. Mutations still return `503` until the job store exists.

When Supabase is configured but the query fails, production returns `503`
instead of showing fake fallback jobs.

## Worker boundary

The next phase should add an external runner or queue worker that:

1. Claims `queued` jobs with a lease and heartbeat.
2. Runs an allowlisted 3D command with argv arrays, not shell strings.
3. Streams bounded logs and typed artifacts back to Supabase.
4. Enforces state transitions through one runner/RPC path.
5. Writes publish events only after visual, device, CDN, finalize, and explicit
   owner approval gates pass.

Until that runner exists, the UI is an operations ledger plus manual runner
guide, not a background processing system.

Before running a copied command, the operator or external runner must
materialize the private source object into
`assets/3d/source/{restaurant}/{menu}/{dish}/{version}/source.glb`, verify its
SHA-256 against the upload metadata, and keep that file ignored/uncommitted. A
source upload is staging only; it is not source analysis, optimization proof,
visual approval, CDN readiness, or device QA.

Observability reports are diagnostic evidence only. Job markdown may include
metrics, bounded logs, artifact refs, errors, and the copied command, but
secrets, service-role keys, signed URLs, tokens, and raw private URLs must be
redacted before storage or export. Fallback reports cannot unlock visual
approval, CDN validation, device QA, finalize, publish, or merge readiness.

## Asset policy

This job system stores metadata only. It does not add GLB/USDZ files, does not
write source uploads to `public/models/**`, and does not create Git LFS rules.
Keep raw sources and work outputs aligned with `docs/repo-asset-policy.md`.
