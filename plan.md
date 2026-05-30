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

## 2. Connect Interactive Brokers for portfolio

IBKR via **Client Portal Web API**, **OAuth 1.0a headless** (self-service portal — no gateway process, no daily browser re-auth, survives unattended on a cloud cron). Base URL `https://api.ibkr.com/v1/api`. Feeds the **Investments (Scout)** view at [routes/_protected.investments.tsx](app/routes/_protected.investments.tsx).

**Architecture:** Node cron job runs the OAuth handshake + fetch → writes Supabase → the route loader reads Supabase. Vercel never touches IBKR (serverless can't hold the stateful LST handshake). Sync host = **GitHub Actions cron** (could swap to any always-on box).

**Code status: built.** Files in place:
- [app/lib/ibkr-oauth.server.ts](app/lib/ibkr-oauth.server.ts) — OAuth 1.0a signer (DH + RSA-SHA256 + LST), ported from the `Voyz/ibind` reference. `toByteArray` sign-bit quirk verified against reference vectors.
- [app/lib/ibkr.server.ts](app/lib/ibkr.server.ts) — `fetchPortfolio()`, `syncIbkr(userId)`, `readPortfolio(sb, userId)`.
- [scripts/sync-ibkr.ts](scripts/sync-ibkr.ts) — cron runner (`npm run sync:ibkr`).
- [.github/workflows/sync-ibkr.yml](.github/workflows/sync-ibkr.yml) — every 10 min, weekdays, market hours.
- [supabase/migrations/007_ibkr_portfolio.sql](supabase/migrations/007_ibkr_portfolio.sql) — tables + RLS + `sync_runs`.
- Loader swapped: `/investments` reads Supabase, falls back to the `PORTFOLIO` mock until the first sync (so the UI never breaks pre-keys; the page shows a "sample data" sub-label).

**What's left = the IBKR portal setup (you) + install + wire env (below).**

### 2.1 IBKR self-service OAuth setup — DO THIS (no IBKR approval wait; self-service)
Portal docs: <https://www.interactivebrokers.com/campus/ibkr-api-page/oauth-1-0a-extended/>
- [ ] Log into IBKR → **Settings → API → Settings**, enable the Client Portal / Web API.
- [ ] Open the **OAuth Self-Service Portal**, log in with the username you want API sessions to run as.
- [ ] **Consumer key:** choose a 9-char key (A–Z, uppercased). → `IBKR_CONSUMER_KEY`.
- [ ] **Generate two RSA keypairs** (2048-bit) locally:
  ```bash
  openssl genrsa -out private_signature.pem 2048
  openssl rsa -in private_signature.pem -pubout -out public_signature.pem
  openssl genrsa -out private_encryption.pem 2048
  openssl rsa -in private_encryption.pem -pubout -out public_encryption.pem
  ```
  Upload `public_signature.pem` + `public_encryption.pem` to the portal. Keep the two **private** PEMs → `IBKR_SIGNATURE_KEY` / `IBKR_ENCRYPTION_KEY`.
- [ ] **Generate the DH param prime** and grab the prime hex:
  ```bash
  openssl dhparam -out dhparam.pem 2048
  ```
  Upload `dhparam.pem` to the portal. The portal also shows the prime; put the **hex prime** in `IBKR_DH_PRIME` (generator is `2`).
- [ ] In the portal, generate the **access token** + **access token secret** → `IBKR_ACCESS_TOKEN` / `IBKR_ACCESS_TOKEN_SECRET`.
- [ ] Note your **account id** (e.g. `U1234567`) → `IBKR_ACCOUNT_ID`. Realm = `limited_poa` (live) — `IBKR_REALM`.
- [ ] PEM keys have newlines. Either keep them with `\n` escapes in the env value, or base64-encode the whole PEM (`base64 -w0 private_signature.pem`). The loader (`decodePem`) handles both.

### 2.2 Install + wire env — DO THIS
- [ ] `npm install` (pulls the newly-added `tsx` devDep).
- [ ] Run [supabase/migrations/007_ibkr_portfolio.sql](supabase/migrations/007_ibkr_portfolio.sql) in the Supabase SQL editor.
- [ ] Fill `.env.local` from [.env.example](.env.example) — all `IBKR_*` keys + `SUPABASE_SERVICE_ROLE_KEY` (Supabase dashboard → Project Settings → API → service_role).
- [ ] Add the same secrets to **GitHub repo → Settings → Secrets → Actions** (the workflow reads them): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `IBKR_CONSUMER_KEY`, `IBKR_ACCESS_TOKEN`, `IBKR_ACCESS_TOKEN_SECRET`, `IBKR_ENCRYPTION_KEY`, `IBKR_SIGNATURE_KEY`, `IBKR_DH_PRIME`, `IBKR_ACCOUNT_ID`, `IBKR_REALM`.

### 2.3 Test the handshake — DO THIS
- [ ] Local dry-run against your account:
  ```bash
  IBKR_SYNC_USER_ID=<your-supabase-user-uuid> npm run sync:ibkr
  ```
  Expect `[ibkr] <uuid> synced`. If the LST step fails, the error prints the IBKR response.
- [ ] Confirm rows: `ibkr_portfolio` (1) + `ibkr_holdings` (N) + a `sync_runs` ok=true row.
- [ ] Open `/investments` — should flip from "sample data" to live, totals reconciling to IBKR.
- [ ] In GitHub Actions, run the **Sync IBKR portfolio** workflow via *Run workflow* to confirm the cron path works.

### 2.4 Known follow-ups (deferred, not blocking)
- [ ] `watch` (Scout watchlist) — user-curated, still mock. Needs its own table later.
- [ ] `scoutNote` (the AI read) — preserved from prior value / mock until an LLM summarizer runs over the synced numbers.
- [ ] `ytd_pct` — not on these endpoints; preserved across syncs, defaults 0. Source from FlexQuery or `/portfolio/{acct}/performance` later.
- [ ] Per-holding sparklines — currently borrow a mock series. Build from `ibkr_value_history` once it has depth, or per-conid history.
- [ ] LST is valid 24h; the runner re-handshakes each run (fine at 10-min cadence). For higher frequency, cache the LST + add the tickle keep-alive.

---

## Shared infrastructure (do once, both use it)

- [ ] **Trigger layer:** one cron/Edge-Function host that runs `syncJarvis` + `syncIbkr`. Supabase Scheduled Edge Functions, or host cron hitting internal resource routes guarded by a secret.
- [ ] **Env types:** extend [app/env.d.ts](app/env.d.ts) with all new keys.
- [ ] **Secrets:** never in client bundle — all sync code is `*.server.ts` / resource routes only.
- [ ] **Sync status:** small `sync_runs(source, ok, error, ran_at)` table → surface "last synced" + failures in the agent rail (Scout/Forge `last` field).
- [ ] **Migration discipline:** run new migrations in Supabase SQL editor (matches existing `supabase-migration.sql` workflow), keep numbered files in `supabase/migrations/`.

## Open decisions
- [ ] IBKR: gateway-host vs OAuth 1.0a headless — **OAuth recommended** for unattended server. Confirm IBKR grants consumer key.
- [ ] `spark`/history: start capturing now (value-history table) or backfill later from FlexQuery?
- [ ] `scoutNote`/`forgeNote` AI summaries: wire an LLM pass over synced data, or keep static until later phase?
