-- Vistaire owner 3D/AR persistent pipeline jobs
-- Persistent metadata for source, version, job, artifact, review, device QA,
-- and publish events used by /owner/3d-ar.
--
-- Requested data model mapping:
--   requested 3d_asset_sources      -> public.owner_3d_asset_sources
--   requested 3d_asset_versions     -> public.owner_3d_asset_versions
--   requested 3d_pipeline_jobs      -> public.owner_3d_pipeline_jobs
--   requested 3d_pipeline_artifacts -> public.owner_3d_pipeline_artifacts
--   requested 3d_visual_reviews     -> public.owner_3d_visual_reviews
--   requested 3d_device_qa          -> public.owner_3d_device_qa
--   requested 3d_publish_events     -> public.owner_3d_publish_events
--
-- The owner_3d_* prefix avoids permanently quoted table names that begin with
-- a digit, while preserving the requested model boundaries.
--
-- Security model:
--   * These tables store metadata, logs, hashes, reports, and state only.
--   * Raw GLB/USDZ files stay out of Git and out of public/models staging.
--   * Owner APIs use the Supabase service role from server-only code.
--   * RLS is enabled with no anon/authenticated policies.
--   * Long-running 3D commands are not executed from Next request handlers.

create extension if not exists "pgcrypto";

