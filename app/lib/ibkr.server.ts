/**
 * IBKR Client Portal Web API — portfolio fetch + Supabase sync.
 *
 * Runs in a Node cron job (NOT in a route loader — IBKR rate limits + the 24h
 * LST handshake must not run per page-load). Writes normalized portfolio data
 * into Supabase; the investments loader reads from there.
 *
 * Endpoints used:
 *   GET /portfolio/accounts                       — resolve account, prime backend
 *   GET /portfolio/{accountId}/summary            — total value, cash
 *   GET /portfolio/{accountId}/positions/{page}   — holdings (paged)
 *   GET /iserver/marketdata/snapshot              — day % change per conid
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  getLiveSessionToken,
  signedHeaders,
  ibkrBaseUrl,
  type IbkrOAuthConfig,
  type LiveSessionToken,
} from './ibkr-oauth.server'
import { PORTFOLIO, type Holding, type Portfolio, type Tone } from './atlas-data'

// ---------- config from env ----------

export function ibkrConfigFromEnv(): IbkrOAuthConfig {
  const need = (k: string): string => {
    const v = process.env[k]
    if (!v) throw new Error(`Missing env: ${k}`)
    return v
  }
  return {
    consumerKey: need('IBKR_CONSUMER_KEY'),
    accessToken: need('IBKR_ACCESS_TOKEN'),
    accessTokenSecret: need('IBKR_ACCESS_TOKEN_SECRET'),
    // PEM keys carry newlines — store base64 in env, decode here. Falls back to raw PEM.
    encryptionKeyPem: decodePem(need('IBKR_ENCRYPTION_KEY')),
    signatureKeyPem: decodePem(need('IBKR_SIGNATURE_KEY')),
    dhPrime: need('IBKR_DH_PRIME'),
    dhGenerator: Number(process.env.IBKR_DH_GENERATOR ?? '2'),
    realm: process.env.IBKR_REALM ?? 'limited_poa',
  }
}

function decodePem(v: string): string {
  if (v.includes('BEGIN')) return v.replace(/\\n/g, '\n')
  return Buffer.from(v, 'base64').toString('utf8')
}

function serviceClient(): SupabaseClient {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

// ---------- raw API helpers ----------

async function ibkrGet<T>(
  cfg: IbkrOAuthConfig,
  lst: LiveSessionToken,
  path: string,
  query: Record<string, string> = {},
): Promise<T> {
  const url = `${ibkrBaseUrl}${path}`
  const qs = new URLSearchParams(query).toString()
  const headers = signedHeaders(cfg, lst.token, 'GET', url, query)
  const res = await fetch(qs ? `${url}?${qs}` : url, { headers })
  if (!res.ok) throw new Error(`IBKR GET ${path} failed: ${res.status} ${await res.text()}`)
  return (await res.json()) as T
}

// ---------- IBKR response shapes (partial) ----------

interface IbkrAccount {
  accountId: string
}
interface IbkrPosition {
  conid: number
  contractDesc?: string
  name?: string
  ticker?: string
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
  // field 83 = % change for the day (string like "+1.23%")
  '83'?: string
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

export async function fetchPortfolio(cfg: IbkrOAuthConfig): Promise<PortfolioSnapshot> {
  const lst = await getLiveSessionToken(cfg)

  // 1. Resolve the account. /portfolio/accounts must be called first to prime the backend.
  const accounts = await ibkrGet<IbkrAccount[]>(cfg, lst, '/portfolio/accounts')
  const accountId = process.env.IBKR_ACCOUNT_ID ?? accounts[0]?.accountId
  if (!accountId) throw new Error('No IBKR account id resolved')

  // 2. Summary (total value + cash).
  const summary = await ibkrGet<IbkrSummary>(cfg, lst, `/portfolio/${accountId}/summary`)
  const total = summary.netliquidation?.amount ?? 0
  const cash = summary.totalcashvalue?.amount ?? 0

  // 3. Positions (paged — page until a short page comes back).
  const positions: IbkrPosition[] = []
  for (let page = 0; page < 20; page++) {
    const batch = await ibkrGet<IbkrPosition[]>(
      cfg,
      lst,
      `/portfolio/${accountId}/positions/${page}`,
    )
    if (!batch.length) break
    positions.push(...batch)
    if (batch.length < 30) break // IBKR pages at 30
  }

  // 4. Day % change per conid via market-data snapshot (field 83).
  const conids = positions.map((p) => p.conid).join(',')
  const dayPctByConid: Record<number, number> = {}
  if (conids) {
    const snap = await ibkrGet<IbkrSnapshot[]>(cfg, lst, '/iserver/marketdata/snapshot', {
      conids,
      fields: '83',
    })
    for (const s of snap) {
      const raw = s['83']?.replace(/[+%]/g, '') ?? '0'
      dayPctByConid[s.conid] = Number(raw) || 0
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
    const cfg = ibkrConfigFromEnv()
    const snap = await fetchPortfolio(cfg)

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
