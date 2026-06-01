# Sharesight Portfolio Integration — Design

**Date:** 2026-06-01
**Status:** Approved
**Replaces:** removed IBKR gateway approach (see [docs/plan.md](../../plan.md) §2)

## Goal

Hook live portfolio data from the **Sharesight User API (V2, OAuth2 client_credentials)** into the
**Investments (Scout)** view and the home invest stat. Replace the static `PORTFOLIO` mock in
`app/lib/atlas-data.ts`. Base currency AUD, single-tenant.

## Architecture — cache pattern (same as JARVIS plan)

Loaders never call Sharesight directly. Pattern:

```
loader → readPortfolio(userId)
            ├─ read Supabase cache rows
            ├─ if stale (>30min) or empty → fire syncSharesight(userId)
            └─ map rows → Portfolio  (mock fallback on total failure)

syncSharesight(userId):
  getToken() → fetchPortfolio() → upsert Supabase → stamp sync_runs
```

Trigger: **loader fallback only** for now (self-healing, zero infra). Vercel cron added later.
OAuth token persisted in Supabase (survives serverless cold starts).

## Components

### 1. Migration `supabase/migrations/008_sharesight.sql`

Five tables. User-scoped tables use the existing `owner only` RLS policy (matches `005_focuses.sql`).
`sharesight_oauth` is service-role only (no user policy — written by the sync job via service key).

- **`sharesight_portfolio`** — one row per user:
  `user_id` (unique), `total numeric`, `day_pct numeric`, `day_abs numeric`, `ytd_pct numeric`,
  `synced_at timestamptz`.
- **`sharesight_holdings`** — N rows per user:
  `user_id`, `sym`, `name`, `val numeric`, `pct numeric`, `shares numeric null`, `alloc numeric`,
  `tone text`, `note text`, `position int`.
- **`sharesight_allocation`** — N rows per user:
  `user_id`, `label`, `pct numeric`, `color text`, `position int`.
- **`sharesight_oauth`** — one row (token cache):
  `id`, `access_token text`, `expires_at timestamptz`. RLS enabled, **no policy** (service-role only).
- **`sync_runs`** — event log:
  `id`, `source text`, `ok boolean`, `error text null`, `ran_at timestamptz`. Service-role writes.

Holdings + allocation replaced wholesale each sync (delete-by-user then insert) — simpler than
per-row upsert diffing, set is small.

### 2. `app/lib/supabase.admin.ts` (new)

Service-role client. `createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })`.
Server-only (the file is `.server`-adjacent; never imported client-side). Bypasses RLS — needed because the
sync job and token cache write to service-role-only tables and the loader-fallback path has a user but writes
cross-cutting state.

### 3. `app/lib/sharesight.server.ts` (new)

- **`getToken(admin)`** — read `sharesight_oauth` row; if missing/expired, POST
  `{SHARESIGHT_OAUTH_BASE}/oauth2/token` with `grant_type=client_credentials`,
  `client_id`, `client_secret`. Store `access_token` + `expires_at = now + 25min` (5min safety margin
  under the 30min token life). Return token.
- **`fetchPortfolio(token)`** — returns normalized `Portfolio`:
  - `GET {API_BASE}/portfolios` → take first portfolio id.
  - `GET {API_BASE}/portfolios/:id/valuation?balance_date=<today>` → holdings (sym, name, market value,
    allocation %), total value, allocation-by-class.
  - `GET {API_BASE}/portfolios/:id/performance?start_date=<Jan1>&end_date=<today>` → `ytd_pct`,
    per-holding return %. `day_pct`/`day_abs` from a 1-day performance window (or 0 if unavailable).
  - `tone` derived from pct sign. `spark` = deterministic `series()` seeded by symbol (history deferred, §2.5).
- **`syncSharesight(admin, userId)`** — `fetchPortfolio` → upsert `sharesight_portfolio`,
  delete+insert `sharesight_holdings` + `sharesight_allocation`, write `sync_runs(ok)`.
  On throw: write `sync_runs(error)`, rethrow.
- **`readPortfolio(admin, userId)`** — read cache rows → build `Portfolio`. If empty or
  `synced_at` older than 30min, fire `syncSharesight` then re-read. On any failure return mock `PORTFOLIO`
  and `{ live: false }`. `watch` + `scoutNote` always from mock (§2.5).
  Returns `{ portfolio: Portfolio, live: boolean }`.

### 4. Loaders

- `app/routes/_protected.investments.tsx` — replace mock loader body with
  `const { session } = await requireSession(request); const { portfolio, live } = await readPortfolio(admin, session.user.id)`.
  Return `{ portfolio, cash: <cash holding val>, live, scout }`.
- `app/routes/_protected.home.tsx` — same `readPortfolio`, feed `investTotal`/`investDayPct` + `PORTFOLIO` slot.

## Data flow / mapping

| `Portfolio` field   | Sharesight source                                  |
|---------------------|----------------------------------------------------|
| `total`             | valuation total market value                       |
| `dayPct`/`dayAbs`   | performance, 1-day window (0 if unavailable)       |
| `ytdPct`            | performance, Jan-1 → today                         |
| `holdings[]`        | valuation holdings + performance per-holding %     |
| `holding.tone`      | derived: pct > 0 up, < 0 down, else flat           |
| `holding.spark`     | `series()` seeded by symbol (placeholder, §2.5)    |
| `allocation[]`      | valuation allocation-by-class                      |
| `spark` (portfolio) | `series()` placeholder                             |
| `watch`, `scoutNote`| mock (§2.5)                                        |

## Error handling

- Token fetch fails → throw, caught by `readPortfolio` → mock fallback, `live:false`, `sync_runs(error)`.
- Sharesight 4xx/5xx → same path.
- Stale-but-present cache → serve stale, fire async refresh (don't block loader on a slow upstream).
- All secrets server-only (`*.server.ts` + service-role key never in client bundle).

## Env

Already in `.env.local`: `SHARESIGHT_CLIENT_ID`, `SHARESIGHT_CLIENT_SECRET`, `SHARESIGHT_API_BASE`,
`SHARESIGHT_OAUTH_BASE`, `SUPABASE_SERVICE_ROLE_KEY`. Extend `app/env.d.ts` with these keys.
**Remove dead `IBKR_*` keys** from `.env.local`.

## Out of scope (YAGNI / deferred)

- Vercel cron / Edge Function trigger (loader fallback ships first).
- Per-holding sparkline history (placeholder series now, §2.5).
- `scoutNote` LLM summary (mock, §2.5).
- `watch` watchlist (user-curated mock, §2.5).
- authorization_code grant (using client_credentials — simpler, own-account).
- Multi-portfolio aggregation (take first portfolio).

## Testing

- Unit: `fetchPortfolio` normalization given canned Sharesight JSON fixtures → asserts `Portfolio` shape.
- Unit: `getToken` reuses cached token before expiry, refetches after.
- Integration: `readPortfolio` returns mock + `live:false` when token fetch throws.
- Manual: real creds → confirm rows in Supabase, `/investments` renders live, kill API → cache/mock fallback (no 500).
