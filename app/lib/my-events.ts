import type { SaasEvent } from './saas-events'

/**
 * "My Events" store seam. Today it is an in-memory Map keyed by event id.
 * Later this interface backs a Supabase table + Google Calendar OAuth without
 * the page contract changing.
 */
export type MyEvents = Map<string, SaasEvent>

export function addToMyEvents(store: MyEvents, event: SaasEvent): MyEvents {
  const next = new Map(store)
  next.set(event.id, event)
  return next
}

export function removeFromMyEvents(store: MyEvents, id: string): MyEvents {
  const next = new Map(store)
  next.delete(id)
  return next
}

export function listMyEvents(store: MyEvents): SaasEvent[] {
  return [...store.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export function hasMyEvent(store: MyEvents, id: string): boolean {
  return store.has(id)
}
