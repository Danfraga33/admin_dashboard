import { describe, it, expect, vi } from 'vitest'
import { getToken } from './sharesight.server'
import { normalizePortfolio } from './sharesight.server'

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
    { instrument: { code: 'NVDA', name: 'NVIDIA' }, value: 60000, quantity: 240, allocation: 60 },
    { instrument: { code: 'VOO', name: 'S&P 500 ETF' }, value: 40000, quantity: 100, allocation: 40 },
  ],
  sub_totals: [
    { group: 'Equities', value: 100000, percentage: 100 },
  ],
}

const PERFORMANCE = {
  value_gain_percent: 22.6,
  holdings: [
    { instrument_code: 'NVDA', capital_gain_percent: 3.9 },
    { instrument_code: 'VOO', capital_gain_percent: -0.8 },
  ],
}

const DAY = { value_gain_percent: 1.84, value_gain: 1840 }

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
    expect(nvda.spark.length).toBeGreaterThan(0)
    const voo = p.holdings.find((h) => h.sym === 'VOO')!
    expect(voo.tone).toBe('down')
    expect(p.allocation).toEqual([{ label: 'Equities', pct: 100, color: 'chart-1' }])
    expect(p.watch.length).toBeGreaterThan(0)
    expect(p.scoutNote.length).toBeGreaterThan(0)
  })
})
