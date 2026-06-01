# Sharesight Portfolio Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static `PORTFOLIO` mock with live data from the Sharesight User API (V2, OAuth2 client_credentials), cached in Supabase, read by the investments + home loaders.

**Architecture:** Cache pattern — loaders call `readPortfolio()`, which reads Supabase cache rows and fires `syncSharesight()` when stale (>30min). The sync job fetches an OAuth token (cached in Supabase), calls Sharesight valuation + performance endpoints, normalizes to the `Portfolio` shape, and upserts. On any upstream failure the loader falls back to the mock. Trigger is loader-fallback only (no cron yet).

**Tech Stack:** React Router v7, Supabase (`@supabase/supabase-js` service-role client), Vitest (added in Task 0), TypeScript strict.

**Spec:** [docs/specs/2026-06-01-sharesight-integration-design.md](../specs/2026-06-01-sharesight-integration-design.md)

---

## File Structure

- `vitest.config.ts` (create) — test runner config, node environment for `.server` libs.
- `supabase/migrations/008_sharesight.sql` (create) — 5 cache/state tables + RLS.
- `app/env.d.ts` (modify) — add Sharesight env keys.
- `app/lib/supabase.admin.ts` (create) — service-role client, server-only.
- `app/lib/sharesight.server.ts` (create) — token cache, fetch+normalize, sync, read.
- `app/lib/sharesight.server.test.ts` (create) — unit tests for normalization, token reuse, fallback.
- `app/routes/_protected.investments.tsx` (modify) — swap loader to `readPortfolio`.
- `app/routes/_protected.home.tsx` (modify) — swap loader to `readPortfolio`.
- `.env.local` (modify) — remove dead `IBKR_*` keys.

---

## Task 0: Add Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (scripts + devDependencies)

- [ ] **Step 1: Install vitest**

```bash
npm i -D vitest
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['app/**/*.test.ts'],
  },
})
```

- [ ] **Step 3: Add test script to `package.json`**

In the `"scripts"` block add:

```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 4: Verify vitest runs (no tests yet)**

Run: `npm test`
Expected: exits 0 with "No test files found" (or runs 0 tests). Not an error.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore(test): add vitest for server-lib unit tests"
```

---

## Task 1: Migration — Sharesight cache tables

**Files:**
- Create: `supabase/migrations/008_sharesight.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Sharesight portfolio cache (cache pattern: sync writes, loader reads)

-- One row per user: portfolio-level aggregates
create table sharesight_portfolio (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  total      numeric not null default 0,
  day_pct    numeric not null default 0,
  day_abs    numeric not null default 0,
  ytd_pct    numeric not null default 0,
  synced_at  timestamptz not null default now()
);
alter table sharesight_portfolio enable row level security;
create policy "owner only" on sharesight_portfolio
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- N rows per user: holdings
create table sharesight_holdings (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  sym       text not null,
  name      text not null default '',
  val       numeric not null default 0,
  pct       numeric not null default 0,
  shares    numeric,
  alloc     numeric not null default 0,
  tone      text not null default 'flat',
  note      text not null default '',
  position  integer not null default 0
);
alter table sharesight_holdings enable row level security;
create policy "owner only" on sharesight_holdings
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- N rows per user: allocation by class
create table sharesight_allocation (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  label     text not null,
  pct       numeric not null default 0,
  color     text not null default 'chart-1',
  position  integer not null default 0
);
alter table sharesight_allocation enable row level security;
create policy "owner only" on sharesight_allocation
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- OAuth token cache (single row, service-role only — no user policy)
create table sharesight_oauth (
  id           integer primary key default 1,
  access_token text not null,
  expires_at   timestamptz not null,
  constraint single_row check (id = 1)
);
alter table sharesight_oauth enable row level security;

-- Sync event log (service-role only)
create table sync_runs (
  id       uuid primary key default gen_random_uuid(),
  source   text not null,
  ok       boolean not null,
  error    text,
  ran_at   timestamptz not null default now()
);
alter table sync_runs enable row level security;
```

