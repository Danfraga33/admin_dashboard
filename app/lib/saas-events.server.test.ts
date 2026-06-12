import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  extractJsonArray,
  validateEvents,
  getSaasEvents,
  refreshSaasEvents,
  __resetCache,
  type EventsDeps,
  type EventsStore,
  type SaasEvent,
} from './saas-events.server'

const NOW = new Date('2026-06-03T00:00:00Z')

function geminiResponse(text: string) {
  return new Response(
    JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }),
    { status: 200 },
  )
}

beforeEach(() => __resetCache())

describe('extractJsonArray', () => {
  it('parses a bare array', () => {
    expect(extractJsonArray('[{"a":1}]')).toEqual([{ a: 1 }])
  })
  it('parses a fenced array', () => {
    expect(extractJsonArray('```json\n[{"a":1}]\n```')).toEqual([{ a: 1 }])
  })
  it('parses an array embedded in prose', () => {
    expect(extractJsonArray('Here you go: [{"a":1}] done')).toEqual([{ a: 1 }])
  })
  it('returns [] on garbage', () => {
    expect(extractJsonArray('not json at all')).toEqual([])
    expect(extractJsonArray('[broken')).toEqual([])
  })
})

describe('validateEvents', () => {
  const good = {
    name: 'SaaStr Annual',
    date: '2026-09-10',
    location: 'San Francisco, USA',
    region: 'USA',
    domain: 'SaaS',
    format: 'in-person',
    url: 'https://saastrannual.com',
    category: 'Growth',
    desc: 'Big SaaS conf',
  }

  it('keeps a valid event and assigns an id', () => {
    const out = validateEvents([good], NOW)
    expect(out).toHaveLength(1)
    expect(out[0].id).toBeTruthy()
    expect(out[0].name).toBe('SaaStr Annual')
  })
  it('drops events with no url', () => {
    expect(validateEvents([{ ...good, url: '' }], NOW)).toHaveLength(0)
  })
  it('drops events with non-http url', () => {
    expect(validateEvents([{ ...good, url: 'ftp://x' }], NOW)).toHaveLength(0)
  })
  it('drops events with a bad date', () => {
    expect(validateEvents([{ ...good, date: 'Sept 2026' }], NOW)).toHaveLength(0)
  })
  it('drops events outside the 12-month window', () => {
    expect(validateEvents([{ ...good, date: '2025-01-01' }], NOW)).toHaveLength(0)
    expect(validateEvents([{ ...good, date: '2027-12-01' }], NOW)).toHaveLength(0)
  })
  it('dedups by url+date', () => {
    expect(validateEvents([good, { ...good }], NOW)).toHaveLength(1)
  })
  it('defaults category to General when missing', () => {
    const out = validateEvents([{ ...good, category: '' }], NOW)
    expect(out[0].category).toBe('General')
  })
  it('keeps explicit domain', () => {
    expect(validateEvents([{ ...good, domain: 'SaaS' }], NOW)[0].domain).toBe('SaaS')
  })
  it('classifies Ecommerce domain', () => {
    expect(validateEvents([{ ...good, domain: 'Ecommerce' }], NOW)[0].domain).toBe('Ecommerce')
  })
  it('classifies AI Coding domain', () => {
    expect(validateEvents([{ ...good, domain: 'AI Coding' }], NOW)[0].domain).toBe('AI Coding')
  })
  it('defaults unknown domain to SaaS', () => {
    expect(validateEvents([{ ...good, domain: 'whatever' }], NOW)[0].domain).toBe('SaaS')
  })
  it('sorts by date ascending', () => {
    const a = { ...good, url: 'https://a.com', date: '2026-10-01' }
    const b = { ...good, url: 'https://b.com', date: '2026-07-01' }
    expect(validateEvents([a, b], NOW).map((e) => e.date)).toEqual(['2026-07-01', '2026-10-01'])
  })

  it('keeps an explicit valid region', () => {
    expect(validateEvents([{ ...good, region: 'Australia', location: 'Sydney' }], NOW)[0].region).toBe('Australia')
  })
  it('classifies Canada from location when region missing', () => {
    expect(validateEvents([{ ...good, region: '', location: 'Toronto, Canada' }], NOW)[0].region).toBe('Canada')
  })
  it('classifies Europe from a European city', () => {
    expect(validateEvents([{ ...good, region: '', location: 'Berlin, Germany' }], NOW)[0].region).toBe('Europe')
  })
  it('classifies USA from location', () => {
    expect(validateEvents([{ ...good, region: '', location: 'Austin, USA' }], NOW)[0].region).toBe('USA')
  })
  it('classifies Online for virtual events', () => {
    expect(validateEvents([{ ...good, region: 'Online', location: 'Online', format: 'virtual' }], NOW)[0].region).toBe('Online')
  })
  it('falls back to Other for unknown location', () => {
    expect(validateEvents([{ ...good, region: '', location: 'Tokyo, Japan' }], NOW)[0].region).toBe('Other')
  })
})

