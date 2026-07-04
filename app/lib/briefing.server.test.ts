import { describe, it, expect, vi } from 'vitest'
import {
  buildBriefing,
  getBriefing,
  type BriefingCore,
  type BriefingStore,
  type BriefingDeps,
} from './briefing.server'
import type { Portfolio } from './atlas-data'

function makePortfolio(over: Partial<Portfolio> = {}): Portfolio {
  return {
    total: 1000,
    cash: 200,
    dayPct: 0.92,
    dayAbs: 9,
    ytdPct: -12.82,
    spark: [],
    scoutNote: '',
    holdings: [
      { sym: 'ETPMAG', name: 'Silver', val: 193, pct: -24.88, shares: 1, alloc: 19.3, spark: [], tone: 'down', note: '' },
      { sym: 'CASH', name: 'Cash', val: 200, pct: 0, shares: null, alloc: 20, spark: [], tone: 'flat', note: '' },
    ],
    allocation: [],
    watch: [],
    ...over,
  }
}

describe('buildBriefing', () => {
  it('cites the largest non-cash position, day direction, ytd, cash %, and lead build', () => {
    const core = buildBriefing(makePortfolio(), new Date('2026-06-29T00:00:00Z'))
    expect(core.summary).toContain('Portfolio up 0.92% today')
    expect(core.summary).toContain('ytd -12.82%')
    expect(core.summary).toContain('ETPMAG leads at 19.3%')
    expect(core.summary).toContain('cash 20% dry powder')
    // Lead build comes from the hardcoded PROJECTS const (Pavement at 88%).
    expect(core.summary).toContain("Pavement tops 4 builds at 88%")
    expect(core.summary).toContain("ship Pavement's last 12%")
    // Fraga Ventures line dropped.
    expect(core.summary).not.toContain('Fraga Ventures')
  })

  it('marks a down day and signs the top mover negative', () => {
    const core = buildBriefing(makePortfolio({ dayPct: -3 }), new Date('2026-06-29T00:00:00Z'))
    expect(core.summary).toContain('Portfolio down 3% today')
    const mover = core.signals.find((s) => s.text.includes('ETPMAG'))
    expect(mover?.tone).toBe('down')
    expect(mover?.text).toContain('-24.88%')
  })

  it('handles a book with no non-cash holdings', () => {
    const p = makePortfolio({ cash: 1000, holdings: [{ sym: 'CASH', name: 'Cash', val: 1000, pct: 0, shares: null, alloc: 100, spark: [], tone: 'flat', note: '' }] })
    const core = buildBriefing(p, new Date('2026-06-29T00:00:00Z'))
    expect(core.summary).toContain('cash 100% dry powder')
    expect(core.summary).not.toContain('leads at')
  })
})

describe('getBriefing 24h gate', () => {
  const core: BriefingCore = { summary: 'cached', signals: [] }

  function store(row: { core: BriefingCore; generatedAt: string } | null) {
    const write = vi.fn(async () => {})
    return {
      store: { read: async () => row, write } as BriefingStore,
      write,
    }
  }

  it('serves cache unchanged when under 24h old (no rebuild)', async () => {
    const now = new Date('2026-06-29T12:00:00Z')
    const deps: BriefingDeps = { now: () => now }
    const { store: s, write } = store({ core, generatedAt: '2026-06-29T00:30:00Z' }) // 11.5h old
    const rebuild = vi.fn(async () => ({ summary: 'fresh', signals: [] }))

    const b = await getBriefing(deps, s, rebuild)
    expect(b.summary).toBe('cached')
    expect(rebuild).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
  })

  it('rebuilds and persists when over 24h old', async () => {
    const now = new Date('2026-06-30T13:00:00Z')
    const deps: BriefingDeps = { now: () => now }
    const { store: s, write } = store({ core, generatedAt: '2026-06-29T12:00:00Z' }) // 25h old
    const rebuild = vi.fn(async () => ({ summary: 'fresh', signals: [] }))

    const b = await getBriefing(deps, s, rebuild)
    expect(b.summary).toBe('fresh')
    expect(rebuild).toHaveBeenCalledOnce()
    expect(write).toHaveBeenCalledOnce()
  })

  it('rebuilds when no cache exists', async () => {
    const now = new Date('2026-06-29T12:00:00Z')
    const deps: BriefingDeps = { now: () => now }
    const { store: s, write } = store(null)
    const rebuild = vi.fn(async () => ({ summary: 'fresh', signals: [] }))

    const b = await getBriefing(deps, s, rebuild)
    expect(b.summary).toBe('fresh')
    expect(rebuild).toHaveBeenCalledOnce()
    expect(write).toHaveBeenCalledOnce()
  })
})
