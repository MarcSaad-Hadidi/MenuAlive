# Owner QR codes — schema & apply guide

The Vistaire owner QR system uses a dedicated `qr_codes` table so that every QR
points at a **secure, stable, non-guessable** Vistaire URL
(`https://vistaire.ca/q/<token>`) which redirects to the public menu
(`/menu/<restaurant-slug>`), optionally with `?table=` / `?zone=`.

## Why a table (and not the slug in the QR)

- The QR must not expose Supabase ids or the raw slug as a security boundary.
- Tokens are generated server-side with `crypto.randomBytes` (never `Math.random`).
- Only the **hash** of the token is stored (`token_hash`); the raw token is
  returned to the owner once, at creation, to render/download the QR.
- The public `/q/[token]` route hashes the incoming token, matches `token_hash`,
  checks `status = 'active'`, increments `scan_count`, and redirects to
  `target_path`.

## Table

See [`supabase/migrations/0001_qr_codes.sql`](../supabase/migrations/0001_qr_codes.sql).

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | primary key |
| `restaurant_id` | uuid | owning restaurant (nullable) |
| `label` | text | owner-facing label |
| `token_hash` | text | unique; SHA-256 / HMAC-SHA256 of the token |
| `token_preview` | text | first chars only, for the UI |
| `target_path` | text | internal redirect target (must start with `/`) |
| `style_json` | jsonb | `OwnerQrStyle` snapshot |
| `status` | text | `active` \| `paused` \| `archived` |
| `scan_count` | integer | incremented on resolve |
| `last_scanned_at` | timestamptz | last resolve time |
| `created_at` / `updated_at` | timestamptz | timestamps (trigger keeps `updated_at`) |

## How to apply

This repo has no Supabase CLI wired in, so apply the migration manually:

**Option A — Supabase SQL editor (recommended)**
1. Open your Supabase project → SQL Editor.
2. Paste the contents of `supabase/migrations/0001_qr_codes.sql`.
3. Run it. Re-running is safe (`if not exists` guards).

**Option B — psql**
```bash
psql "$SUPABASE_DB_URL" -f supabase/migrations/0001_qr_codes.sql
```

## Environment

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (already used) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only access to `qr_codes` (already used) |
| `VISTAIRE_QR_TOKEN_SECRET` | Optional. Peppers the token hash and signs the dev fallback token. **Set this in production.** |

## Fallback behaviour (no DB yet)

If `qr_codes` does not exist or Supabase is not configured, QR creation degrades
gracefully to a **stateless signed token** (HMAC-signed, dev/build only):

- The QR still works: `/q/<signed-token>` verifies the signature and redirects.
- Nothing is persisted, so `scan_count`, `status`, and saved styles are **not**
  available. The owner UI clearly labels these QR codes as *non persisté*.

The persistent `qr_codes` table is the production target; the signed token only
exists so local dev and CI builds never break.
