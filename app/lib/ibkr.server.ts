/**
 * IBKR Client Portal Web API — portfolio fetch + Supabase sync.
 *
 * Auth model: INDIVIDUAL self-access via the Client Portal Gateway.
 * The gateway (Java, run locally or on an always-on box — see IBeam for headless)
 * holds the authenticated session after a browser login. We just make plain HTTPS
 * GETs to it; no request signing. The gateway's TLS cert is self-signed, so we
 * disable cert verification for that host only.
 *
 * (OAuth 1.0a signing — ibkr-oauth.server.ts — is for third-party VENDORS, not
 * individual self-access. Kept for reference, unused on this path.)
 *
 * Runs in a Node cron job next to the gateway, NOT in a route loader. Writes
 * normalized portfolio data into Supabase; the investments loader reads from there.
 *
 * Endpoints used (all under {gateway}/v1/api):
 *   GET /iserver/auth/status                       — verify the session is live
 *   GET /portfolio/accounts                        — resolve account, prime backend
 *   GET /portfolio/{accountId}/summary             — total value, cash
 *   GET /portfolio/{accountId}/positions/{page}    — holdings (paged)
 *   GET /iserver/marketdata/snapshot               — day % change per conid
 */
import { Agent, request as httpsRequest } from 'node:https'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { PORTFOLIO, type Holding, type Portfolio, type Tone } from './atlas-data'

// ---------- config from env ----------

/** Gateway base, e.g. https://localhost:5000. The /v1/api suffix is added per call. */
function gatewayBase(): string {
  return (process.env.IBKR_GATEWAY_URL ?? 'https://localhost:5000').replace(/\/$/, '')
}

/**
 * Agent that accepts the gateway's self-signed cert. Scoped to gateway calls ONLY
 * (via node:https request below) — global fetch / Supabase keep full TLS verification.
 * The local Client Portal Gateway always serves a self-signed cert.
 */
const gatewayAgent = new Agent({ rejectUnauthorized: false })

function serviceClient(): SupabaseClient {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

// ---------- raw API helpers ----------

/**
 * GET against the gateway using node:https directly, so the self-signed-cert
 * bypass stays strictly on gateway calls. (Node's global fetch is undici and
 * ignores a node:https Agent, so we don't use fetch here.)
 */
function ibkrGet<T>(path: string, query: Record<string, string> = {}): Promise<T> {
  const qs = new URLSearchParams(query).toString()
  const url = `${gatewayBase()}/v1/api${path}${qs ? `?${qs}` : ''}`
  return new Promise<T>((resolve, reject) => {
    const req = httpsRequest(
      url,
      {
        method: 'GET',
        agent: gatewayAgent,
        // The gateway returns 403 for requests with no User-Agent — always send one.
        headers: { Accept: 'application/json', 'User-Agent': 'atlas-dashboard/1.0' },
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c) => chunks.push(c as Buffer))
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8')
          const status = res.statusCode ?? 0
          if (status < 200 || status >= 300) {
            reject(new Error(`IBKR GET ${path} failed: ${status} ${body}`))
            return
          }
          try {
            resolve(JSON.parse(body) as T)
          } catch {
            reject(new Error(`IBKR GET ${path}: invalid JSON — ${body.slice(0, 200)}`))
          }
        })
      },
    )
    req.on('error', reject)
    req.end()
  })
}

interface AuthStatus {
  authenticated: boolean
  connected: boolean
}

/** Confirm the gateway session is alive before fetching. Throws a clear error if not. */
async function assertAuthenticated(): Promise<void> {
  let status: AuthStatus
  try {
    status = await ibkrGet<AuthStatus>('/iserver/auth/status')
  } catch (e) {
    throw new Error(
      `IBKR gateway unreachable at ${gatewayBase()} — is the gateway running? (${
        e instanceof Error ? e.message : e
      })`,
    )
  }
  if (!status.authenticated) {
    throw new Error(
      'IBKR gateway is running but the session is not authenticated — log in at the gateway URL (browser) or via IBeam.',
    )
  }
}

interface Tickle {
  session: string
  iserver?: { authStatus?: { authenticated: boolean } }
}

/**
 * Ping the gateway to keep the session from idling out (~5 min idle = dropped).
 * Returns whether the session is still authenticated. Used by the keep-alive loop.
 */