- [ ] **Step 2: Apply via Supabase MCP**

Use the Supabase MCP `apply_migration` tool with name `008_sharesight` and the SQL above.
(Matches the existing numbered-migration workflow; the file in `supabase/migrations/` is the source of record.)

- [ ] **Step 3: Verify tables exist**

Use Supabase MCP `list_tables` — confirm `sharesight_portfolio`, `sharesight_holdings`,
`sharesight_allocation`, `sharesight_oauth`, `sync_runs` all present with RLS enabled.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/008_sharesight.sql
git commit -m "feat(sharesight): cache + oauth + sync_runs migration"
```

---

## Task 2: Env types + service-role client

**Files:**
- Modify: `app/env.d.ts`
- Create: `app/lib/supabase.admin.ts`

- [ ] **Step 1: Extend `app/env.d.ts` ProcessEnv**

Add these keys inside the existing `interface ProcessEnv` block (after `SUPABASE_SERVICE_ROLE_KEY`):

```ts
      SHARESIGHT_CLIENT_ID: string
      SHARESIGHT_CLIENT_SECRET: string
      SHARESIGHT_API_BASE: string
      SHARESIGHT_OAUTH_BASE: string
```

- [ ] **Step 2: Create `app/lib/supabase.admin.ts`**

```ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

/**
 * Service-role Supabase client. Server-only — bypasses RLS.
 * Used by the Sharesight sync job and OAuth token cache (service-role-only tables).
 * NEVER import into client code.
 */
export function createSupabaseAdminClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS (no errors from the new file or env keys).

- [ ] **Step 4: Commit**

```bash
git add app/env.d.ts app/lib/supabase.admin.ts
git commit -m "feat(sharesight): service-role client + env types"
```

---

## Task 3: Sharesight lib — token cache (TDD)

**Files:**
- Create: `app/lib/sharesight.server.ts`
- Create: `app/lib/sharesight.server.test.ts`

The lib uses a small injectable surface so tests need no real network/DB: functions take a
`deps` object `{ now, fetch, oauthGet, oauthSet }`. Production wires real implementations.

- [ ] **Step 1: Write the failing test for token reuse + refresh**

Create `app/lib/sharesight.server.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { getToken } from './sharesight.server'

const TOKEN_RESPONSE = { access_token: 'fresh-token', expires_in: 1800 }

function makeDeps(stored: { access_token: string; expires_at: string } | null, nowMs: number) {
  return {
    now: () => new Date(nowMs),
    fetch: vi.fn(async () => new Response(JSON.stringify(TOKEN_RESPONSE), { status: 200 })),
    oauthGet: vi.fn(async () => stored),
    oauthSet: vi.fn(async () => {}),
  }
}

describe('getToken', () => {
  it('reuses a cached token before expiry', async () => {
    const now = 1_000_000
    const deps = makeDeps(
      { access_token: 'cached', expires_at: new Date(now + 600_000).toISOString() },
      now
    )
    const token = await getToken(deps)
    expect(token).toBe('cached')
    expect(deps.fetch).not.toHaveBeenCalled()
  })

  it('fetches a new token when cache missing', async () => {
    const deps = makeDeps(null, 1_000_000)
    const token = await getToken(deps)
    expect(token).toBe('fresh-token')
    expect(deps.fetch).toHaveBeenCalledOnce()
    expect(deps.oauthSet).toHaveBeenCalledOnce()
  })

  it('fetches a new token when cached token expired', async () => {
    const now = 2_000_000
    const deps = makeDeps(
      { access_token: 'old', expires_at: new Date(now - 1000).toISOString() },
      now
    )
    const token = await getToken(deps)
    expect(token).toBe('fresh-token')
    expect(deps.fetch).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test -- sharesight`
Expected: FAIL — `getToken` not exported / module not found.

- [ ] **Step 3: Write minimal `app/lib/sharesight.server.ts` token logic**