create table if not exists public.owner_3d_asset_sources (
  id uuid primary key default gen_random_uuid(),
  source_upload_id uuid references public.owner_3d_ar_source_uploads(id) on delete restrict,
  restaurant_slug text not null
    check (restaurant_slug ~ '^[a-z0-9][a-z0-9._-]{0,79}$' and restaurant_slug not like '%..%'),
  menu_slug text not null
    check (menu_slug ~ '^[a-z0-9][a-z0-9._-]{0,79}$' and menu_slug not like '%..%'),
  dish_slug text not null
    check (dish_slug ~ '^[a-z0-9][a-z0-9._-]{0,79}$' and dish_slug not like '%..%'),
  asset_version text not null
    check (asset_version ~ '^[a-z0-9][a-z0-9._-]{0,79}$' and asset_version not like '%..%'),
  original_name text not null,
  bytes bigint not null check (bytes > 0),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  mime_type text not null default 'model/gltf-binary'
    check (mime_type = 'model/gltf-binary'),
  extension text not null default '.glb' check (extension = '.glb'),
  storage_provider text not null default 'supabase-storage'
    check (storage_provider in ('supabase-storage', 'external-private')),
  storage_bucket text,
  storage_path text not null,
  status text not null default 'staged'
    check (status in ('staged', 'accepted', 'superseded', 'delete_pending', 'deleted')),
  created_by_clerk_user_id text not null,
  created_by_email text,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  deleted_at timestamptz,
  deleted_by_clerk_user_id text,
  delete_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists owner_3d_asset_sources_identity_sha_key
  on public.owner_3d_asset_sources (
    restaurant_slug,
    menu_slug,
    dish_slug,
    asset_version,
    sha256
  );

create index if not exists owner_3d_asset_sources_identity_idx
  on public.owner_3d_asset_sources (
    restaurant_slug,
    menu_slug,
    dish_slug,
    asset_version,
    created_at desc
  );

create index if not exists owner_3d_asset_sources_status_idx
  on public.owner_3d_asset_sources (status);

create table if not exists public.owner_3d_asset_versions (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.owner_3d_asset_sources(id) on delete restrict,
  restaurant_slug text not null
    check (restaurant_slug ~ '^[a-z0-9][a-z0-9._-]{0,79}$' and restaurant_slug not like '%..%'),
  menu_slug text not null
    check (menu_slug ~ '^[a-z0-9][a-z0-9._-]{0,79}$' and menu_slug not like '%..%'),
  dish_slug text not null
    check (dish_slug ~ '^[a-z0-9][a-z0-9._-]{0,79}$' and dish_slug not like '%..%'),
  asset_version text not null
    check (asset_version ~ '^[a-z0-9][a-z0-9._-]{0,79}$' and asset_version not like '%..%'),
  status text not null default 'draft'
    check (status in ('draft', 'review', 'approved', 'published', 'archived', 'rolled_back')),
  validation_status text not null default 'unvalidated'
    check (validation_status in ('unvalidated', 'passed', 'warning', 'failed')),
  manifest_path text,
  manifest_url text,
  cdn_base_url text,
  active_manifest_sha256 text check (active_manifest_sha256 is null or active_manifest_sha256 ~ '^[a-f0-9]{64}$'),
  selected_candidate text,
  previous_version_id uuid references public.owner_3d_asset_versions(id) on delete set null,
  approved_at timestamptz,
  published_at timestamptz,
  rolled_back_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists owner_3d_asset_versions_identity_key
  on public.owner_3d_asset_versions (
    restaurant_slug,
    menu_slug,
    dish_slug,
    asset_version
  );

create unique index if not exists owner_3d_asset_versions_one_published_key
  on public.owner_3d_asset_versions (restaurant_slug, menu_slug, dish_slug)
  where status = 'published';

create index if not exists owner_3d_asset_versions_status_idx
  on public.owner_3d_asset_versions (status, updated_at desc);

create table if not exists public.owner_3d_pipeline_jobs (
  id text primary key check (id ~ '^job_[a-z0-9._-]{8,80}$'),
  source_id uuid references public.owner_3d_asset_sources(id) on delete set null,
  asset_version_id uuid references public.owner_3d_asset_versions(id) on delete set null,
  restaurant_slug text not null
    check (restaurant_slug ~ '^[a-z0-9][a-z0-9._-]{0,79}$' and restaurant_slug not like '%..%'),
  menu_slug text not null
    check (menu_slug ~ '^[a-z0-9][a-z0-9._-]{0,79}$' and menu_slug not like '%..%'),
  dish_slug text not null
    check (dish_slug ~ '^[a-z0-9][a-z0-9._-]{0,79}$' and dish_slug not like '%..%'),
  asset_version text not null
    check (asset_version ~ '^[a-z0-9][a-z0-9._-]{0,79}$' and asset_version not like '%..%'),
  step text not null
    check (
      step in (
        'analyze',
        'optimize',
        'visual_compare',
        'visual_review',
        'device_qa',
        'cdn',
        'finalize',
        'publish',
        'rollback'
      )
    ),
  status text not null default 'queued'
    check (
      status in (
        'queued',
        'running',
        'analyzing',
        'optimizing',
        'visual_comparing',
        'needs_visual_review',
        'needs_device_qa',
        'needs_cdn_upload',
        'needs_finalize',
        'ready_to_publish',
        'published',
        'rejected',
        'failed',
        'rolled_back',
        'cancelled'
      )
    ),
  started_at timestamptz,
  finished_at timestamptz,
  logs jsonb not null default '[]'::jsonb
    check (jsonb_typeof(logs) = 'array'),
  step_logs jsonb not null default '[]'::jsonb
    check (jsonb_typeof(step_logs) = 'array'),
  artifacts jsonb not null default '[]'::jsonb
    check (jsonb_typeof(artifacts) = 'array'),
  metrics jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metrics) = 'object'),
  quality_status text not null default 'unvalidated'
    check (
      quality_status in (
        'queued',
        'running',
        'passed',
        'warning',
        'failed',
        'unvalidated',
        'needs_visual_review',
        'needs_device_qa',
        'needs_cdn_upload',
        'needs_finalize',
        'ready_to_publish',
        'published',
        'rejected',
        'rolled_back',
        'cancelled'
      )
    ),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  error_count integer not null default 0 check (error_count >= 0),
  error_message text,
  initiated_by_clerk_user_id text not null,
  initiated_by_email text,
  next_action text not null,
  manual_runner_command text not null,
  worker_kind text not null default 'manual_runner'
    check (worker_kind in ('manual_runner', 'external_worker')),
  client_request_id text,
  dedupe_key text,
  retry_of_job_id text references public.owner_3d_pipeline_jobs(id) on delete set null,
  locked_by text,
  locked_at timestamptz,
  heartbeat_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists owner_3d_pipeline_jobs_queue_idx
  on public.owner_3d_pipeline_jobs (status, created_at desc);

create index if not exists owner_3d_pipeline_jobs_identity_idx
  on public.owner_3d_pipeline_jobs (
    restaurant_slug,
    menu_slug,
    dish_slug,
    asset_version,
    created_at desc
  );

create unique index if not exists owner_3d_pipeline_jobs_active_dedupe_key
  on public.owner_3d_pipeline_jobs (dedupe_key)
  where dedupe_key is not null
    and status in (
      'queued',
      'running',
      'analyzing',
      'optimizing',
      'visual_comparing'
    );

create table if not exists public.owner_3d_pipeline_artifacts (
  id uuid primary key default gen_random_uuid(),
  job_id text references public.owner_3d_pipeline_jobs(id) on delete set null,
  asset_version_id uuid references public.owner_3d_asset_versions(id) on delete set null,
  artifact_type text not null
    check (
      artifact_type in (
        'source_analysis',
        'optimization_report',
        'candidate_report',
        'visual_report',
        'upload_plan',
        'network_validation',
        'manifest',
        'web_glb',
        'mobile_glb',
        'ar_lite_glb',
        'ios_usdz',
        'poster',
        'qa_evidence',
        'publish_event'
      )
    ),
  variant text not null default 'report'
    check (variant in ('source', 'web', 'mobile', 'ar_lite', 'ios_usdz', 'poster', 'report', 'evidence')),
  status text not null default 'staged'
    check (status in ('staged', 'approved', 'published', 'rejected', 'deleted')),
  label text not null,
  storage_provider text not null default 'supabase-storage'
    check (storage_provider in ('supabase-storage', 'external-private', 'external-cdn', 'public-runtime', 'local-report')),
  storage_bucket text,
  storage_path text not null,
  public_url text,
  bytes bigint check (bytes is null or bytes > 0),
  sha256 text check (sha256 is null or sha256 ~ '^[a-f0-9]{64}$'),
  mime_type text,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists owner_3d_pipeline_artifacts_job_idx
  on public.owner_3d_pipeline_artifacts (job_id);

create index if not exists owner_3d_pipeline_artifacts_version_idx
  on public.owner_3d_pipeline_artifacts (asset_version_id, artifact_type, variant);

create table if not exists public.owner_3d_visual_reviews (
  id uuid primary key default gen_random_uuid(),
  asset_version_id uuid references public.owner_3d_asset_versions(id) on delete cascade,
  restaurant_slug text not null
    check (restaurant_slug ~ '^[a-z0-9][a-z0-9._-]{0,79}$' and restaurant_slug not like '%..%'),
  menu_slug text not null
    check (menu_slug ~ '^[a-z0-9][a-z0-9._-]{0,79}$' and menu_slug not like '%..%'),
  dish_slug text not null
    check (dish_slug ~ '^[a-z0-9][a-z0-9._-]{0,79}$' and dish_slug not like '%..%'),
  asset_version text not null
    check (asset_version ~ '^[a-z0-9][a-z0-9._-]{0,79}$' and asset_version not like '%..%'),
  visual_report_artifact_id uuid references public.owner_3d_pipeline_artifacts(id) on delete set null,
  visual_report_sha256 text check (visual_report_sha256 is null or visual_report_sha256 ~ '^[a-f0-9]{64}$'),
  selected_candidate text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'needs_changes')),
  threshold text not null default 'strict'
    check (threshold in ('strict', 'standard', 'manual')),
  reviewed_by_clerk_user_id text,
  reviewed_by_email text,
  reviewed_at timestamptz,
  scores jsonb not null default '{}'::jsonb
    check (jsonb_typeof(scores) = 'object'),
  findings jsonb not null default '[]'::jsonb
    check (jsonb_typeof(findings) = 'array'),
  notes text,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    status <> 'approved'
    or (
      reviewed_at is not null
      and reviewed_by_clerk_user_id is not null
      and visual_report_sha256 is not null
      and selected_candidate is not null
    )
  )
);

