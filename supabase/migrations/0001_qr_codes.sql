-- Vistaire owner QR codes
-- Secure, per-restaurant QR redirect records.
--
-- Security model:
--   * The QR encodes https://<site>/q/<token>.
--   * Only token_hash (SHA-256 / HMAC-SHA256) is stored here, never the raw token.
--   * Tokens are generated server-side with crypto.randomBytes (never Math.random).
--   * The public /q/[token] route hashes the incoming token, matches token_hash,
--     verifies status = 'active', then redirects to target_path.
--   * All access uses the Supabase service role (server-only). RLS is enabled and
--     intentionally has no anon/authenticated policies, so this table is not
--     readable from the browser.
--
-- Apply: see docs/owner-qr-schema.md.

create extension if not exists "pgcrypto";

create table if not exists public.qr_codes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid,
  label text not null default 'QR menu',
  token_hash text not null,
  token_preview text not null default '',
  target_path text not null,
  style_json jsonb not null default '{}'::jsonb,
  status text not null default 'active'
    check (status in ('active', 'paused', 'archived')),
  scan_count integer not null default 0,
  last_scanned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists qr_codes_token_hash_key
  on public.qr_codes (token_hash);

create index if not exists qr_codes_restaurant_id_idx
  on public.qr_codes (restaurant_id);

create index if not exists qr_codes_status_idx
  on public.qr_codes (status);

-- Keep updated_at fresh on every write.
create or replace function public.set_qr_codes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists qr_codes_set_updated_at on public.qr_codes;
create trigger qr_codes_set_updated_at
  before update on public.qr_codes
  for each row
  execute function public.set_qr_codes_updated_at();

-- Lock the table down to the service role only (server-side access).
alter table public.qr_codes enable row level security;