```ts
const SAFETY_MARGIN_MS = 5 * 60 * 1000 // refresh 5min before the 30min expiry

export interface OauthRow {
  access_token: string
  expires_at: string
}

export interface TokenDeps {
  now: () => Date
  fetch: typeof fetch
  oauthGet: () => Promise<OauthRow | null>
  oauthSet: (row: OauthRow) => Promise<void>
}

export async function getToken(deps: TokenDeps): Promise<string> {
  const stored = await deps.oauthGet()
  const nowMs = deps.now().getTime()
  if (stored && new Date(stored.expires_at).getTime() - SAFETY_MARGIN_MS > nowMs) {
    return stored.access_token
  }
  const res = await deps.fetch(`${process.env.SHARESIGHT_OAUTH_BASE}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.SHARESIGHT_CLIENT_ID,
      client_secret: process.env.SHARESIGHT_CLIENT_SECRET,
    }),
  })
  if (!res.ok) throw new Error(`Sharesight token fetch failed: ${res.status}`)
  const json = (await res.json()) as { access_token: string; expires_in: number }
  const expiresAt = new Date(nowMs + json.expires_in * 1000).toISOString()
  await deps.oauthSet({ access_token: json.access_token, expires_at: expiresAt })
  return json.access_token
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npm test -- sharesight`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/lib/sharesight.server.ts app/lib/sharesight.server.test.ts
git commit -m "feat(sharesight): oauth token cache with reuse/refresh"
```

---

## Task 4: Sharesight lib — normalize valuation+performance to Portfolio (TDD)

**Files:**
- Modify: `app/lib/sharesight.server.ts`
- Modify: `app/lib/sharesight.server.test.ts`

- [ ] **Step 1: Add failing normalization test**

Append to `app/lib/sharesight.server.test.ts`:

```ts
import { normalizePortfolio } from './sharesight.server'

const VALUATION = {
  value: 100000,
  holdings: [
    { instrument: { code: 'NVDA', name: 'NVIDIA' }, value: 60000, quantity: 240, allocation: 60 },
    { instrument: { code: 'VOO', name: 'S&P 500 ETF' }, value: 40000, quantity: 100, allocation: 40 },
  ],
  sub_totals: [
    { group: 'Equities', value: 100000, percentage: 100 },
  ],
}

const PERFORMANCE = {
  value_gain_percent: 22.6,            // ytd
  holdings: [
    { instrument_code: 'NVDA', capital_gain_percent: 3.9 },
    { instrument_code: 'VOO', capital_gain_percent: -0.8 },
  ],
}

const DAY = { value_gain_percent: 1.84, value_gain: 1840 } // 1-day window

describe('normalizePortfolio', () => {
  it('maps valuation + performance into Portfolio shape', () => {
    const p = normalizePortfolio(VALUATION, PERFORMANCE, DAY)
    expect(p.total).toBe(100000)
    expect(p.ytdPct).toBe(22.6)
    expect(p.dayPct).toBe(1.84)
    expect(p.dayAbs).toBe(1840)
    expect(p.holdings).toHaveLength(2)
    const nvda = p.holdings.find((h) => h.sym === 'NVDA')!
    expect(nvda.name).toBe('NVIDIA')
    expect(nvda.val).toBe(60000)
    expect(nvda.pct).toBe(3.9)
    expect(nvda.alloc).toBe(60)
    expect(nvda.shares).toBe(240)
    expect(nvda.tone).toBe('up')
    expect(nvda.spark.length).toBeGreaterThan(0) // placeholder series
    const voo = p.holdings.find((h) => h.sym === 'VOO')!
    expect(voo.tone).toBe('down')
    expect(p.allocation).toEqual([{ label: 'Equities', pct: 100, color: 'chart-1' }])
    // deferred fields come from mock
    expect(p.watch.length).toBeGreaterThan(0)
    expect(p.scoutNote.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test -- sharesight`
Expected: FAIL — `normalizePortfolio` not exported.

- [ ] **Step 3: Implement `normalizePortfolio`**

Add to `app/lib/sharesight.server.ts` (imports at top of file):

