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

IBKR via the **Client Portal Gateway** — **individual self-access**. The gateway (Java) holds an authenticated session after a browser login; the sync job makes unsigned HTTPS calls to it. Feeds the **Investments (Scout)** view at [routes/_protected.investments.tsx](app/routes/_protected.investments.tsx).

> **Why not OAuth?** IBKR's OAuth 1.0a self-service is for **third-party vendors**, not individuals accessing their own account — confirmed in IBKR docs, and the self-service portal isn't exposed on an individual Pro account. For individuals the auth IS the gateway login; there's no API toggle and no consumer key. (The OAuth signer in [app/lib/ibkr-oauth.server.ts](app/lib/ibkr-oauth.server.ts) is kept for a future multi-user/vendor path, currently unused.)

**Architecture:** the gateway + Node sync job run on an **always-on box** (local PC for dev, then Railway/Fly/VPS/IBeam-Docker). The job writes Supabase; the route loader reads Supabase. **Vercel hosts only the UI** and never touches IBKR or the gateway.

```
[always-on box]                         [Vercel]
 gateway (Java, holds session)           dashboard UI
   ↓ unsigned localhost:5000 calls        ↑ reads
 sync job (cron) ──writes──► [Supabase] ◄──reads── /investments
```

**Code status: built (gateway transport).**
- [app/lib/ibkr.server.ts](app/lib/ibkr.server.ts) — `fetchPortfolio()` (gateway calls + `auth/status` check), `syncIbkr(userId)`, `readPortfolio(sb, userId)`. Self-signed cert handled.
- [scripts/sync-ibkr.ts](scripts/sync-ibkr.ts) — runner (`npm run sync:ibkr`).
- [supabase/migrations/007_ibkr_portfolio.sql](supabase/migrations/007_ibkr_portfolio.sql) — tables + RLS + `sync_runs`.
- Loader swapped: `/investments` reads Supabase, falls back to the `PORTFOLIO` mock until first sync (UI shows a "sample data" label, never breaks).
- ⚠️ [.github/workflows/sync-ibkr.yml](.github/workflows/sync-ibkr.yml) — was for the OAuth/cloud-cron path. **Won't work as-is** for the gateway path (GitHub runners can't reach your local gateway). Repoint at the box or delete once the box is chosen.

### 2.1 Prereqs — DO THIS
- [ ] Install **Java JRE** (8u192+). `java -version` to confirm. *(Not currently installed on this machine.)*
- [ ] Wait for the **paper account** to open (live account works too; paper is safer for first test).
- [ ] On IBKR's Market Data Subscriptions page, **sign the "Market Data API Terms" acknowledgement** — gates live quotes used by the day-% snapshot.
- [ ] Account id is `U8770342` → `IBKR_ACCOUNT_ID` (or leave blank to auto-resolve).

### 2.2 Run + authenticate the gateway — DO THIS
- [ ] Download the **Client Portal Gateway** zip (IBKR Web API docs → Quickstart), unzip.
- [ ] Log out of TWS/mobile for that username first (IBKR blocks simultaneous logins).
- [ ] Launch: Windows `bin\run.bat root\conf.yaml` · Unix `bin/run.sh root/conf.yaml`. Leave it running (port 5000).
- [ ] Browser → `https://localhost:5000` → accept the self-signed cert warning → log in + 2FA. See `Client login succeeds`.

### 2.3 Install + wire env + sync — DO THIS
- [ ] `npm install` (pulls `tsx`).
- [ ] Run [supabase/migrations/007_ibkr_portfolio.sql](supabase/migrations/007_ibkr_portfolio.sql) in the Supabase SQL editor.
- [ ] Fill `.env.local` from [.env.example](.env.example): `IBKR_GATEWAY_URL` (default `https://localhost:5000`), `IBKR_ACCOUNT_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] With the gateway authenticated, run:
  ```bash
  IBKR_SYNC_USER_ID=<your-supabase-user-uuid> npm run sync:ibkr
  ```
  Expect `[ibkr] <uuid> synced`. Errors are explicit: "gateway unreachable" (not running) or "session not authenticated" (re-login in browser).
- [ ] Confirm rows: `ibkr_portfolio` (1) + `ibkr_holdings` (N) + `sync_runs` ok=true.
- [ ] Open `/investments` — flips from "sample data" to live, totals reconciling to IBKR.

### 2.4 Session lifetime — IMPORTANT
The gateway session is **not** self-maintaining:
- **Idle drop (~5 min):** an idle session dies. Keep it alive with the tickler:
  ```bash
  npm run ibkr:keepalive    # GET /tickle every 60s; warns if the session lapses
  ```
  Run it alongside the gateway. (The 10-min sync alone is too slow to prevent idle drop.)
- **Hard cap (~24h):** a full re-login (browser + 2FA at `https://localhost:5000`) is required once a day. No way around it for the manual gateway — IBeam (below) automates it.

