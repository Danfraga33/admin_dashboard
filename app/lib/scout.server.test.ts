import { describe, it, expect, vi } from 'vitest'
import {
  computeScoutFacts,
  buildScoutPrompt,
  fallbackNote,
  getScoutNote,
  type ScoutFacts,
  type ScoutStore,
  type ScoutDeps,
} from './scout.server'
import type { Portfolio } from './atlas-data'

const PORTFOLIO: Portfolio = {
  total: 1000,
  cash: 100,
  dayPct: 1,
  dayAbs: 10,
  ytdPct: 20,
  spark: [],
  scoutNote: '',
  holdings: [
    { sym: 'GDX', name: 'Gold Miners', val: 600, pct: 5, shares: 1, alloc: 60, spark: [], tone: 'up', note: '' },
    { sym: 'AG', name: 'Silver', val: 300, pct: -2, shares: 1, alloc: 30, spark: [], tone: 'down', note: '' },
  ],
  allocation: [
    { label: 'Gold', pct: 60, color: 'chart-1' },
    { label: 'Cash', pct: 10, color: 'chart-2' },
  ],
  watch: [],
}

const SERIES = [
  { date: '2026-06-01', total: 900, cash: 90 },
  { date: '2026-06-08', total: 950, cash: 95 },
  { date: '2026-06-15', total: 1000, cash: 100 },
]

describe('computeScoutFacts', () => {
  it('derives weekly move, movers, top theme, and cash %', () => {
    const f = computeScoutFacts(PORTFOLIO, SERIES)
    expect(f.total).toBe(1000)
    expect(f.ytdPct).toBe(20)
    expect(f.weeklyAbs).toBe(50) // 1000 vs the 06-08 baseline (950)
    expect(f.weeklyPct).toBeCloseTo(5.26, 1)
    expect(f.topMover).toEqual({ sym: 'GDX', pct: 5 })
    expect(f.bottomMover).toEqual({ sym: 'AG', pct: -2 })
    expect(f.topTheme).toEqual({ label: 'Gold', pct: 60 }) // skips the Cash slice
    expect(f.cashPct).toBe(10)
  })

  it('zeroes the weekly move with fewer than two points', () => {
    const f = computeScoutFacts(PORTFOLIO, [{ date: '2026-06-15', total: 1000, cash: 100 }])
    expect(f.weeklyAbs).toBe(0)
    expect(f.weeklyPct).toBe(0)
  })
})

const FACTS: ScoutFacts = {
  total: 1_780_000,
  weeklyAbs: 36_400,
  weeklyPct: 2.1,
  ytdPct: 22.6,
  topMover: { sym: 'GDX', pct: 3.9 },
  bottomMover: { sym: 'AG', pct: -0.8 },
  topTheme: { label: 'Gold', pct: 42 },
  cashPct: 12,
}

describe('buildScoutPrompt', () => {
  it('includes the weekly move, YTD, and top mover', () => {
    const prompt = buildScoutPrompt(FACTS)
    expect(prompt).toContain('+2.1%')
    expect(prompt).toContain('+22.6%')
    expect(prompt).toContain('GDX')
    expect(prompt).toMatch(/no financial advice/i)
  })
})

describe('fallbackNote', () => {
  it('is a plain factual line with total and YTD', () => {
    const note = fallbackNote(FACTS)
    expect(note).toContain('$1.78M')
    expect(note).toContain('+22.6%')
  })
})

function geminiResponse(text: string) {
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status: 200 })
}

function makeStore(row: { note: string; generatedAt: string } | null) {
  return {
    read: vi.fn(async () => row),
    write: vi.fn(async () => {}),
  } satisfies ScoutStore
}

describe('getScoutNote', () => {
  const now = Date.parse('2026-06-15T00:00:00Z')
  const deps = (apiKey: string | undefined, fetchImpl: typeof fetch): ScoutDeps => ({
    now: () => new Date(now),
    fetch: fetchImpl,
    apiKey,
  })

  it('returns the cached note when fresh, without calling Gemini', async () => {
    const store = makeStore({ note: 'fresh note', generatedAt: new Date(now - 24 * 60 * 60 * 1000).toISOString() })
    const fetchSpy = vi.fn(async () => geminiResponse('new')) as unknown as typeof fetch
    const note = await getScoutNote(deps('key', fetchSpy), store, FACTS)
    expect(note).toBe('fresh note')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('generates and persists when there is no cached note', async () => {
    const store = makeStore(null)
    const fetchSpy = vi.fn(async () => geminiResponse('generated weekly read')) as unknown as typeof fetch
    const note = await getScoutNote(deps('key', fetchSpy), store, FACTS)
    expect(note).toBe('generated weekly read')
    expect(store.write).toHaveBeenCalledOnce()
  })

  it('serves a stale note immediately', async () => {
    const store = makeStore({ note: 'stale note', generatedAt: new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString() })
    const fetchSpy = vi.fn(async () => geminiResponse('refreshed')) as unknown as typeof fetch
    const note = await getScoutNote(deps('key', fetchSpy), store, FACTS)
    expect(note).toBe('stale note')
  })

  it('falls back to a computed line with no API key and no cache', async () => {
    const store = makeStore(null)
    const fetchSpy = vi.fn(async () => geminiResponse('x')) as unknown as typeof fetch
    const note = await getScoutNote(deps(undefined, fetchSpy), store, FACTS)
    expect(note).toBe(fallbackNote(FACTS))
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
