import { useMemo, useState } from 'react'
import { data, useLoaderData } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { ChevronLeft, ChevronRight, Plus, Check, ExternalLink, Search } from 'lucide-react'
import { requireSession } from '~/lib/session.server'
import { getSaasEventsLive } from '~/lib/saas-events.server'
import { REGIONS_FILTER, type SaasEvent, type Region } from '~/lib/saas-events'
import { addToMyEvents, removeFromMyEvents, hasMyEvent, type MyEvents } from '~/lib/my-events'
import { buildMonthGrid, monthLabel, addMonths, WEEKDAYS, isoDate } from '~/lib/calendar'
import { cn } from '~/lib/utils'

export async function loader({ request }: LoaderFunctionArgs) {
  const { responseHeaders } = await requireSession(request)
  const result = await getSaasEventsLive()
  return data(result, { headers: responseHeaders })
}

export const meta = () => [{ title: 'Atlas · Events' }]

function groupByDate(events: SaasEvent[]): Map<string, SaasEvent[]> {
  const map = new Map<string, SaasEvent[]>()
  for (const e of events) {
    const list = map.get(e.date) ?? []
    list.push(e)
    map.set(e.date, list)
  }
  return map
}

export default function Events() {
  const { events, fetchedAt, stale } = useLoaderData<typeof loader>()
  const today = new Date()
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [myEvents, setMyEvents] = useState<MyEvents>(new Map())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [activeRegion, setActiveRegion] = useState<Region | null>(null)
  const [query, setQuery] = useState('')

  const categories = useMemo(
    () => [...new Set(events.map((e) => e.category))].sort(),
    [events],
  )

  // discovered + my-added events both render on the grid
  const calendarEvents = useMemo(() => {
    const merged = new Map<string, SaasEvent>()
    for (const e of events) merged.set(e.id, e)
    for (const e of myEvents.values()) merged.set(e.id, e)
    return [...merged.values()]
  }, [events, myEvents])

  const byDate = useMemo(() => groupByDate(calendarEvents), [calendarEvents])
  const grid = useMemo(() => buildMonthGrid(view.year, view.month), [view])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return events.filter((e) => {
      if (selectedDate && e.date !== selectedDate) return false
      if (activeCategory && e.category !== activeCategory) return false
      if (activeRegion && e.region !== activeRegion) return false
      if (q && !e.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [events, selectedDate, activeCategory, activeRegion, query])

  const todayIso = isoDate(today.getFullYear(), today.getMonth(), today.getDate())

  function toggleMine(e: SaasEvent) {
    setMyEvents((store) => (hasMyEvent(store, e.id) ? removeFromMyEvents(store, e.id) : addToMyEvents(store, e)))
  }

  function step(delta: number) {
    setView((v) => addMonths(v.year, v.month, delta))
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-1">
        <h1 className="text-3xl font-semibold text-foreground">Events</h1>
        {myEvents.size > 0 && (
          <span className="font-mono text-xs text-chart-2">{myEvents.size} on my calendar</span>
        )}
      </div>
      <p className="text-muted-foreground text-sm mb-8">
        SaaS-learning events for the year ahead. Hit{' '}
        <Plus size={12} className="inline -mt-0.5" /> to add one to your calendar.
      </p>

      {stale && (
        <div className="bg-card border border-border rounded-lg px-4 py-3 mb-6 text-sm text-muted-foreground">
          {events.length === 0
            ? 'No events loaded. Set GEMINI_API_KEY to fetch live SaaS events.'
            : 'Showing cached results — live refresh failed.'}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-6">
        {/* Calendar */}
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center justify-center gap-3 mb-4">
            <button onClick={() => step(-1)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer" aria-label="Previous month">
              <ChevronLeft size={16} />
            </button>
            <h2 className="text-sm font-medium text-foreground min-w-[140px] text-center">{monthLabel(view.year, view.month)}</h2>
            <button onClick={() => step(1)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer" aria-label="Next month">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 grid-rows-6 gap-1 auto-rows-fr min-h-[640px]">
            {grid.map((cell) => {
              const dayEvents = byDate.get(cell.date) ?? []
              const isSelected = selectedDate === cell.date
              const isToday = cell.inMonth && cell.date === todayIso
              const hasMine = dayEvents.some((e) => hasMyEvent(myEvents, e.id))
              return (
                <button
                  key={cell.date}
                  onClick={() => setSelectedDate(isSelected ? null : cell.date)}
                  className={cn(
                    'relative rounded-md border p-2 text-left transition-colors cursor-pointer flex flex-col',
                    cell.inMonth ? 'border-border' : 'border-transparent opacity-40',
                    isSelected ? 'bg-muted ring-2 ring-ring' : 'hover:bg-muted/50',
                  )}
                >
                  <span className={cn('font-mono text-[11px]', isToday ? 'text-chart-1 font-semibold' : 'text-muted-foreground')}>
                    {cell.day}
                  </span>
                  {dayEvents.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-0.5">
                      {dayEvents.slice(0, 3).map((e) => (
                        <span key={e.id} className={cn('h-1.5 w-1.5 rounded-full', hasMine && hasMyEvent(myEvents, e.id) ? 'bg-chart-2' : 'bg-chart-1')} title={e.name} />
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="font-mono text-[9px] text-muted-foreground">+{dayEvents.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* List + filters */}
        <div className="bg-card border border-border rounded-lg p-5 flex flex-col">
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search events"
              className="w-full bg-input border border-border rounded-md pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 mb-2">
            <Chip label="All regions" active={!activeRegion} onClick={() => setActiveRegion(null)} />
            {REGIONS_FILTER.map((r) => (
              <Chip key={r} label={r} active={activeRegion === r} onClick={() => setActiveRegion(activeRegion === r ? null : r)} />
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5 mb-4">
            <Chip label="All topics" active={!activeCategory} onClick={() => setActiveCategory(null)} />
            {categories.map((c) => (
              <Chip key={c} label={c} active={activeCategory === c} onClick={() => setActiveCategory(activeCategory === c ? null : c)} />
            ))}
          </div>

          {selectedDate && (
            <button onClick={() => setSelectedDate(null)} className="mb-3 self-start text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
              Showing {selectedDate} · clear
            </button>
          )}

          <div className="space-y-2 overflow-y-auto max-h-[560px] -mr-2 pr-2">
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground py-8 text-center">No events match.</p>
            )}
            {filtered.map((e) => {
              const mine = hasMyEvent(myEvents, e.id)
              return (
                <div key={e.id} className="border border-border rounded-md p-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{e.name}</p>
                      <p className="font-mono text-[11px] text-muted-foreground mt-0.5">{e.date} · {e.location || 'TBD'}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground">{e.category}</span>
                        <span className="text-[10px] text-muted-foreground">{e.region}</span>
                        {e.format && <span className="text-[10px] text-muted-foreground">{e.format}</span>}
                        {e.url && (
                          <a href={e.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-[10px] text-chart-1 hover:underline" onClick={(ev) => ev.stopPropagation()}>
                            source <ExternalLink size={9} />
                          </a>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleMine(e)}
                      aria-label={mine ? `Remove ${e.name}` : `Add ${e.name}`}
                      className={cn(
                        'grid h-7 w-7 shrink-0 place-items-center rounded-md border transition-colors cursor-pointer',
                        mine ? 'border-chart-2 bg-chart-2/15 text-chart-2' : 'border-border text-muted-foreground hover:border-primary hover:text-foreground',
                      )}
                    >
                      {mine ? <Check size={15} /> : <Plus size={15} />}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
        active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
    </button>
  )
}