export async function tickle(): Promise<{ authenticated: boolean }> {
  const t = await ibkrGet<Tickle>('/tickle')
  return { authenticated: t.iserver?.authStatus?.authenticated ?? false }
}

// ---------- IBKR response shapes (partial) ----------

interface IbkrAccount {
  accountId: string
}
interface IbkrPosition {
  conid: number
  contractDesc?: string // e.g. "AG" — the symbol IBKR returns on positions
  ticker?: string // not present on this endpoint; kept for safety
  name?: string // not present on this endpoint; resolved later via secdef if needed
  position: number
  mktValue: number
  assetClass?: string
}
interface IbkrSummary {
  // The summary endpoint returns nested {amount,currency} blocks.
  netliquidation?: { amount: number }
  totalcashvalue?: { amount: number }
}
interface IbkrSnapshot {
  conid: number
  // field 83 = % change for the day. Number (1.94) or string ("+1.94%") per instrument.
  '83'?: number | string
}

const ASSET_CLASS_LABEL: Record<string, string> = {
  STK: 'Equities',
  ETF: 'Equities',
  FUND: 'Equities',
  CRYPTO: 'Crypto',
  CASH: 'Cash',
  BOND: 'Bonds',
}

function tone(pct: number): Tone {
  if (pct > 0.05) return 'up'
  if (pct < -0.05) return 'down'
  return 'flat'
}

// ---------- fetch + normalize ----------

/** A normalized holding plus the IBKR conid + asset class needed for the upsert. */
export interface SyncHolding extends Holding {
  conid: string
  assetClass: string
}

export interface PortfolioSnapshot {
  total: number
  cash: number
  dayAbs: number
  dayPct: number
  holdings: SyncHolding[]
}

export async function fetchPortfolio(): Promise<PortfolioSnapshot> {
  await assertAuthenticated()

  // 1. Resolve the account. /portfolio/accounts must be called first to prime the backend.
  const accounts = await ibkrGet<IbkrAccount[]>('/portfolio/accounts')
  const accountId = process.env.IBKR_ACCOUNT_ID ?? accounts[0]?.accountId
  if (!accountId) throw new Error('No IBKR account id resolved')

  // 2. Summary (total value + cash).
  const summary = await ibkrGet<IbkrSummary>(`/portfolio/${accountId}/summary`)
  const total = summary.netliquidation?.amount ?? 0
  const cash = summary.totalcashvalue?.amount ?? 0

  // 3. Positions (paged — page until a short page comes back).
  const positions: IbkrPosition[] = []
  for (let page = 0; page < 20; page++) {
    const batch = await ibkrGet<IbkrPosition[]>(`/portfolio/${accountId}/positions/${page}`)
    if (!batch.length) break
    positions.push(...batch)
    if (batch.length < 30) break // IBKR pages at 30
  }

  // 4. Day % change per conid via market-data snapshot (field 83).
  // IBKR warms the subscription lazily: the first call returns bare {conid},
  // the second returns the fields. So we prime once, wait briefly, then read.
  const conids = positions.map((p) => p.conid).join(',')
  const dayPctByConid: Record<number, number> = {}
  if (conids) {
    await ibkrGet<IbkrSnapshot[]>('/iserver/marketdata/snapshot', { conids, fields: '83' })
    await new Promise((r) => setTimeout(r, 1500))
    const snap = await ibkrGet<IbkrSnapshot[]>('/iserver/marketdata/snapshot', {
      conids,
      fields: '83',
    })
    for (const s of snap) {
      // Field 83 comes back as a number (1.94) or a string ("+1.94%") depending on instrument.
      const v = s['83']
      const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/[+%]/g, ''))
      dayPctByConid[s.conid] = Number.isFinite(n) ? n : 0
    }
  }

  const holdings: SyncHolding[] = positions
    .filter((p) => p.position !== 0)
    .map((p) => {
      const pct = dayPctByConid[p.conid] ?? 0
      const alloc = total > 0 ? (p.mktValue / total) * 100 : 0
      return {
        conid: String(p.conid),
        assetClass: ASSET_CLASS_LABEL[p.assetClass ?? 'STK'] ?? 'Equities',
        sym: p.ticker ?? p.contractDesc ?? String(p.conid),
        name: p.name ?? p.contractDesc ?? '',
        val: Math.round(p.mktValue),
        pct: Math.round(pct * 100) / 100,
        shares: p.position,
        alloc: Math.round(alloc * 10) / 10,
        spark: [], // filled from value history downstream; per-holding history is a later phase
        tone: tone(pct),
        note: '',
      }
    })
    .sort((a, b) => b.val - a.val)

  // Day absolute = sum(val * pct/100); day pct = dayAbs / (total - dayAbs).
  const dayAbs = Math.round(
    holdings.reduce((s, h) => s + h.val * (h.pct / 100), 0),
  )
  const prevTotal = total - dayAbs
  const dayPct = prevTotal > 0 ? Math.round((dayAbs / prevTotal) * 10000) / 100 : 0

  return { total: Math.round(total), cash: Math.round(cash), dayAbs, dayPct, holdings }
}

