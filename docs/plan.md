# Integration Plan

Hook live data into two views. Pattern for both: **background sync job → Supabase cache tables → route loader reads Supabase**. Loaders never call the upstream API directly (rate limits, latency, upstream-down resilience). UI components stay unchanged — only the loader's data source swaps from `atlas-data.ts` mock to Supabase.

Stack: React Router v7, Supabase (RLS, `user_id = auth.uid()`), single-tenant. Existing tables follow `app/lib/supabase.server.ts` + numbered `supabase/migrations/`.

---

## 1. Connect JARVIS for apps

JARVIS = separate app that builds + holds data on the SaaS apps being built. Feeds the **Projects (Forge)** view at [routes/_protected.projects.tsx](app/routes/_protected.projects.tsx). Replaces the static `PROJECTS` mock in [atlas-data.ts](app/lib/atlas-data.ts).

### 1.1 Get JARVIS API access
- [ ] Confirm JARVIS exposes a read API (REST/JSON). Capture base URL + auth scheme (API key header vs OAuth).
- [ ] Map JARVIS app fields → `ProjectItem` shape (`name`, `tag`, `status`, `progress`, `stack`, `metricLabel`, `metric`, `activity`, `accent`). Note gaps where JARVIS has no equivalent.
- [ ] Add secrets to env: `JARVIS_API_URL`, `JARVIS_API_KEY`. Add to `.env`, Vercel/host env, and `app/env.d.ts` types.

### 1.2 Supabase cache table
- [ ] New migration `supabase/migrations/006_jarvis_apps.sql`:
  ```sql
  create table if not exists public.jarvis_apps (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    jarvis_id text not null,           -- upstream app id, for upsert
    name text not null,
    tag text not null default '',
    status text not null default 'Building',  -- Shipping|Building|Live|Paused
    progress int not null default 0,
    stack text[] not null default '{}',
    metric_label text not null default '',
    metric text not null default '',
    activity text not null default '',
    accent text not null default 'chart-1',
    synced_at timestamptz not null default now(),
    unique(user_id, jarvis_id)
  );
  alter table public.jarvis_apps enable row level security;
  create policy "Users can manage own jarvis apps" on public.jarvis_apps
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  ```
- [ ] (Optional) `jarvis_ships` table for the ship-log timeline if JARVIS emits deploy events.

### 1.3 Sync function
- [ ] `app/lib/jarvis.server.ts`: `fetchJarvisApps()` — calls JARVIS API, returns normalized `ProjectItem[]`. Map upstream status strings → the 4 allowed `status` enum values. Default `accent` round-robin if JARVIS has no color.
- [ ] `syncJarvis(userId)` — fetch → upsert into `jarvis_apps` on `(user_id, jarvis_id)`, stamp `synced_at`. Delete rows whose `jarvis_id` no longer returned (app removed in JARVIS).

### 1.4 Trigger the sync
Pick one (start with A, add C later):
- [ ] **A. Webhook (push):** JARVIS POSTs on build/deploy change → resource route `app/routes/api.jarvis.webhook.tsx` (`action`) verifies a shared secret, calls `syncJarvis`. Real-time, cheapest.
- [ ] **B. Cron (pull):** Scheduled Supabase Edge Function or host cron hits `syncJarvis` every N min. Resilient if no webhook.
- [ ] **C. Loader fallback:** On loader read, if newest `synced_at` older than threshold, fire `syncJarvis` then read. Self-healing safety net.

### 1.5 Swap the loader
- [ ] [routes/_protected.projects.tsx](app/routes/_protected.projects.tsx): change `loader` from `return { PROJECTS, ... }` to:
  - `requireSession(request)` → get `supabase` + `user`.
  - `select * from jarvis_apps where user_id = ... order by progress desc`.
  - Map rows → `ProjectItem[]`. Build `forgeNote` + `ships` from data (or keep mock text until JARVIS provides it).
  - Return same shape the component already consumes — **zero component changes**.
- [ ] Loading/empty states: component already has skeleton pattern (see Investments `useFetch`). Add empty state when 0 apps synced.

### 1.6 Verify
- [ ] Seed one JARVIS app, run sync, confirm row in Supabase, confirm it renders in `/projects`.
- [ ] Kill JARVIS API → confirm view still loads from cache (no 500).

---

## 2. Connect Sharesight for portfolio

Portfolio data via the **Sharesight User API** (cloud REST, OAuth 2.0). Feeds the **Investments (Scout)** view at [routes/_protected.investments.tsx](app/routes/_protected.investments.tsx) and the home invest stat. Replaces the static `PORTFOLIO` mock.

**Why Sharesight (vs IBKR gateway, now removed):** cloud API, no gateway process, no daily re-auth, no always-on box. A Vercel cron (or Supabase Edge Function) can call it directly. Sharesight also aggregates multiple brokers and does the performance/valuation math for us.

> **All IBKR code was removed** (gateway transport, OAuth signer, sync runner, keep-alive, migration 007, workflow). The investments + home loaders are back on the `PORTFOLIO` mock until Sharesight is wired.