create index if not exists owner_3d_visual_reviews_version_idx
  on public.owner_3d_visual_reviews (asset_version_id, reviewed_at desc);

create index if not exists owner_3d_visual_reviews_identity_idx
  on public.owner_3d_visual_reviews (
    restaurant_slug,
    menu_slug,
    dish_slug,
    asset_version,
    reviewed_at desc
  );

create table if not exists public.owner_3d_device_qa (
  id uuid primary key default gen_random_uuid(),
  asset_version_id uuid references public.owner_3d_asset_versions(id) on delete cascade,
  restaurant_slug text not null
    check (restaurant_slug ~ '^[a-z0-9][a-z0-9._-]{0,79}$' and restaurant_slug not like '%..%'),
  menu_slug text not null
    check (menu_slug ~ '^[a-z0-9][a-z0-9._-]{0,79}$' and menu_slug not like '%..%'),
  dish_slug text not null
    check (dish_slug ~ '^[a-z0-9][a-z0-9._-]{0,79}$' and dish_slug not like '%..%'),
  asset_version text not null
    check (asset_version ~ '^[a-z0-9][a-z0-9._-]{0,79}$' and asset_version not like '%..%'),
  device_target text not null
    check (device_target in ('iphone_quick_look', 'android_scene_viewer')),
  status text not null default 'not_tested'
    check (status in ('not_tested', 'passed', 'failed', 'blocked')),
  asset_url text,
  device_name text,
  os_version text,
  browser_name text,
  browser_version text,
  arcore_status text,
  network text,
  tested_by text,
  tested_by_clerk_user_id text,
  tested_by_email text,
  tested_at timestamptz,
  evidence_artifact_id uuid references public.owner_3d_pipeline_artifacts(id) on delete set null,
  evidence_storage_bucket text,
  evidence_storage_path text,
  evidence_original_name text,
  evidence_mime_type text,
  evidence_bytes bigint check (evidence_bytes is null or evidence_bytes > 0),
  evidence_sha256 text check (evidence_sha256 is null or evidence_sha256 ~ '^[a-f0-9]{64}$'),
  notes text,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  superseded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    status <> 'passed'
    or (
      asset_url is not null
      and device_name is not null
      and os_version is not null
      and browser_name is not null
      and browser_version is not null
      and network is not null
      and tested_by is not null
      and tested_at is not null
      and evidence_storage_path is not null
      and evidence_bytes is not null
      and evidence_sha256 is not null
    )
  ),
  check (
    device_target <> 'android_scene_viewer'
    or status <> 'passed'
    or arcore_status is not null
  ),
  check (
    status not in ('failed', 'blocked')
    or length(coalesce(notes, '')) >= 8
  )
);