// ---------- sync to Supabase ----------

/**
 * Fetch from IBKR and write the snapshot for one user into Supabase.
 * Logs the run into sync_runs either way.
 */
export async function syncIbkr(userId: string): Promise<{ ok: boolean; error?: string }> {
  const sb = serviceClient()
  try {
    const snap = await fetchPortfolio()

    // ytd_pct + scout_note are not derivable from these endpoints — preserve existing if present.
    const { data: prev } = await sb
      .from('ibkr_portfolio')
      .select('ytd_pct, scout_note')
      .eq('user_id', userId)
      .maybeSingle()

    await sb.from('ibkr_portfolio').upsert({
      user_id: userId,
      total: snap.total,
      day_pct: snap.dayPct,
      day_abs: snap.dayAbs,
      ytd_pct: prev?.ytd_pct ?? 0,
      cash: snap.cash,
      scout_note: prev?.scout_note ?? '',
      synced_at: new Date().toISOString(),
    })

    // Upsert holdings in one batch; delete positions no longer held.
    const now = new Date().toISOString()
    const rows = snap.holdings.map((h) => ({
      user_id: userId,
      conid: h.conid,
      sym: h.sym,
      name: h.name,
      val: h.val,
      pct: h.pct,
      shares: h.shares,
      alloc: h.alloc,
      asset_class: h.assetClass,
      tone: h.tone,
      note: h.note,
      synced_at: now,
    }))
    if (rows.length) {
      await sb.from('ibkr_holdings').upsert(rows, { onConflict: 'user_id,conid' })
    }
    const held = new Set(snap.holdings.map((h) => h.conid))
    const { data: existing } = await sb
      .from('ibkr_holdings')
      .select('conid')
      .eq('user_id', userId)
    const stale = (existing ?? []).map((r) => r.conid).filter((c) => !held.has(c))
    if (stale.length) {
      await sb.from('ibkr_holdings').delete().eq('user_id', userId).in('conid', stale)
    }

    // Append value-history point for the sparkline.
    await sb.from('ibkr_value_history').insert({ user_id: userId, total: snap.total })

    await sb.from('sync_runs').insert({ user_id: userId, source: 'ibkr', ok: true })
    return { ok: true }
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    await sb.from('sync_runs').insert({ user_id: userId, source: 'ibkr', ok: false, error })
    return { ok: false, error }
  }
}

// ---------- read for the loader ----------

interface PortfolioRow {
  total: number
  day_pct: number
  day_abs: number
  ytd_pct: number
  cash: number
  scout_note: string
}
interface HoldingRow {
  sym: string
  name: string
  val: number
  pct: number
  shares: number | null
  alloc: number
  asset_class: string
  tone: Tone
  note: string
}

/**
 * Assemble the `Portfolio` shape the investments view consumes, from Supabase.
 * Pass a request-scoped Supabase client (RLS enforces the user). Returns the
 * static mock until the first sync has written real rows, so the UI never breaks.
 */