```ts
import { PORTFOLIO, type Portfolio, type Holding, type Tone, type ChartColor } from './atlas-data'

const ALLOC_COLORS: ChartColor[] = ['chart-1', 'chart-4', 'chart-2', 'chart-5', 'chart-3']

/** Deterministic placeholder sparkline seeded by symbol (history deferred, spec §2.5). */
function sparkFor(sym: string): number[] {
  let seed = 0
  for (let i = 0; i < sym.length; i++) seed = (seed * 31 + sym.charCodeAt(i)) % 233280
  const out: number[] = []
  let v = 1000
  for (let i = 0; i < 24; i++) {
    seed = (seed * 9301 + 49297) % 233280
    const r = seed / 233280 - 0.5
    v = Math.max(400, v + v * (r * 0.03 + 0.002))
    out.push(Math.round(v * 100) / 100)
  }
  return out
}

function toneOf(pct: number): Tone {
  if (pct > 0.05) return 'up'
  if (pct < -0.05) return 'down'
  return 'flat'
}

interface SsValuationHolding {
  instrument: { code: string; name: string }
  value: number
  quantity: number | null
  allocation: number
}
interface SsValuation {
  value: number
  holdings: SsValuationHolding[]
  sub_totals: { group: string; value: number; percentage: number }[]
}
interface SsPerformance {
  value_gain_percent: number
  holdings: { instrument_code: string; capital_gain_percent: number }[]
}
interface SsDayWindow {
  value_gain_percent: number
  value_gain: number
}

export function normalizePortfolio(
  valuation: SsValuation,
  performance: SsPerformance,
  day: SsDayWindow
): Portfolio {
  const perfBySym = new Map(
    performance.holdings.map((h) => [h.instrument_code, h.capital_gain_percent])
  )
  const holdings: Holding[] = valuation.holdings.map((h) => {
    const pct = perfBySym.get(h.instrument.code) ?? 0
    return {
      sym: h.instrument.code,
      name: h.instrument.name,
      val: h.value,
      pct,
      shares: h.quantity,
      alloc: h.allocation,
      spark: sparkFor(h.instrument.code),
      tone: toneOf(pct),
      note: '',
    }
  })
  const allocation = valuation.sub_totals.map((s, i) => ({
    label: s.group,
    pct: Math.round(s.percentage),
    color: ALLOC_COLORS[i % ALLOC_COLORS.length],
  }))
  return {
    total: valuation.value,
    dayPct: day.value_gain_percent,
    dayAbs: day.value_gain,
    ytdPct: performance.value_gain_percent,
    spark: sparkFor('PORTFOLIO'),
    scoutNote: PORTFOLIO.scoutNote, // deferred — mock (spec §2.5)
    holdings,
    allocation,
    watch: PORTFOLIO.watch,         // deferred — mock (spec §2.5)
  }
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npm test -- sharesight`
Expected: PASS (all token + normalize tests).

- [ ] **Step 5: Commit**

```bash
git add app/lib/sharesight.server.ts app/lib/sharesight.server.test.ts
git commit -m "feat(sharesight): normalize valuation+performance to Portfolio"
```

---

## Task 5: Sharesight lib — fetchPortfolio (live API caller)

**Files:**
- Modify: `app/lib/sharesight.server.ts`

No unit test (pure network orchestration over already-tested `normalizePortfolio`); covered by manual verify in Task 8.

- [ ] **Step 1: Add `fetchPortfolio`**

Add to `app/lib/sharesight.server.ts`:

