-- Vistaire owner 3D/AR source uploads
-- Private staging metadata for raw GLB sources uploaded from /owner/3d-ar.
--
-- Security model:
--   * Raw source GLBs live in a private storage bucket, never in Git or public/.
--   * This table stores metadata/hash/state only.
--   * All access uses the Supabase service role from server-only owner APIs.
--   * RLS is enabled with no anon/authenticated policies.
--
-- Apply: see docs/owner-3d-ar-source-uploads.md.

create extension if not exists "pgcrypto";

create table if not exists public.owner_3d_ar_source_uploads (
  id uuid primary key default gen_random_uuid(),
  restaurant_slug text not null
    check (restaurant_slug ~ '^[a-z0-9][a-z0-9._-]{0,79}$' and restaurant_slug not like '%..%'),
  menu_slug text not null
    check (menu_slug ~ '^[a-z0-9][a-z0-9._-]{0,79}$' and menu_slug not like '%..%'),
  dish_slug text not null
    check (dish_slug ~ '^[a-z0-9][a-z0-9._-]{0,79}$' and dish_slug not like '%..%'),
  version text not null
    check (version ~ '^[a-z0-9][a-z0-9._-]{0,79}$' and version not like '%..%'),
  original_name text not null,
  bytes bigint not null check (bytes > 0),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  mime_type text not null default 'model/gltf-binary'
    check (mime_type = 'model/gltf-binary'),
  extension text not null default '.glb' check (extension = '.glb'),
  status text not null default 'source_uploaded'
    check (
      status in (
        'source_uploaded',
        'analyzing',
        'analysis_failed',
        'analysis_complete',
        'optimized',
        'needs_review',
        'rejected',
        'ready_to_finalize',
        'ready_to_publish',
        'published',
        'rolled_back',
        'delete_pending',
        'deleted'
      )
    ),
  storage_provider text not null check (storage_provider = 'supabase-storage'),
  storage_bucket text not null check (storage_bucket ~ '^[a-z0-9][a-z0-9._-]{1,126}$'),
  storage_path text not null,
  uploaded_by_clerk_user_id text not null,
  uploaded_by_email text,
  metadata jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  confirmed_at timestamptz,
  promoted_at timestamptz,
  deleted_at timestamptz,
  deleted_by_clerk_user_id text,
  delete_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.owner_3d_ar_source_uploads
  drop constraint if exists owner_3d_ar_source_uploads_storage_path_matches_metadata;

alter table public.owner_3d_ar_source_uploads
  add constraint owner_3d_ar_source_uploads_storage_path_matches_metadata
  check (
    storage_path =
      'sources/' ||
      restaurant_slug || '/' ||
      menu_slug || '/' ||
      dish_slug || '/' ||
      version || '/' ||
      sha256 || '.glb'
  );

create unique index if not exists owner_3d_ar_source_uploads_identity_sha_key
  on public.owner_3d_ar_source_uploads (
    restaurant_slug,
    menu_slug,
    dish_slug,
    version,
    sha256
  );

create index if not exists owner_3d_ar_source_uploads_identity_idx
  on public.owner_3d_ar_source_uploads (
    restaurant_slug,
    menu_slug,
    dish_slug,
    version,
    created_at desc
  );

create index if not exists owner_3d_ar_source_uploads_status_idx
  on public.owner_3d_ar_source_uploads (status);

create or replace function public.set_owner_3d_ar_source_uploads_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists owner_3d_ar_source_uploads_set_updated_at
  on public.owner_3d_ar_source_uploads;
create trigger owner_3d_ar_source_uploads_set_updated_at
  before update on public.owner_3d_ar_source_uploads
  for each row
  execute function public.set_owner_3d_ar_source_uploads_updated_at();

alter table public.owner_3d_ar_source_uploads enable row level security;