function fakeEvent(over: Partial<SaasEvent> = {}): SaasEvent {
  return {
    id: 'x1',
    name: 'Cached Conf',
    date: '2026-08-01',
    location: 'City',
    region: 'USA',
    domain: 'SaaS',
    format: 'in-person',
    url: 'https://cached.com',
    category: 'Growth',
    desc: 'd',
    ...over,
  }
}

function memStore(initial: { events: SaasEvent[]; fetchedAt: string } | null = null) {
  let row = initial
  const store: EventsStore = {
    read: vi.fn(async () => row),
    write: vi.fn(async (events: SaasEvent[], fetchedAt: string) => {
      row = { events, fetchedAt }
    }),
  }
  return { store, current: () => row }
}

const FRESH_AT = new Date(NOW.getTime() - 60 * 60 * 1000).toISOString() // 1h old
const STALE_AT = new Date(NOW.getTime() - 100 * 60 * 60 * 1000).toISOString() // 100h old

describe('getSaasEvents', () => {
  function deps(over: Partial<EventsDeps> = {}): EventsDeps {
    return { now: () => NOW, fetch: vi.fn(), apiKey: 'k', ...over }
  }

  it('returns stale empty result with no api key and empty store', async () => {
    const d = deps({ apiKey: undefined })
    const r = await getSaasEvents(d, memStore().store)
    expect(r.stale).toBe(true)
    expect(r.events).toEqual([])
    expect(d.fetch).not.toHaveBeenCalled()
  })

  it('serves an expired row as stale when no api key', async () => {
    const d = deps({ apiKey: undefined })
    const { store } = memStore({ events: [fakeEvent()], fetchedAt: STALE_AT })
    const r = await getSaasEvents(d, store)
    expect(r.stale).toBe(true)
    expect(r.events).toHaveLength(1)
    expect(d.fetch).not.toHaveBeenCalled()
  })

  it('serves a fresh row without calling gemini', async () => {
    const d = deps()
    const { store } = memStore({ events: [fakeEvent()], fetchedAt: FRESH_AT })
    const r = await getSaasEvents(d, store)
    expect(r.stale).toBe(false)
    expect(r.events).toHaveLength(1)
    expect(d.fetch).not.toHaveBeenCalled()
  })

  it('fetches every region, merges + dedups, and persists on cold store', async () => {
    let n = 0
    const fetch = vi.fn(async () => {
      n++
      // each region returns one distinct event; one region repeats a shared URL to prove dedup
      return geminiResponse(
        `[{"name":"E${n}","date":"2026-08-0${n}","url":"https://e${n}.com","format":"in-person","location":"City","category":"Product","desc":"d"},{"name":"Shared","date":"2026-09-01","url":"https://shared.com","format":"in-person","location":"City","category":"Growth","desc":"d"}]`,
      )
    })
    const d = deps({ fetch: fetch as unknown as typeof globalThis.fetch })
    const { store, current } = memStore()
    const r1 = await getSaasEvents(d, store)
    expect(r1.stale).toBe(false)
    expect(fetch).toHaveBeenCalledTimes(4) // one per region
    // 4 distinct + 1 shared (deduped across regions) = 5
    expect(r1.events).toHaveLength(5)
    expect(current()?.events).toHaveLength(5)
    // second call hits the now-fresh row, no extra fetch
    await getSaasEvents(d, store)
    expect(fetch).toHaveBeenCalledTimes(4)
  })

  it('still succeeds when some regions fail (partial results)', async () => {
    let n = 0
    const fetch = vi.fn(async () => {
      n++
      if (n <= 2) return new Response('err', { status: 500 })
      return geminiResponse(`[{"name":"E${n}","date":"2026-08-0${n}","url":"https://e${n}.com","format":"in-person","location":"City","category":"Product","desc":"d"}]`)
    })
    const r = await getSaasEvents(deps({ fetch: fetch as unknown as typeof globalThis.fetch }), memStore().store)
    expect(r.stale).toBe(false)
    expect(r.events).toHaveLength(2) // 2 of 4 regions returned
  })

  it('returns stale empty when all regions fail with cold store', async () => {
    const fetch = vi.fn(async () => new Response('err', { status: 500 }))
    const r = await getSaasEvents(deps({ fetch: fetch as unknown as typeof globalThis.fetch }), memStore().store)
    expect(r.stale).toBe(true)
    expect(r.events).toEqual([])
  })

  it('serves the old row as stale when refresh fails', async () => {
    const fetch = vi.fn(async () => new Response('err', { status: 429 }))
    const { store } = memStore({ events: [fakeEvent()], fetchedAt: STALE_AT })
    const r = await getSaasEvents(deps({ fetch: fetch as unknown as typeof globalThis.fetch }), store)
    expect(r.stale).toBe(true)
    expect(r.events).toHaveLength(1)
  })

  it('dedupes concurrent refreshes into one gemini round', async () => {
    const fetch = vi.fn(async () => geminiResponse('[]'))
    const d = deps({ fetch: fetch as unknown as typeof globalThis.fetch })
    const { store } = memStore()
    await Promise.all([getSaasEvents(d, store), getSaasEvents(d, store)])
    expect(fetch).toHaveBeenCalledTimes(4) // one round of 4 regions, not two
  })
})