**Architecture:** Node sync job (Vercel cron / Supabase Edge Function) → OAuth2 token → fetch holdings/valuation → write Supabase → route loader reads Supabase. Same cache pattern as JARVIS; nothing on the client.

```
[Vercel cron / Edge Fn]                    [Vercel]
 OAuth2 token (30-min, refreshed)           dashboard UI
   ↓ GET Sharesight holdings/valuation       ↑ reads
 sync job ──writes──► [Supabase] ◄──reads── /investments + /home
```

### 2.1 Get Sharesight API access — DO THIS (the gating step)
Docs: <https://portfolio.sharesight.com/api/3/configuring_oauth> · OAuth example: <https://portfolio.sharesight.com/api/2/authentication_flow>
- [ ] Email **support@sharesight.com** to request an **API account** (not self-serve; allow a few days). Ask for **own-account / client-credentials** access.
- [ ] Once enabled: **Account > Sharesight API** → copy **Client ID**, **Client Secret**, **Redirect URI**.
- [ ] Confirm your user is **linked to the API consumer app** (required for the client-credentials grant).
- [ ] Decide grant type: **client_credentials** (own account, headless — what we want) vs authorization_code (multi-user/SSO).
- [ ] Pick API version: **V2 (stable/GA)** recommended over V3 (closed beta, may change without notice). Both share the OAuth2 auth.

### 2.2 Confirm the endpoints — DO THIS (verify against your account)
Target shape needed by [atlas-data.ts](app/lib/atlas-data.ts) `Portfolio`: `total`, `dayPct`/`dayAbs`, `ytdPct`, per-holding `{sym, name, val, pct, alloc, tone}`, allocation by class.
- [ ] List portfolios: `GET {base}/portfolios`.
- [ ] Holdings + value: `GET {base}/portfolios/:id/valuation?balance_date=YYYY-MM-DD` (holdings, market value, allocation).
- [ ] Performance: `GET {base}/portfolios/:id/performance?start_date=&end_date=` (return %, capital gain — for `ytdPct`, `dayPct`).
- [ ] Map currency (your base is AUD). Note Sharesight returns rich performance numbers IBKR didn't.

### 2.3 Build the integration — CODE (after 2.1/2.2)
- [ ] `app/lib/sharesight.server.ts`: OAuth2 client (cache token, refresh at 30-min expiry), `fetchPortfolio()` (valuation + performance → normalize to `Portfolio`), `syncSharesight(userId)` (upsert Supabase), `readPortfolio(sb, userId)` (loader read, mock fallback).
- [ ] Supabase migration: `sharesight_portfolio` + `sharesight_holdings` + `sync_runs` (same RLS pattern as existing tables; mirror the old 007 shape).
- [ ] Swap [routes/_protected.investments.tsx](app/routes/_protected.investments.tsx) + [routes/_protected.home.tsx](app/routes/_protected.home.tsx) loaders to read Supabase, mock fallback (revert the current mock-only loaders).
- [ ] Trigger: Vercel cron or Supabase Edge Function on a schedule (every 15–30 min — Sharesight data is EOD/slow-moving, no need for tight cadence). Mind the **rate limits** (see usage-limits doc).

### 2.4 Env
- [ ] Fill `.env.local` from [.env.example](.env.example): `SHARESIGHT_CLIENT_ID`, `SHARESIGHT_CLIENT_SECRET`, `SHARESIGHT_API_BASE`, `SHARESIGHT_OAUTH_BASE`, `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] Add the same to the cron/Edge-Function host secrets.

### 2.5 Known follow-ups
- [ ] `watch` (Scout watchlist) — user-curated, stays mock.
- [ ] `scoutNote` (the AI read) — mock until an LLM summarizer runs over synced numbers.
- [ ] Per-holding sparklines — Sharesight performance history can populate these later.
- [ ] Token refresh: tokens expire every 30 min — client must refresh, not re-auth per call.

---

## Shared infrastructure (do once, both use it)

- [ ] **Trigger layer:** one cron/Edge-Function host that runs `syncJarvis` + `syncSharesight`. Supabase Scheduled Edge Functions, or host cron hitting internal resource routes guarded by a secret.
- [ ] **Env types:** extend [app/env.d.ts](app/env.d.ts) with all new keys.
- [ ] **Secrets:** never in client bundle — all sync code is `*.server.ts` / resource routes only.
- [ ] **Sync status:** small `sync_runs(source, ok, error, ran_at)` table → surface "last synced" + failures in the agent rail (Scout/Forge `last` field).
- [ ] **Migration discipline:** run new migrations in Supabase SQL editor (matches existing `supabase-migration.sql` workflow), keep numbered files in `supabase/migrations/`.

## Open decisions
- [x] Portfolio source: **Sharesight API** (cloud OAuth2) — replaces the removed IBKR gateway approach.
- [ ] Sharesight API version: V2 (stable, recommended) vs V3 (beta). Confirm when access is granted.
- [ ] Sharesight grant: client_credentials (own account) vs authorization_code (multi-user/SSO).
- [ ] `scoutNote`/`forgeNote` AI summaries: wire an LLM pass over synced data, or keep static until later phase?