### 2.5 Make it unattended — Oracle Cloud + IBeam (chosen target, $0/mo)
Goal: gateway runs 24/7 with no daily browser login, free, reachable by Vercel.
- [ ] **Oracle Cloud Always Free** VM (ARM Ampere A1, up to 4 vCPU/24GB — free forever, not a trial).
- [ ] Run **IBeam (Docker)** on it — auto-tickles AND auto-re-logins past the 24h cap (headless Chrome injects credentials). Fully unattended.
  ```yaml
  # compose.yaml
  services:
    ibeam:
      image: voyz/ibeam
      env_file: [env.list]   # IBEAM_ACCOUNT, IBEAM_PASSWORD
      ports: ['5000:5000']
      network_mode: bridge
      restart: 'no'
  ```
- [ ] **2FA must be IB Key "seamless"** (IBKR Mobile) or IBeam can't auto-pass it. Configure before relying on it.
- [ ] **Security — critical:** IBeam stores raw IBKR username+password on the VM. Test with **paper creds first**. Lock the VM firewall so `:5000` is reachable ONLY by the sync job + your IP — never public.
- [ ] Point `IBKR_GATEWAY_URL` at the VM (private IP / SSH tunnel, not public). Run the sync on the same VM via cron every 5–15 min market hours.
- [ ] Prod flow becomes: Oracle VM (IBeam+gateway+sync) → Supabase → Vercel UI. Unset `IBKR_LIVE_IN_DEV` in prod so the loader reads Supabase.

### 2.6 Known follow-ups (deferred, not blocking)
- [ ] `watch` (Scout watchlist) — user-curated, still mock.
- [ ] `scoutNote` (the AI read) — preserved/mock until an LLM summarizer runs over synced numbers.
- [ ] `ytd_pct` — not on these endpoints; preserved across syncs, defaults 0. Source from `/portfolio/{acct}/performance` or FlexQuery later.
- [ ] Per-holding sparklines — borrow a mock series; build from history later.
- [ ] Gateway session ~24h; re-login (or IBeam) required. The `auth/status` check fails loudly when it lapses.

---

## Shared infrastructure (do once, both use it)

- [ ] **Trigger layer:** one cron/Edge-Function host that runs `syncJarvis` + `syncIbkr`. Supabase Scheduled Edge Functions, or host cron hitting internal resource routes guarded by a secret.
- [ ] **Env types:** extend [app/env.d.ts](app/env.d.ts) with all new keys.
- [ ] **Secrets:** never in client bundle — all sync code is `*.server.ts` / resource routes only.
- [ ] **Sync status:** small `sync_runs(source, ok, error, ran_at)` table → surface "last synced" + failures in the agent rail (Scout/Forge `last` field).
- [ ] **Migration discipline:** run new migrations in Supabase SQL editor (matches existing `supabase-migration.sql` workflow), keep numbered files in `supabase/migrations/`.

## Open decisions
- [x] IBKR auth: **gateway (individual self-access)** — OAuth is vendor-only, not available to an individual account.
- [x] IBKR gateway host: local PC + tickler (dev, now) → **Oracle Cloud Always Free + IBeam** (unattended prod, $0/mo).
- [ ] `spark`/history: start capturing now (value-history table) or backfill later from FlexQuery?
- [ ] `scoutNote`/`forgeNote` AI summaries: wire an LLM pass over synced data, or keep static until later phase?