create index if not exists owner_3d_device_qa_version_idx
  on public.owner_3d_device_qa (asset_version_id, device_target, tested_at desc);

create index if not exists owner_3d_device_qa_identity_idx
  on public.owner_3d_device_qa (
    restaurant_slug,
    menu_slug,
    dish_slug,
    asset_version,
    device_target,
    tested_at desc
  );

create unique index if not exists owner_3d_device_qa_active_target_key
  on public.owner_3d_device_qa (asset_version_id, device_target)
  where superseded_at is null;

create unique index if not exists owner_3d_device_qa_active_identity_target_key
  on public.owner_3d_device_qa (
    restaurant_slug,
    menu_slug,
    dish_slug,
    asset_version,
    device_target
  )
  where superseded_at is null;

create table if not exists public.owner_3d_publish_events (
  id uuid primary key default gen_random_uuid(),
  asset_version_id uuid references public.owner_3d_asset_versions(id) on delete restrict,
  job_id text references public.owner_3d_pipeline_jobs(id) on delete set null,
  event_type text not null
    check (
      event_type in (
        'finalized',
        'publish_requested',
        'published',
        'rollback_requested',
        'rolled_back',
        'unpublished',
        'publish_failed'
      )
    ),
  from_status text,
  to_status text,
  previous_version_id uuid references public.owner_3d_asset_versions(id) on delete set null,
  performed_by_clerk_user_id text not null,
  performed_by_email text,
  reason text,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists owner_3d_publish_events_version_idx
  on public.owner_3d_publish_events (asset_version_id, created_at desc);

create index if not exists owner_3d_publish_events_type_idx
  on public.owner_3d_publish_events (event_type, created_at desc);

create or replace function public.set_owner_3d_pipeline_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists owner_3d_asset_sources_set_updated_at
  on public.owner_3d_asset_sources;
create trigger owner_3d_asset_sources_set_updated_at
  before update on public.owner_3d_asset_sources
  for each row
  execute function public.set_owner_3d_pipeline_updated_at();

drop trigger if exists owner_3d_asset_versions_set_updated_at
  on public.owner_3d_asset_versions;
create trigger owner_3d_asset_versions_set_updated_at
  before update on public.owner_3d_asset_versions
  for each row
  execute function public.set_owner_3d_pipeline_updated_at();

drop trigger if exists owner_3d_pipeline_jobs_set_updated_at
  on public.owner_3d_pipeline_jobs;
create trigger owner_3d_pipeline_jobs_set_updated_at
  before update on public.owner_3d_pipeline_jobs
  for each row
  execute function public.set_owner_3d_pipeline_updated_at();

drop trigger if exists owner_3d_pipeline_artifacts_set_updated_at
  on public.owner_3d_pipeline_artifacts;
create trigger owner_3d_pipeline_artifacts_set_updated_at
  before update on public.owner_3d_pipeline_artifacts
  for each row
  execute function public.set_owner_3d_pipeline_updated_at();

drop trigger if exists owner_3d_visual_reviews_set_updated_at
  on public.owner_3d_visual_reviews;
create trigger owner_3d_visual_reviews_set_updated_at
  before update on public.owner_3d_visual_reviews
  for each row
  execute function public.set_owner_3d_pipeline_updated_at();

drop trigger if exists owner_3d_device_qa_set_updated_at
  on public.owner_3d_device_qa;
create trigger owner_3d_device_qa_set_updated_at
  before update on public.owner_3d_device_qa
  for each row
  execute function public.set_owner_3d_pipeline_updated_at();

alter table public.owner_3d_asset_sources enable row level security;
alter table public.owner_3d_asset_versions enable row level security;
alter table public.owner_3d_pipeline_jobs enable row level security;
alter table public.owner_3d_pipeline_artifacts enable row level security;
alter table public.owner_3d_visual_reviews enable row level security;
alter table public.owner_3d_device_qa enable row level security;
alter table public.owner_3d_publish_events enable row level security;

revoke all on public.owner_3d_asset_sources from anon, authenticated;
revoke all on public.owner_3d_asset_versions from anon, authenticated;
revoke all on public.owner_3d_pipeline_jobs from anon, authenticated;
revoke all on public.owner_3d_pipeline_artifacts from anon, authenticated;
revoke all on public.owner_3d_visual_reviews from anon, authenticated;
revoke all on public.owner_3d_device_qa from anon, authenticated;
revoke all on public.owner_3d_publish_events from anon, authenticated;

grant all on public.owner_3d_asset_sources to service_role;
grant all on public.owner_3d_asset_versions to service_role;
grant all on public.owner_3d_pipeline_jobs to service_role;
grant all on public.owner_3d_pipeline_artifacts to service_role;
grant all on public.owner_3d_visual_reviews to service_role;
grant all on public.owner_3d_device_qa to service_role;
grant all on public.owner_3d_publish_events to service_role;
