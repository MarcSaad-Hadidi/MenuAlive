-- Vistaire owner 3D/AR external runner protocol
--
-- Adds fenced leases and private RPCs for external workers. Long 3D commands
-- remain outside Next.js request handlers.

create extension if not exists "pgcrypto";

alter table public.owner_3d_pipeline_jobs
  add column if not exists source_upload_id uuid references public.owner_3d_ar_source_uploads(id) on delete restrict,
  add column if not exists lock_token uuid,
  add column if not exists lease_expires_at timestamptz,
  add column if not exists attempt_count integer not null default 0 check (attempt_count >= 0),
  add column if not exists max_attempts integer not null default 3 check (max_attempts between 1 and 10),
  add column if not exists last_claimed_at timestamptz;

create index if not exists owner_3d_pipeline_jobs_runner_queue_idx
  on public.owner_3d_pipeline_jobs (created_at asc)
  where status = 'queued';

create index if not exists owner_3d_pipeline_jobs_runner_lease_idx
  on public.owner_3d_pipeline_jobs (lease_expires_at asc)
  where status in ('running', 'analyzing', 'optimizing', 'visual_comparing');

create index if not exists owner_3d_pipeline_jobs_source_upload_idx
  on public.owner_3d_pipeline_jobs (source_upload_id)
  where source_upload_id is not null;

create or replace function public.owner_3d_claim_pipeline_job(
  p_worker_id text,
  p_lease_seconds integer default 900,
  p_step text default null,
  p_job_id text default null
)
returns setof public.owner_3d_pipeline_jobs
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_lease interval;
begin
  if p_worker_id is null or length(trim(p_worker_id)) < 3 or length(p_worker_id) > 120 then
    raise exception 'worker id is required';
  end if;
  if p_lease_seconds is null or p_lease_seconds < 60 or p_lease_seconds > 7200 then
    raise exception 'lease seconds must be between 60 and 7200';
  end if;
  if p_step is not null and p_step not in ('analyze', 'optimize', 'visual_compare', 'visual_review', 'device_qa', 'cdn', 'finalize', 'publish', 'rollback') then
    raise exception 'invalid pipeline step';
  end if;

  v_lease := make_interval(secs => p_lease_seconds);

  update public.owner_3d_pipeline_jobs stale
  set
    status = 'failed',
    quality_status = 'failed',
    finished_at = coalesce(stale.finished_at, now()),
    error_count = stale.error_count + 1,
    error_message = coalesce(stale.error_message, 'External runner lease expired after max attempts.'),
    locked_by = null,
    lock_token = null,
    locked_at = null,
    heartbeat_at = null,
    lease_expires_at = null
  where stale.status in ('running', 'analyzing', 'optimizing', 'visual_comparing')
    and coalesce(stale.lease_expires_at, stale.heartbeat_at, stale.locked_at, stale.updated_at) < now()
    and stale.attempt_count >= stale.max_attempts;

  return query
  with candidate as (
    select jobs.id
    from public.owner_3d_pipeline_jobs jobs
    where (
        jobs.status = 'queued'
        or (
          jobs.status in ('running', 'analyzing', 'optimizing', 'visual_comparing')
          and coalesce(jobs.lease_expires_at, jobs.heartbeat_at, jobs.locked_at, jobs.updated_at) < now()
        )
      )
      and jobs.attempt_count < jobs.max_attempts
      and (p_step is null or jobs.step = p_step)
      and (p_job_id is null or jobs.id = p_job_id)
      and pg_try_advisory_xact_lock(hashtext(jobs.restaurant_slug || ':' || jobs.menu_slug || ':' || jobs.dish_slug || ':' || jobs.asset_version))
      and not exists (
        select 1
        from public.owner_3d_pipeline_jobs active
        where active.id <> jobs.id
          and active.restaurant_slug = jobs.restaurant_slug
          and active.menu_slug = jobs.menu_slug
          and active.dish_slug = jobs.dish_slug
          and active.asset_version = jobs.asset_version
          and active.status in ('running', 'analyzing', 'optimizing', 'visual_comparing')
          and coalesce(active.lease_expires_at, active.heartbeat_at, active.locked_at, active.updated_at) >= now()
      )
    order by case when jobs.status = 'queued' then 0 else 1 end, jobs.created_at asc
    for update skip locked
    limit 1
  )
  update public.owner_3d_pipeline_jobs jobs
  set
    status = 'running',
    quality_status = 'running',
    worker_kind = 'external_worker',
    locked_by = trim(p_worker_id),
    lock_token = gen_random_uuid(),
    locked_at = now(),
    heartbeat_at = now(),
    lease_expires_at = now() + v_lease,
    last_claimed_at = now(),
    attempt_count = jobs.attempt_count + 1,
    started_at = coalesce(jobs.started_at, now()),
    finished_at = null,
    error_message = null,
    next_action = 'External runner is processing this job.'
  from candidate
  where jobs.id = candidate.id
  returning jobs.*;
end;
$$;

