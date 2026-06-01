import { PORTFOLIO, type Portfolio, type Holding, type Tone, type ChartColor } from './atlas-data'

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
    scoutNote: PORTFOLIO.scoutNote,
    holdings,
    allocation,
    watch: PORTFOLIO.watch,
  }
}

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
    {
      value_gain_percent: (dayRes.report ?? dayRes).value_gain_percent ?? 0,
      value_gain: (dayRes.report ?? dayRes).value_gain ?? 0,
    }
  )
}