```ts
function ymd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

async function ssGet(path: string, token: string): Promise<any> {
  const res = await fetch(`${process.env.SHARESIGHT_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Sharesight GET ${path} failed: ${res.status}`)
  return res.json()
}

export async function fetchPortfolio(token: string, now: Date): Promise<Portfolio> {
  const { portfolios } = await ssGet('/portfolios', token)
  if (!portfolios?.length) throw new Error('Sharesight returned no portfolios')
  const id = portfolios[0].id
  const today = ymd(now)
  const jan1 = ymd(new Date(now.getFullYear(), 0, 1))
  const yesterday = ymd(new Date(now.getTime() - 24 * 60 * 60 * 1000))

  const valuationRes = await ssGet(`/portfolios/${id}/valuation?balance_date=${today}`, token)
  const ytdRes = await ssGet(
    `/portfolios/${id}/performance?start_date=${jan1}&end_date=${today}`,
    token
  )
  const dayRes = await ssGet(
    `/portfolios/${id}/performance?start_date=${yesterday}&end_date=${today}`,
    token
  ).catch(() => ({ value_gain_percent: 0, value_gain: 0 }))

  return normalizePortfolio(
    valuationRes.report ?? valuationRes,
    ytdRes.report ?? ytdRes,
    { value_gain_percent: (dayRes.report ?? dayRes).value_gain_percent ?? 0, value_gain: (dayRes.report ?? dayRes).value_gain ?? 0 }
  )
}
```

> NOTE: Sharesight V2 may wrap responses in a `report` envelope. The `?? valuationRes` fallback handles both. Confirm against real responses in Task 8 and tighten if needed.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/lib/sharesight.server.ts
git commit -m "feat(sharesight): fetchPortfolio calls valuation + performance"
```

---

## Task 6: Sharesight lib — sync + read (TDD for fallback)

**Files:**
- Modify: `app/lib/sharesight.server.ts`
- Modify: `app/lib/sharesight.server.test.ts`

- [ ] **Step 1: Add failing fallback test**

Append to `app/lib/sharesight.server.test.ts`:

```ts
import { buildPortfolioFromRows } from './sharesight.server'

describe('buildPortfolioFromRows', () => {
  it('assembles Portfolio from cache rows', () => {
    const p = buildPortfolioFromRows(
      { total: 50000, day_pct: 1.2, day_abs: 600, ytd_pct: 10 },
      [{ sym: 'NVDA', name: 'NVIDIA', val: 30000, pct: 3.9, shares: 100, alloc: 60, tone: 'up', note: '' }],
      [{ label: 'Equities', pct: 100, color: 'chart-1' }]
    )
    expect(p.total).toBe(50000)
    expect(p.holdings[0].sym).toBe('NVDA')
    expect(p.holdings[0].spark.length).toBeGreaterThan(0) // re-derived placeholder
    expect(p.allocation[0].label).toBe('Equities')
    expect(p.watch.length).toBeGreaterThan(0)  // mock
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test -- sharesight`
Expected: FAIL — `buildPortfolioFromRows` not exported.

- [ ] **Step 3: Implement `buildPortfolioFromRows`, `syncSharesight`, `readPortfolio`**

Add to `app/lib/sharesight.server.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js'

interface PortfolioRow { total: number; day_pct: number; day_abs: number; ytd_pct: number }
interface HoldingRow {
  sym: string; name: string; val: number; pct: number
  shares: number | null; alloc: number; tone: string; note: string
}
interface AllocationRow { label: string; pct: number; color: string }

export function buildPortfolioFromRows(
  pr: PortfolioRow,
  holdings: HoldingRow[],
  allocation: AllocationRow[]
): Portfolio {
  return {
    total: pr.total,
    dayPct: pr.day_pct,
    dayAbs: pr.day_abs,
    ytdPct: pr.ytd_pct,
    spark: sparkFor('PORTFOLIO'),
    scoutNote: PORTFOLIO.scoutNote,
    holdings: holdings.map((h) => ({
      sym: h.sym, name: h.name, val: h.val, pct: h.pct,
      shares: h.shares, alloc: h.alloc, spark: sparkFor(h.sym),
      tone: h.tone as Tone, note: h.note,
    })),
    allocation: allocation.map((a) => ({ label: a.label, pct: a.pct, color: a.color as ChartColor })),
    watch: PORTFOLIO.watch,
  }
}

const STALE_MS = 30 * 60 * 1000

export async function syncSharesight(admin: SupabaseClient, userId: string): Promise<void> {
  try {
    const token = await getToken({
      now: () => new Date(),
      fetch,
      oauthGet: async () => {
        const { data } = await admin.from('sharesight_oauth').select('access_token, expires_at').eq('id', 1).maybeSingle()
        return data as OauthRow | null
      },
      oauthSet: async (row) => {
        await admin.from('sharesight_oauth').upsert({ id: 1, ...row })
      },
    })
    const p = await fetchPortfolio(token, new Date())

    await admin.from('sharesight_portfolio').upsert({
      user_id: userId, total: p.total, day_pct: p.dayPct, day_abs: p.dayAbs,
      ytd_pct: p.ytdPct, synced_at: new Date().toISOString(),
    })
    await admin.from('sharesight_holdings').delete().eq('user_id', userId)
    await admin.from('sharesight_holdings').insert(
      p.holdings.map((h, i) => ({
        user_id: userId, sym: h.sym, name: h.name, val: h.val, pct: h.pct,
        shares: h.shares, alloc: h.alloc, tone: h.tone, note: h.note, position: i,
      }))
    )
    await admin.from('sharesight_allocation').delete().eq('user_id', userId)
    await admin.from('sharesight_allocation').insert(
      p.allocation.map((a, i) => ({
        user_id: userId, label: a.label, pct: a.pct, color: a.color, position: i,
      }))
    )
    await admin.from('sync_runs').insert({ source: 'sharesight', ok: true })
  } catch (err) {
    await admin.from('sync_runs').insert({
      source: 'sharesight', ok: false, error: err instanceof Error ? err.message : String(err),
    })
    throw err
  }
}

export async function readPortfolio(
  admin: SupabaseClient,
  userId: string
): Promise<{ portfolio: Portfolio; live: boolean }> {
  try {
    let { data: pr } = await admin
      .from('sharesight_portfolio').select('*').eq('user_id', userId).maybeSingle()

    const stale = !pr || Date.now() - new Date(pr.synced_at).getTime() > STALE_MS
    if (stale) {
      await syncSharesight(admin, userId)
      const r = await admin.from('sharesight_portfolio').select('*').eq('user_id', userId).maybeSingle()
      pr = r.data
    }
    if (!pr) return { portfolio: PORTFOLIO, live: false }

    const [{ data: holdings }, { data: allocation }] = await Promise.all([
      admin.from('sharesight_holdings').select('*').eq('user_id', userId).order('position'),
      admin.from('sharesight_allocation').select('*').eq('user_id', userId).order('position'),
    ])
    return {
      portfolio: buildPortfolioFromRows(pr, (holdings ?? []) as HoldingRow[], (allocation ?? []) as AllocationRow[]),
      live: true,
    }
  } catch {
    return { portfolio: PORTFOLIO, live: false }
  }
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npm test -- sharesight`
Expected: PASS (all suites).

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/lib/sharesight.server.ts app/lib/sharesight.server.test.ts
git commit -m "feat(sharesight): syncSharesight + readPortfolio with mock fallback"
```

---

## Task 7: Swap the loaders

**Files:**
- Modify: `app/routes/_protected.investments.tsx:23-32`
- Modify: `app/routes/_protected.home.tsx:39-52`

- [ ] **Step 1: Update investments loader**

In `app/routes/_protected.investments.tsx`, replace the loader (lines 23-32) and add imports.

Add near the other imports:

```ts
import { createSupabaseAdminClient } from '~/lib/supabase.admin'
import { readPortfolio } from '~/lib/sharesight.server'
```

Replace the loader:

```ts
export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await requireSession(request)
  const admin = createSupabaseAdminClient()
  const { portfolio, live } = await readPortfolio(admin, session.user.id)
  const cashHolding = portfolio.holdings.find((h) => h.sym === 'CASH')
  return {
    portfolio,
    cash: cashHolding?.val ?? 0,
    live,
    scout: AGENTS.find((a) => a.id === 'scout')!,
  }
}
```

> The component reads `portfolio` and `live` from loader data unchanged. `PORTFOLIO` import can stay (used as the fallback inside the lib) — no component edits.

- [ ] **Step 2: Update home loader**

In `app/routes/_protected.home.tsx`, add imports:

```ts
import { createSupabaseAdminClient } from '~/lib/supabase.admin'
import { readPortfolio } from '~/lib/sharesight.server'
```

Replace the loader (lines 39-52):

```ts
export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await requireSession(request)
  const admin = createSupabaseAdminClient()
  const { portfolio } = await readPortfolio(admin, session.user.id)
  return {
    AGENTS,
    BRIEFING,
    STAGES,
    ACTIVITY,
    PORTFOLIO: portfolio,
    VENTURES,
    FOCUS_ITEMS,
    investTotal: portfolio.total,
    investDayPct: portfolio.dayPct,
  }
}
```

> The `PORTFOLIO` static import stays referenced elsewhere? Confirm: home only used `PORTFOLIO` in the loader. The static import remains harmless (it is the fallback source inside the lib). Leave the import.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/routes/_protected.investments.tsx app/routes/_protected.home.tsx
git commit -m "feat(sharesight): swap investments + home loaders to readPortfolio"
```

---

## Task 8: Manual verify + env cleanup

**Files:**
- Modify: `.env.local` (remove dead IBKR keys)

- [ ] **Step 1: Remove dead IBKR keys from `.env.local`**

Delete the three lines: `IBKR_GATEWAY_URL=`, `IBKR_ACCOUNT_ID=`, `IBKR_LIVE_IN_DEV=`.
(`.env.local` is gitignored — no commit; just clean local + host secrets.)

- [ ] **Step 2: Run the dev server**

Run: `npm run dev`
Open `/investments`. Expected: page renders. Check terminal for `sync_runs` activity / errors.

- [ ] **Step 3: Confirm Supabase rows**

Use Supabase MCP: `select * from sync_runs order by ran_at desc limit 3` and
`select * from sharesight_portfolio`. Expected: an `ok=true` run and one portfolio row.
If `ok=false`, read the `error` column and tighten the response envelope handling in `fetchPortfolio`
(the `report` wrapper / field names) against the real Sharesight V2 response.

- [ ] **Step 4: Confirm fallback resilience**

Temporarily set `SHARESIGHT_API_BASE` to an invalid URL in `.env.local`, restart dev,
load `/investments`. Expected: page still renders (mock fallback, no 500), a `sync_runs` row with
`ok=false`. Restore the correct base.

- [ ] **Step 5: Full test + typecheck gate**

Run: `npm test && npm run typecheck`
Expected: all tests PASS, typecheck PASS.

- [ ] **Step 6: Commit any field-mapping fixes from Step 3**

```bash
git add app/lib/sharesight.server.ts
git commit -m "fix(sharesight): align field mapping with live V2 response"
```

(Skip if no fixes were needed.)

---

## Self-Review notes

- **Spec coverage:** migration (Task 1), service-role client (Task 2), token cache in separate
  `sharesight_oauth` table (Task 3), normalize valuation+performance full-scope (Task 4-5),
  sync+read+fallback (Task 6), both loaders swapped (Task 7), env cleanup + verify (Task 8).
  Deferred items (cron, watch, scoutNote, sparkline history) explicitly out of scope per spec §2.5.
- **Placeholders:** none — all steps contain runnable code/commands.
- **Type consistency:** `Portfolio`, `Holding`, `Tone`, `ChartColor` from `atlas-data`; `getToken`,
  `normalizePortfolio`, `fetchPortfolio`, `buildPortfolioFromRows`, `syncSharesight`, `readPortfolio`
  names consistent across tasks. `OauthRow`/`TokenDeps` defined in Task 3 reused in Task 6.
- **Known unknown:** Sharesight V2 exact JSON field names (`value`, `holdings[].instrument.code`,
  `value_gain_percent`, `report` envelope) are best-effort from docs — Task 8 Step 3 validates against
  the real response and Step 6 commits any correction. This is the one place reality may differ.
