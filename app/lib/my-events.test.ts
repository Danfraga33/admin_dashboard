import { describe, it, expect } from 'vitest'
import { addToMyEvents, removeFromMyEvents, listMyEvents, hasMyEvent, type MyEvents } from './my-events'
import type { SaasEvent } from './saas-events.server'

function ev(id: string, date: string): SaasEvent {
  return { id, name: `Event ${id}`, date, location: 'X', region: 'Online', domain: 'SaaS', format: 'virtual', url: `https://e/${id}`, category: 'SaaS', desc: '' }
}

describe('my-events store', () => {
  it('adds an event and reports membership', () => {
    let store: MyEvents = new Map()
    store = addToMyEvents(store, ev('a', '2026-07-01'))
    expect(hasMyEvent(store, 'a')).toBe(true)
    expect(hasMyEvent(store, 'b')).toBe(false)
  })

  it('does not mutate the input store (immutable update)', () => {
    const store: MyEvents = new Map()
    const next = addToMyEvents(store, ev('a', '2026-07-01'))
    expect(store.size).toBe(0)
    expect(next.size).toBe(1)
  })

  it('dedups by id', () => {
    let store: MyEvents = new Map()
    store = addToMyEvents(store, ev('a', '2026-07-01'))
    store = addToMyEvents(store, ev('a', '2026-08-01'))
    expect(store.size).toBe(1)
    expect(store.get('a')!.date).toBe('2026-08-01')
  })

  it('removes by id', () => {
    let store: MyEvents = new Map()
    store = addToMyEvents(store, ev('a', '2026-07-01'))
    store = removeFromMyEvents(store, 'a')
    expect(hasMyEvent(store, 'a')).toBe(false)
  })

  it('lists sorted by date ascending', () => {
    let store: MyEvents = new Map()
    store = addToMyEvents(store, ev('a', '2026-09-01'))
    store = addToMyEvents(store, ev('b', '2026-07-01'))
    store = addToMyEvents(store, ev('c', '2026-08-01'))
    expect(listMyEvents(store).map((e) => e.id)).toEqual(['b', 'c', 'a'])
  })
})