export async function readPortfolio(
  sb: SupabaseClient,
  userId: string,
): Promise<{ portfolio: Portfolio; cash: number; live: boolean; syncedAt: string | null }> {
  const [{ data: row }, { data: holdingRows }, { data: history }] = await Promise.all([
    sb.from('ibkr_portfolio').select('*').eq('user_id', userId).maybeSingle(),
    sb.from('ibkr_holdings').select('*').eq('user_id', userId).order('val', { ascending: false }),
    sb
      .from('ibkr_value_history')
      .select('total, captured_at')
      .eq('user_id', userId)
      .order('captured_at', { ascending: true })
      .limit(40),
  ])

  if (!row) return { portfolio: PORTFOLIO, cash: 206300, live: false, syncedAt: null }

  const p = row as PortfolioRow & { synced_at: string }
  const holdings = (holdingRows ?? []) as HoldingRow[]

  // Allocation: group holdings by asset class into the donut slices.
  const COLORS = ['chart-1', 'chart-2', 'chart-4', 'chart-5', 'chart-3']
  const byClass = new Map<string, number>()
  for (const h of holdings) byClass.set(h.asset_class, (byClass.get(h.asset_class) ?? 0) + h.val)
  const allocation = [...byClass.entries()].map(([label, val], i) => ({
    label,
    pct: p.total > 0 ? Math.round((val / p.total) * 100) : 0,
    color: (COLORS[i % COLORS.length] as Portfolio['allocation'][number]['color']),
  }))

  const spark = (history ?? []).map((h) => h.total)

  const portfolio: Portfolio = {
    total: p.total,
    dayPct: p.day_pct,
    dayAbs: p.day_abs,
    ytdPct: p.ytd_pct,
    spark: spark.length > 1 ? spark : PORTFOLIO.spark,
    scoutNote: p.scout_note || PORTFOLIO.scoutNote,
    holdings: holdings.map((h) => ({
      sym: h.sym,
      name: h.name,
      val: h.val,
      pct: h.pct,
      shares: h.shares,
      alloc: h.alloc,
      spark: PORTFOLIO.holdings[0]?.spark ?? [], // per-holding history: later phase
      tone: h.tone,
      note: h.note,
    })),
    allocation: allocation.length ? allocation : PORTFOLIO.allocation,
    watch: PORTFOLIO.watch, // user-curated, not from IBKR — kept as mock for now
  }
  return { portfolio, cash: p.cash, live: true, syncedAt: p.synced_at }
}

/** Build the `Portfolio` shape directly from a freshly-fetched live snapshot (dev path). */
function snapshotToPortfolio(snap: PortfolioSnapshot): Portfolio {
  const COLORS = ['chart-1', 'chart-2', 'chart-4', 'chart-5', 'chart-3']
  const byClass = new Map<string, number>()
  for (const h of snap.holdings) byClass.set(h.assetClass, (byClass.get(h.assetClass) ?? 0) + h.val)
  const allocation = [...byClass.entries()].map(([label, val], i) => ({
    label,
    pct: snap.total > 0 ? Math.round((val / snap.total) * 100) : 0,
    color: COLORS[i % COLORS.length] as Portfolio['allocation'][number]['color'],
  }))
  return {
    total: snap.total,
    dayPct: snap.dayPct,
    dayAbs: snap.dayAbs,
    ytdPct: 0,
    spark: PORTFOLIO.spark,
    scoutNote: PORTFOLIO.scoutNote,
    holdings: snap.holdings.map((h) => ({
      sym: h.sym,
      name: h.name,
      val: h.val,
      pct: h.pct,
      shares: h.shares,
      alloc: h.alloc,
      spark: PORTFOLIO.holdings[0]?.spark ?? [],
      tone: h.tone,
      note: h.note,
    })),
    allocation: allocation.length ? allocation : PORTFOLIO.allocation,
    watch: PORTFOLIO.watch,
  }
}

/**
 * Loader entry. In dev with the gateway running (IBKR_LIVE_IN_DEV=1), fetch live
 * straight from the gateway for instant data. Otherwise — and always in prod —
 * read the Supabase cache the sync job populates. Live fetch failures fall back
 * to cache, never breaking the page.
 */
export async function readPortfolioForLoader(
  sb: SupabaseClient,
  userId: string,
): Promise<{ portfolio: Portfolio; cash: number; live: boolean; syncedAt: string | null }> {
  if (process.env.IBKR_LIVE_IN_DEV === '1') {
    try {
      const snap = await fetchPortfolio()
      return { portfolio: snapshotToPortfolio(snap), cash: snap.cash, live: true, syncedAt: 'live' }
    } catch {
      // gateway down / not authenticated — fall through to cache
    }
  }
  return readPortfolio(sb, userId)
}