create or replace function public.owner_3d_heartbeat_pipeline_job(
  p_job_id text,
  p_worker_id text,
  p_lock_token uuid,
  p_lease_seconds integer default 900,
  p_log text default null
)
returns setof public.owner_3d_pipeline_jobs
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_lease interval;
begin
  if p_lease_seconds is null or p_lease_seconds < 60 or p_lease_seconds > 7200 then
    raise exception 'lease seconds must be between 60 and 7200';
  end if;
  v_lease := make_interval(secs => p_lease_seconds);
  return query
  update public.owner_3d_pipeline_jobs jobs
  set
    heartbeat_at = now(),
    lease_expires_at = now() + v_lease,
    logs = case
      when p_log is null or length(trim(p_log)) = 0 then jobs.logs
      else jobs.logs || jsonb_build_array(trim(p_log))
    end
  where jobs.id = p_job_id
    and jobs.locked_by = p_worker_id
    and jobs.lock_token = p_lock_token
    and jobs.lease_expires_at > now()
    and jobs.status in ('running', 'analyzing', 'optimizing', 'visual_comparing')
  returning jobs.*;
end;
$$;

create or replace function public.owner_3d_update_pipeline_job_progress(
  p_job_id text,
  p_worker_id text,
  p_lock_token uuid,
  p_status text,
  p_quality_status text default 'running',
  p_logs jsonb default '[]'::jsonb,
  p_metrics jsonb default '{}'::jsonb,
  p_next_action text default null
)
returns setof public.owner_3d_pipeline_jobs
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_status not in ('running', 'analyzing', 'optimizing', 'visual_comparing') then
    raise exception 'invalid progress status';
  end if;
  if p_quality_status not in ('running', 'warning') then
    raise exception 'invalid progress quality status';
  end if;
  return query
  update public.owner_3d_pipeline_jobs jobs
  set
    status = p_status,
    quality_status = p_quality_status,
    heartbeat_at = now(),
    metrics = jobs.metrics || p_metrics,
    logs = jobs.logs || p_logs,
    next_action = coalesce(nullif(trim(p_next_action), ''), jobs.next_action)
  where jobs.id = p_job_id
    and jobs.locked_by = p_worker_id
    and jobs.lock_token = p_lock_token
    and jobs.lease_expires_at > now()
    and jobs.status in ('running', 'analyzing', 'optimizing', 'visual_comparing')
  returning jobs.*;
end;
$$;

create or replace function public.owner_3d_complete_pipeline_job(
  p_job_id text,
  p_worker_id text,
  p_lock_token uuid,
  p_status text,
  p_quality_status text,
  p_logs jsonb default '[]'::jsonb,
  p_step_logs jsonb default '[]'::jsonb,
  p_artifacts jsonb default '[]'::jsonb,
  p_metrics jsonb default '{}'::jsonb,
  p_error_message text default null,
  p_next_action text default null
)
returns setof public.owner_3d_pipeline_jobs
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_finished_at timestamptz := now();
begin
  if p_status not in ('needs_visual_review', 'needs_device_qa', 'needs_cdn_upload', 'needs_finalize', 'ready_to_publish', 'published', 'rejected', 'failed', 'rolled_back', 'cancelled') then
    raise exception 'invalid completion status';
  end if;
  return query
  update public.owner_3d_pipeline_jobs jobs
  set
    status = p_status,
    quality_status = p_quality_status,
    finished_at = v_finished_at,
    locked_by = null,
    lock_token = null,
    locked_at = null,
    heartbeat_at = null,
    lease_expires_at = null,
    logs = jobs.logs || p_logs,
    step_logs = p_step_logs,
    artifacts = p_artifacts,
    metrics = p_metrics,
    error_count = case when p_error_message is null or length(trim(p_error_message)) = 0 then 0 else jobs.error_count + 1 end,
    error_message = nullif(trim(p_error_message), ''),
    next_action = coalesce(nullif(trim(p_next_action), ''), jobs.next_action)
  where jobs.id = p_job_id
    and jobs.locked_by = p_worker_id
    and jobs.lock_token = p_lock_token
    and jobs.lease_expires_at > now()
    and jobs.status in ('running', 'analyzing', 'optimizing', 'visual_comparing')
  returning jobs.*;
end;
$$;

revoke all on function public.owner_3d_claim_pipeline_job(text, integer, text, text) from public, anon, authenticated;
revoke all on function public.owner_3d_heartbeat_pipeline_job(text, text, uuid, integer, text) from public, anon, authenticated;
revoke all on function public.owner_3d_update_pipeline_job_progress(text, text, uuid, text, text, jsonb, jsonb, text) from public, anon, authenticated;
revoke all on function public.owner_3d_complete_pipeline_job(text, text, uuid, text, text, jsonb, jsonb, jsonb, jsonb, text, text) from public, anon, authenticated;

grant execute on function public.owner_3d_claim_pipeline_job(text, integer, text, text) to service_role;
grant execute on function public.owner_3d_heartbeat_pipeline_job(text, text, uuid, integer, text) to service_role;
grant execute on function public.owner_3d_update_pipeline_job_progress(text, text, uuid, text, text, jsonb, jsonb, text) to service_role;
grant execute on function public.owner_3d_complete_pipeline_job(text, text, uuid, text, text, jsonb, jsonb, jsonb, jsonb, text, text) to service_role;