describe('refreshSaasEvents', () => {
  it('refreshes even when the row is fresh', async () => {
    const fetch = vi.fn(async () =>
      geminiResponse('[{"name":"New","date":"2026-10-01","url":"https://new.com","format":"in-person","location":"City","category":"Growth","desc":"d"}]'),
    )
    const { store, current } = memStore({ events: [fakeEvent()], fetchedAt: FRESH_AT })
    const r = await refreshSaasEvents({ now: () => NOW, fetch: fetch as unknown as typeof globalThis.fetch, apiKey: 'k' }, store)
    expect(fetch).toHaveBeenCalledTimes(4)
    expect(r.stale).toBe(false)
    expect(current()?.events.map((e) => e.name)).toEqual(['New'])
  })

  it('rejects without an api key', async () => {
    await expect(refreshSaasEvents({ now: () => NOW, fetch: vi.fn(), apiKey: undefined }, memStore().store)).rejects.toThrow('GEMINI_API_KEY')
  })

  it('rejects when all regions fail (no silent stale)', async () => {
    const fetch = vi.fn(async () => new Response('err', { status: 429 }))
    await expect(
      refreshSaasEvents({ now: () => NOW, fetch: fetch as unknown as typeof globalThis.fetch, apiKey: 'k' }, memStore().store),
    ).rejects.toThrow('all region fetches failed')
  })
})
