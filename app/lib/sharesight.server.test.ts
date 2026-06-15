import { describe, it, expect, vi } from 'vitest'
import { getToken } from './sharesight.server'
import { normalizePortfolio } from './sharesight.server'
import { buildPortfolioFromRows, persistPortfolio } from './sharesight.server'

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

const VALUATION = {
  value: 100000,
  holdings: [
    { symbol: 'GDX', name: 'Gold Miners', grouping: 'NYSE', value: 50000, quantity: 240 },
    { symbol: 'AG', name: 'First Majestic Silver', grouping: 'NYSE', value: 20000, quantity: 100 },
    { symbol: 'URA', name: 'Uranium ETF', grouping: 'NYSE', value: 20000, quantity: 100 },
  ],
  cash_accounts: [
    { name: 'MQ BANK AUD', value: 8000, currency_code: 'AUD' },
    { name: 'IBKR', value: 2000, currency_code: 'AUD' },
  ],
}

const PERFORMANCE = {
  total_gain_percent: 22.6,
  holdings: [
    { symbol: 'GDX', total_gain_percent: 3.9 },
    { symbol: 'AG', total_gain_percent: -0.8 },
    { symbol: 'URA', total_gain_percent: 5.0 },
  ],
}

const DAY = { total_gain_percent: 1.84, total_gain: 1840 }

describe('normalizePortfolio', () => {
  it('maps valuation + performance into Portfolio shape', () => {
    const p = normalizePortfolio(VALUATION, PERFORMANCE, DAY)
    expect(p.total).toBe(100000)
    expect(p.ytdPct).toBe(22.6)
    expect(p.dayPct).toBe(1.84)
    expect(p.dayAbs).toBe(1840)
    expect(p.holdings).toHaveLength(3)
    const gdx = p.holdings.find((h) => h.sym === 'GDX')!
    expect(gdx.val).toBe(50000)
    expect(gdx.pct).toBe(3.9)
    expect(gdx.alloc).toBe(50)
    expect(gdx.tone).toBe('up')
    expect(p.holdings.find((h) => h.sym === 'AG')!.tone).toBe('down')
  })

  it('sums cash_accounts into cash', () => {
    const p = normalizePortfolio(VALUATION, PERFORMANCE, DAY)
    expect(p.cash).toBe(10000)
  })

  it('builds allocation by theme plus a Cash slice', () => {
    const p = normalizePortfolio(VALUATION, PERFORMANCE, DAY)
    const byLabel = Object.fromEntries(p.allocation.map((a) => [a.label, a.pct]))
    expect(byLabel).toEqual({ Gold: 50, Silver: 20, Uranium: 20, Cash: 10 })
  })

  it('classifies unmapped symbols as Other', () => {
    const p = normalizePortfolio(
      { value: 1000, holdings: [{ symbol: 'ZZZ', name: 'Mystery', grouping: 'X', value: 1000, quantity: 1 }] },
      { total_gain_percent: 0, holdings: [] },
      DAY,
    )
    expect(p.allocation.find((a) => a.label === 'Other')!.pct).toBe(100)
  })
})

describe('buildPortfolioFromRows', () => {
  it('assembles Portfolio from cache rows', () => {
    const p = buildPortfolioFromRows(
      { total: 50000, cash: 5000, day_pct: 1.2, day_abs: 600, ytd_pct: 10 },
      [{ sym: 'GDX', name: 'Gold Miners', val: 30000, pct: 3.9, shares: 100, alloc: 60, tone: 'up', note: '' }],
      [{ label: 'Gold', pct: 60, color: 'chart-1' }]
    )
    expect(p.total).toBe(50000)
    expect(p.cash).toBe(5000)
    expect(p.holdings[0].sym).toBe('GDX')
    expect(p.holdings[0].spark.length).toBeGreaterThan(0)
    expect(p.allocation[0].label).toBe('Gold')
  })

  it('uses real value history for the portfolio spark when available', () => {
    const history = [100, 110, 120, 130]
    const p = buildPortfolioFromRows(
      { total: 130, cash: 0, day_pct: 0, day_abs: 0, ytd_pct: 0 },
      [],
      [],
      history
    )
    expect(p.spark).toEqual(history)
  })

  it('falls back to the placeholder spark with fewer than two history points', () => {
    const p = buildPortfolioFromRows(
      { total: 130, cash: 0, day_pct: 0, day_abs: 0, ytd_pct: 0 },
      [],
      [],
      [130]
    )
    expect(p.spark).not.toEqual([130])
    expect(p.spark.length).toBeGreaterThan(1)
  })
})

describe('persistPortfolio', () => {
  const sample = () =>
    buildPortfolioFromRows(
      { total: 100, cash: 10, day_pct: 1, day_abs: 1, ytd_pct: 5 },
      [
        { sym: 'GDX', name: 'Gold', val: 60, pct: 3, shares: 2, alloc: 60, tone: 'up', note: '' },
        { sym: 'AG', name: 'Silver', val: 30, pct: -1, shares: 5, alloc: 30, tone: 'down', note: '' },
      ],
      [{ label: 'Gold', pct: 60, color: 'chart-1' }]
    )

  it('persists through one atomic rpc, never touching tables directly', async () => {
    const rpc = vi.fn(async (_fnName: string, _args: any) => ({ error: null }))
    const from = vi.fn(() => {
      throw new Error('persistPortfolio must not delete/insert tables directly — use the atomic rpc')
    })
    const admin = { rpc, from } as any

    await persistPortfolio(admin, 'user-1', sample())

    expect(from).not.toHaveBeenCalled()
    expect(rpc).toHaveBeenCalledOnce()
    const [fnName, args] = rpc.mock.calls[0]
    expect(fnName).toBe('sync_sharesight_data')
    expect(args.p_user_id).toBe('user-1')
    expect(args.p_portfolio).toMatchObject({ total: 100, cash: 10, day_pct: 1, day_abs: 1, ytd_pct: 5 })
    expect(args.p_holdings).toHaveLength(2)
    expect(args.p_holdings[0]).toMatchObject({ sym: 'GDX', val: 60, tone: 'up', position: 0 })
    expect(args.p_holdings[1]).toMatchObject({ sym: 'AG', position: 1 })
    expect(args.p_allocation).toEqual([{ label: 'Gold', pct: 60, color: 'chart-1', position: 0 }])
  })

  it('throws when the rpc returns an error', async () => {
    const admin = { rpc: vi.fn(async () => ({ error: { message: 'deadlock detected' } })) } as any
    await expect(persistPortfolio(admin, 'u', sample())).rejects.toThrow(/deadlock detected/)
  })
})
