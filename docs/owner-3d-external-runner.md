# Owner 3D/AR external runner

The external runner turns `/owner/3d-ar` jobs into executable work without
running long 3D commands inside Next.js request handlers.

## Apply database support

Apply both migrations before starting a runner:

```bash
supabase/migrations/0004_owner_3d_pipeline_jobs.sql
supabase/migrations/0005_owner_3d_external_runner.sql
```

Migration `0005` adds `source_upload_id`, `lock_token`, `lease_expires_at`,
`attempt_count`, `max_attempts`, and private service-role RPCs for claim,
heartbeat, progress, and completion. Claims use `for update skip locked`; every
heartbeat and completion is fenced by `job_id`, `locked_by`, and `lock_token`.

## Environment

Runner-only secrets must stay server-side and must not be copied into owner UI,
job rows, artifacts, reports, screenshots, or logs.

```text
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<server-only service role key>
VISTAIRE_3D_SOURCE_BUCKET=vistaire-3d-sources
VISTAIRE_3D_RUNNER_ARTIFACT_BUCKET=vistaire-3d-sources
VISTAIRE_3D_CDN_ORIGINS=https://cdn.example.com
VISTAIRE_3D_CDN_BASE_URL=https://cdn.example.com/vistaire
VISTAIRE_APP_ORIGIN=https://www.vistaire.ca
VISTAIRE_3D_RUNNER_ID=runner-prod-01
VISTAIRE_3D_RUNNER_RESTAURANT_SLUGS=maison-elyse
```

`VISTAIRE_3D_RUNNER_ARTIFACT_BUCKET` is optional and falls back to
`VISTAIRE_3D_SOURCE_BUCKET`. Use a private bucket for report artifacts unless a
separate asset policy explicitly approves a public destination.

`VISTAIRE_3D_RUNNER_RESTAURANT_SLUGS` is required for the runner. Use a
comma-separated allowlist for tenant-scoped workers, or an explicit `*` only for
an intentionally global worker.

## Commands

Dry-run a single planned job without claiming or writing state:

```bash
npm run 3d:runner -- --dry-run --once --json
```

Run one claimed job:

```bash
npm run 3d:runner -- --once --json
```

Run exactly one known job:

```bash
npm run 3d:runner -- --once --job-id job_xxxxxxxxxxxxxxxx --json
```

Run a known job with a concrete private source upload:

```bash
npm run 3d:runner -- --once --job-id job_xxxxxxxxxxxxxxxx --source-upload-id 11111111-1111-4111-8111-111111111111 --json
```

Run as a polling worker:

```bash
npm run 3d:runner -- --worker-id runner-prod-01 --lease-seconds 900 --poll-interval-ms 15000
```

The runner builds typed argv plans from the job step. It never executes the
stored `manual_runner_command`; that string is only an owner-facing copy guide.

## Execution flow

1. Claim one queued or stale-leased job through
   `owner_3d_claim_pipeline_job`.
2. Resolve the job-bound `source_upload_id`; if the job is older and has no
   bound upload, resolve the latest source upload for the identity and fail if
   that latest row is not runnable.
3. Verify that the configured Supabase Storage bucket is private, then download
   the object without signed or public URLs.
4. Verify storage bucket, storage path, SHA-256, byte size, GLB structure, and
   Git LFS pointer status against metadata.
5. Write the source to ignored
   `assets/3d/source/{restaurant}/{menu}/{dish}/{version}/source.glb`.
6. Run the allowlisted CLI for `analyze`, `optimize`, `visual_compare`, `cdn`,
   or `finalize`.
7. Heartbeat while the command runs.
8. Upload report artifacts to private storage and insert
   `owner_3d_pipeline_artifacts` metadata.
9. Complete the job with sanitized logs, step logs, artifact refs, metrics, and
   the next status visible in `/owner/3d-ar`.

If both the database job and CLI pass a source upload id, they must match. The
CLI flag is for legacy/manual one-shot work, not for overriding a job-bound
source.

`publish`, `rollback`, manual visual approval, and real-device QA remain
separate owner-gated workflows. Do not claim real iPhone Quick Look or Android
Scene Viewer validation from this runner.

## Cleanup and asset policy

Generated source, work, reports, screenshots, traces, and local logs stay out of
Git. Follow `docs/repo-asset-policy.md`; do not force-add ignored
`assets/3d/source/**`, `assets/3d/work/**`, or generated heavy binaries.

After a runner incident or suspected leak, rotate `SUPABASE_SERVICE_ROLE_KEY`,
remove affected private artifacts, and inspect job logs for redaction gaps
before restarting workers.
