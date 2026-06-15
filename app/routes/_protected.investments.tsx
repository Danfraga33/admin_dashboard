import { useEffect, useRef, useState } from 'react'
import { data, useFetcher, useLoaderData, type LoaderFunctionArgs, type ActionFunctionArgs } from 'react-router'
import { useReducedMotion } from 'framer-motion'
import { Check, Star, Plus, X, Pencil, Loader2 } from 'lucide-react'
import { AGENTS, type Holding, type Portfolio, type ChartColor } from '~/lib/atlas-data'
import { cn } from '~/lib/utils'
import { usePrivacy } from '~/components/privacy-provider'
import { requireSession } from '~/lib/session.server'
import { createSupabaseAdminClient } from '~/lib/supabase.admin'
import { readPortfolio } from '~/lib/sharesight.server'
import { getScoutNoteLive } from '~/lib/scout.server'

interface WatchRow {
  id: string
  sym: string
  note: string
}

/** Ticker → company name, resolved client-side (watchlist DB only stores the symbol). */
const COMPANY: Record<string, string> = {
  PWR: 'Quanta Services',
  POWL: 'Powell Industries',
  ETN: 'Eaton',
  VRT: 'Vertiv',
  WIRE: 'Global X Copper Miners ETF',
  SYM: 'Symbotic',
  NVT: 'nVent Electric',
  LDOS: 'Leidos',
  RTX: 'RTX',
  ATI: 'ATI',
  UUUU: 'Energy Fuels',
  LEU: 'Centrus Energy',
}

interface ThemeRow {
  id: string
  name: string
  color: ChartColor
}

/** Selectable dot colors for a theme — the chart palette. */
const THEME_COLORS: ChartColor[] = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5']
import {
  Reveal,
  RevealContext,
  Card,
  Donut,
  Num,
  Delta,
  Label,
  AgentSummary,
  InfoHint,
  PageHeader,
  StatTile,
  ValueChart,
  stag,
} from '~/components/atlas'

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, supabase } = await requireSession(request)
  const admin = createSupabaseAdminClient()
  const { portfolio, live, syncedAt, valueSeries } = await readPortfolio(admin, session.user.id)
  const scoutNote = await getScoutNoteLive(session.user.id, portfolio, valueSeries)
  const { data: watch } = await supabase
    .from('watchlist')
    .select('id, sym, note')
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })
  const { data: themes } = await supabase
    .from('investment_themes')
    .select('id, name, color')
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })
  const syncedLabel = syncedAt
    ? new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Australia/Sydney' }).format(new Date(syncedAt))
    : null
  return {
    portfolio,
    cash: portfolio.cash,
    live,
    syncedLabel,
    valueSeries,
    scoutNote,
    watch: (watch ?? []) as WatchRow[],
    themes: (themes ?? []) as ThemeRow[],
    scout: AGENTS.find((a) => a.id === 'scout')!,
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const { session, supabase, responseHeaders } = await requireSession(request)
  const form = await request.formData()
  const intent = form.get('intent')

  if (intent === 'create') {
    const sym = String(form.get('sym') || '').trim().toUpperCase()
    if (sym) {
      await supabase.from('watchlist').insert({
        user_id: session.user.id,
        sym,
        note: String(form.get('note') || '').trim(),
      })
    }
  }

  if (intent === 'update') {
    const sym = String(form.get('sym') || '').trim().toUpperCase()
    if (sym) {
      await supabase
        .from('watchlist')
        .update({ sym, note: String(form.get('note') || '').trim() })
        .eq('id', String(form.get('id')))
    }
  }

  if (intent === 'delete') {
    await supabase.from('watchlist').delete().eq('id', String(form.get('id')))
  }

  if (intent === 'theme-create') {
    const name = String(form.get('name') || '').trim()
    if (name) {
      await supabase.from('investment_themes').insert({
        user_id: session.user.id,
        name,
        color: themeColor(form.get('color')),
      })
    }
  }

  if (intent === 'theme-update') {
    const name = String(form.get('name') || '').trim()
    if (name) {
      await supabase
        .from('investment_themes')
        .update({ name, color: themeColor(form.get('color')) })
        .eq('id', String(form.get('id')))
    }
  }

  if (intent === 'theme-delete') {
    await supabase.from('investment_themes').delete().eq('id', String(form.get('id')))
  }

  return data({ ok: true }, { headers: responseHeaders })
}

/** Coerce a submitted color to a valid palette key, falling back to chart-1. */
function themeColor(raw: FormDataEntryValue | null): ChartColor {
  const c = String(raw || '')
  return (THEME_COLORS as string[]).includes(c) ? (c as ChartColor) : 'chart-1'
}

/** Brief "Scout fetching…" skeleton on client mount; SSR + reduced-motion render loaded. */
function useFetch(delay = 820) {
  const reduce = useReducedMotion()
  const [done, setDone] = useState(true)
  useEffect(() => {
    if (reduce) return
    setDone(false)
    const t = setTimeout(() => setDone(true), delay)
    return () => clearTimeout(t)
  }, [reduce, delay])
  return done
}

function HoldingSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5">
      <div className="h-8 w-12 animate-pulse rounded bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        <div className="h-2 w-16 animate-pulse rounded bg-muted/60" />
      </div>
      <div className="h-8 w-24 animate-pulse rounded bg-muted" />
      <div className="h-3 w-16 animate-pulse rounded bg-muted" />
    </div>
  )
}

function HoldingRow({ h, i, mask }: { h: Holding; i: number; mask: boolean }) {
  const maskCls = mask ? 'blur-[7px] select-none' : ''
  return (
    <Reveal delay={stag(i, 0, 60)} className="group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/40">
      <span className="grid w-12 shrink-0 place-items-center rounded-md border border-border bg-muted/40 py-1 font-mono text-[11px] font-semibold text-foreground">{h.sym}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{h.name}</p>
        <p className="truncate text-[11px] text-muted-foreground">{h.note}</p>
      </div>
      <div className={cn('w-24 text-right transition-[filter] duration-200', maskCls)}>
        <p className="font-mono text-sm text-foreground" title="Market value at end-of-day prices">
          <Num value={h.val} prefix="$" />
        </p>
        <span title="Total return since 1 January (YTD)">
          <Delta pct={h.pct} className="justify-end" />
        </span>
      </div>
      <div className={cn('hidden w-12 text-right font-mono text-[11px] text-muted-foreground md:block transition-[filter] duration-200', maskCls)} title="Share of total portfolio value">{h.alloc}%</div>
    </Reveal>
  )
}

function Holdings({ data, mask }: { data: Portfolio; mask: boolean }) {
  const loaded = useFetch(820)
  return (
    <Reveal delay={260}>
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="flex items-center gap-1.5">
            <Label>Holdings</Label>
            <InfoHint text="Value is at end-of-day prices. The % under each value is total return since 1 January (YTD), not today's move." />
          </span>
          <span className="font-mono text-[11px] text-muted-foreground">{loaded ? `${data.holdings.length} positions` : 'Scout fetching…'}</span>
        </div>
        <div className="divide-y divide-border">
          {loaded ? data.holdings.map((h, i) => <HoldingRow key={h.sym} h={h} i={i} mask={mask} />) : Array.from({ length: 5 }).map((_, i) => <HoldingSkeleton key={i} />)}
        </div>
      </Card>
    </Reveal>
  )
}

function Allocation({ data, mask }: { data: Portfolio; mask: boolean }) {
  const maskCls = mask ? 'blur-[7px] select-none' : ''
  return (
    <Reveal delay={300}>
      <Card className="p-5">
        <span className="flex items-center gap-1.5">
          <Label>Allocation</Label>
          <InfoHint text="Holdings grouped by theme (gold, silver, uranium…) as a share of total portfolio value, including cash." />
        </span>
        <div className="mt-4 flex items-center gap-5">
          <Donut segments={data.allocation} size={132} thickness={14} mask={mask}>
            <div>
              <p className="font-mono text-lg text-foreground">
                <Num value={data.allocation.length} suffix=" cls" />
              </p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">classes</p>
            </div>
          </Donut>
          <ul className="flex-1 space-y-2.5">
            {data.allocation.map((s, i) => (
              <Reveal key={s.label} delay={stag(i, 360, 70)} className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: `var(--${s.color})` }} />
                <span className="flex-1 text-[13px] text-foreground">{s.label}</span>
                <span className={cn('font-mono text-[12px] text-muted-foreground transition-[filter] duration-200', maskCls)}>{s.pct}%</span>
              </Reveal>
            ))}
          </ul>
        </div>
      </Card>
    </Reveal>
  )
}

function WatchRowItem({ w, pending = false }: { w: WatchRow; pending?: boolean }) {
  const [editing, setEditing] = useState(false)
  const fetcher = useFetcher()
  const busy = fetcher.state !== 'idle'
  const intent = fetcher.formData?.get('intent')

  // Delete in flight → remove the row immediately.
  if (busy && intent === 'delete') return null

  // Update in flight → show the submitted values immediately with a spinner.
  if (busy && intent === 'update') {
    const sym = String(fetcher.formData!.get('sym') || '').toUpperCase()
    const note = String(fetcher.formData!.get('note') || '')
    return (
      <div className="flex items-center gap-3 rounded-lg px-1 py-2 opacity-50">
        <span className="grid w-12 shrink-0 place-items-center rounded-md border border-border bg-muted/40 py-1 font-mono text-[11px] font-semibold text-foreground">{sym}</span>
        <span className="flex-1 truncate text-[13px] text-muted-foreground">{note || '—'}</span>
        <Loader2 size={13} className="shrink-0 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (pending) {
    return (
      <div className="flex items-center gap-3 rounded-lg px-1 py-2 opacity-50">
        <span className="grid w-12 shrink-0 place-items-center rounded-md border border-border bg-muted/40 py-1 font-mono text-[11px] font-semibold text-foreground">{w.sym}</span>
        <span className="flex-1 truncate text-[13px] text-muted-foreground">{w.note || '—'}</span>
        <Loader2 size={13} className="shrink-0 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (editing) {
    return (
      <fetcher.Form
        method="post"
        onSubmit={() => setEditing(false)}
        className="flex items-center gap-2 rounded-lg px-1 py-1.5"
      >
        <input type="hidden" name="intent" value="update" />
        <input type="hidden" name="id" value={w.id} />
        <input
          name="sym"
          defaultValue={w.sym}
          required
          className="w-16 shrink-0 rounded-md border border-border bg-input px-2 py-1 font-mono text-[11px] uppercase text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          name="note"
          defaultValue={w.note}
          placeholder="Note"
          className="min-w-0 flex-1 rounded-md border border-border bg-input px-2 py-1 text-[12px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button type="submit" className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-chart-2 hover:bg-muted transition-colors cursor-pointer" aria-label="Save">
          <Check size={13} />
        </button>
        <button type="button" onClick={() => setEditing(false)} className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted transition-colors cursor-pointer" aria-label="Cancel">
          <X size={13} />
        </button>
      </fetcher.Form>
    )
  }

  const name = COMPANY[w.sym] || w.note
  return (
    <div className="group flex items-center gap-3 rounded-lg px-1 py-2 hover:bg-muted/40 transition-colors">
      <span className="grid w-12 shrink-0 place-items-center rounded-md border border-border bg-muted/40 py-1 font-mono text-[11px] font-semibold text-foreground">{w.sym}</span>
      <span className="flex-1 truncate text-[13px] text-muted-foreground">{name || '—'}</span>
      <button onClick={() => setEditing(true)} className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-foreground transition-all cursor-pointer" aria-label={`Edit ${w.sym}`}>
        <Pencil size={12} />
      </button>
      <fetcher.Form method="post" className="shrink-0">
        <input type="hidden" name="intent" value="delete" />
        <input type="hidden" name="id" value={w.id} />
        <button type="submit" className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-destructive-foreground transition-all cursor-pointer" aria-label={`Remove ${w.sym}`}>
          <X size={13} />
        </button>
      </fetcher.Form>
    </div>
  )
}

function Watchlist({ watch }: { watch: WatchRow[] }) {
  const fetcher = useFetcher()
  const formRef = useRef<HTMLFormElement>(null)

  // Optimistic: while a create is in flight, show the pending symbol immediately.
  const creating = fetcher.state !== 'idle' && fetcher.formData?.get('intent') === 'create'
  const pendingSym = creating ? String(fetcher.formData!.get('sym') || '').trim().toUpperCase() : null
  const pendingNote = creating ? String(fetcher.formData!.get('note') || '').trim() : ''

  const rows: WatchRow[] = pendingSym
    ? [...watch, { id: `pending-${pendingSym}`, sym: pendingSym, note: pendingNote }]
    : watch

  function onSubmit() {
    // clear the input right after submit so it feels instant
    setTimeout(() => formRef.current?.reset(), 0)
  }

  return (
    <Reveal delay={340}>
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Label>Scout watchlist</Label>
            <InfoHint text="Symbols you're tracking for a possible entry — not held positions. Add, edit, or remove freely." />
          </span>
          <Star size={14} className="text-muted-foreground" />
        </div>

        <fetcher.Form method="post" ref={formRef} onSubmit={onSubmit} className="mt-3 flex items-center gap-2">
          <input type="hidden" name="intent" value="create" />
          <input
            name="sym"
            placeholder="SYM"
            required
            className="w-16 shrink-0 rounded-md border border-border bg-input px-2 py-1.5 font-mono text-[11px] uppercase text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            name="note"
            placeholder="Note (optional)"
            className="min-w-0 flex-1 rounded-md border border-border bg-input px-2 py-1.5 text-[12px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button type="submit" disabled={creating} className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-70 cursor-pointer" aria-label="Add to watchlist">
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          </button>
        </fetcher.Form>

        <ul className="mt-2 space-y-0.5">
          {rows.length === 0 && (
            <li className="px-1 py-3 text-[12px] text-muted-foreground">Watchlist empty — add a symbol above.</li>
          )}
          {rows.map((w) => (
            <li key={w.id}>
              <WatchRowItem w={w} pending={w.id.startsWith('pending-')} />
            </li>
          ))}
        </ul>
      </Card>
    </Reveal>
  )
}

/** Radio-style row of palette swatches for picking a theme's dot color. */
function ColorDots({ name, value }: { name: string; value: ChartColor }) {
  const [picked, setPicked] = useState<ChartColor>(value)
  return (
    <div className="flex shrink-0 items-center gap-1">
      {THEME_COLORS.map((c) => (
        <label key={c} className="cursor-pointer">
          <input type="radio" name={name} value={c} checked={picked === c} onChange={() => setPicked(c)} className="peer sr-only" />
          <span
            className="block h-4 w-4 rounded-sm ring-offset-1 ring-offset-card transition-all peer-checked:ring-2 peer-checked:ring-ring hover:scale-110"
            style={{ background: `var(--${c})` }}
          />
        </label>
      ))}
    </div>
  )
}

function ThemeRowItem({ t, pending = false }: { t: ThemeRow; pending?: boolean }) {
  const [editing, setEditing] = useState(false)
  const fetcher = useFetcher()
  const busy = fetcher.state !== 'idle'
  const intent = fetcher.formData?.get('intent')

  if (busy && intent === 'theme-delete') return null

  if (busy && intent === 'theme-update') {
    const name = String(fetcher.formData!.get('name') || '')
    const color = themeColor(fetcher.formData!.get('color'))
    return (
      <div className="flex items-center gap-2.5 rounded-lg px-1 py-2 opacity-50">
        <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: `var(--${color})` }} />
        <span className="flex-1 truncate text-[13px] text-foreground">{name}</span>
        <Loader2 size={13} className="shrink-0 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (pending) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg px-1 py-2 opacity-50">
        <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: `var(--${t.color})` }} />
        <span className="flex-1 truncate text-[13px] text-foreground">{t.name}</span>
        <Loader2 size={13} className="shrink-0 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (editing) {
    return (
      <fetcher.Form method="post" onSubmit={() => setEditing(false)} className="flex items-center gap-2 rounded-lg px-1 py-1.5">
        <input type="hidden" name="intent" value="theme-update" />
        <input type="hidden" name="id" value={t.id} />
        <ColorDots name="color" value={t.color} />
        <input
          name="name"
          defaultValue={t.name}
          required
          className="min-w-0 flex-1 rounded-md border border-border bg-input px-2 py-1 text-[12px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button type="submit" className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-chart-2 hover:bg-muted transition-colors cursor-pointer" aria-label="Save">
          <Check size={13} />
        </button>
        <button type="button" onClick={() => setEditing(false)} className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted transition-colors cursor-pointer" aria-label="Cancel">
          <X size={13} />
        </button>
      </fetcher.Form>
    )
  }

  return (
    <div className="group flex items-center gap-2.5 rounded-lg px-1 py-2 hover:bg-muted/40 transition-colors">
      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: `var(--${t.color})` }} />
      <span className="flex-1 truncate text-[13px] text-foreground">{t.name}</span>
      <button onClick={() => setEditing(true)} className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-foreground transition-all cursor-pointer" aria-label={`Edit ${t.name}`}>
        <Pencil size={12} />
      </button>
      <fetcher.Form method="post" className="shrink-0">
        <input type="hidden" name="intent" value="theme-delete" />
        <input type="hidden" name="id" value={t.id} />
        <button type="submit" className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-destructive-foreground transition-all cursor-pointer" aria-label={`Remove ${t.name}`}>
          <X size={13} />
        </button>
      </fetcher.Form>
    </div>
  )
}

function Themes({ themes }: { themes: ThemeRow[] }) {
  const fetcher = useFetcher()
  const formRef = useRef<HTMLFormElement>(null)

  const creating = fetcher.state !== 'idle' && fetcher.formData?.get('intent') === 'theme-create'
  const pendingName = creating ? String(fetcher.formData!.get('name') || '').trim() : null
  const pendingColor = creating ? themeColor(fetcher.formData!.get('color')) : 'chart-1'

  const rows: ThemeRow[] = pendingName
    ? [...themes, { id: `pending-${pendingName}`, name: pendingName, color: pendingColor }]
    : themes

  function onSubmit() {
    setTimeout(() => formRef.current?.reset(), 0)
  }

  return (
    <Reveal delay={380}>
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Label>Investment themes</Label>
            <InfoHint text="Structural macro theses Scout tracks for positioning — the sectors behind the watchlist and holdings." />
          </span>
        </div>

        <fetcher.Form method="post" ref={formRef} onSubmit={onSubmit} className="mt-3 flex items-center gap-2">
          <input type="hidden" name="intent" value="theme-create" />
          <ColorDots name="color" value="chart-1" />
          <input
            name="name"
            placeholder="New theme"
            required
            className="min-w-0 flex-1 rounded-md border border-border bg-input px-2 py-1.5 text-[12px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button type="submit" disabled={creating} className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-70 cursor-pointer" aria-label="Add theme">
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          </button>
        </fetcher.Form>

        <ul className="mt-2 space-y-0.5">
          {rows.length === 0 && (
            <li className="px-1 py-3 text-[12px] text-muted-foreground">No themes yet — add one above.</li>
          )}
          {rows.map((t) => (
            <li key={t.id}>
              <ThemeRowItem t={t} pending={t.id.startsWith('pending-')} />
            </li>
          ))}
        </ul>
      </Card>
    </Reveal>
  )
}

export const meta = () => [{ title: 'Atlas · Investments' }]

export default function Investments() {
  const { portfolio: p, cash, live, syncedLabel, valueSeries, scoutNote, watch, themes, scout } = useLoaderData<typeof loader>()
  const { hidden: mask } = usePrivacy()
  const maskCls = mask ? 'blur-[7px] select-none' : ''

  return (
    <RevealContext.Provider value={false}>
      <div className="mx-auto max-w-screen-2xl">
        <PageHeader
          kicker="Investments"
          title="The Portfolio"
          sub={
            live
              ? 'Scout pulls live positions from Sharesight and writes the read so you don\'t have to.'
              : 'Showing sample data — connect Sharesight to go live.'
          }
          right={
            <div className="md:text-right">
              <Label>Total value · today</Label>
              <p className={cn('mt-1.5 font-mono text-2xl tracking-tight text-foreground md:text-3xl transition-[filter] duration-200', maskCls)}>
                <Num value={p.total} prefix="$" />
              </p>
              <p className={cn('mt-1 flex items-center gap-1.5 md:justify-end transition-[filter] duration-200', maskCls)} title="Move since the previous market close">
                <Delta pct={p.dayPct} />{' '}
                <span className="font-mono text-[11px] text-muted-foreground">
                  {p.dayAbs < 0 ? '-' : '+'}${(Math.abs(p.dayAbs) / 1000).toFixed(1)}K
                </span>
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground md:text-right">
                {syncedLabel ? `EOD prices · synced ${syncedLabel}` : 'EOD prices · sample data'}
              </p>
            </div>
          }
        />

        <div className="mt-6">
          <Card className="p-5">
            <div className="flex items-end justify-between">
              <span className="flex items-center gap-1.5">
                <Label>Total Portfolio Value</Label>
                <InfoHint text="Real portfolio value over time from Sharesight end-of-day valuations. Hover any point for the date and value." />
              </span>
              <div className="text-right">
                <p className={cn('font-mono text-2xl tracking-tight text-foreground md:text-3xl transition-[filter] duration-200', maskCls)}>
                  <Num value={p.total} prefix="$" />
                </p>
                <p className={cn('mt-0.5 flex items-center gap-1.5 md:justify-end transition-[filter] duration-200', maskCls)}>
                  <Delta pct={p.ytdPct} />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">YTD</span>
                </p>
              </div>
            </div>
            <ValueChart
              className="mt-5"
              height={240}
              mask={mask}
              dates={valueSeries.map((p) => p.date)}
              series={[
                { label: 'Total', color: 'chart-1', values: valueSeries.map((p) => p.total) },
                { label: 'Portfolio', color: 'chart-5', values: valueSeries.map((p) => p.total - p.cash) },
                { label: 'Cash', color: 'chart-2', values: valueSeries.map((p) => p.cash) },
              ]}
            />
          </Card>
        </div>

        <div className="mt-4">
          <AgentSummary
            agent={scout}
            label={live ? 'Scout · weekly portfolio read, live from Sharesight' : 'Scout · weekly read, sample data'}
            text={scoutNote}
            footer={
              <>
                <Check size={13} className="text-chart-2" /> {live ? `Fetched ${p.holdings.length} holdings from Sharesight` : 'Connect Sharesight to replace sample data'}
              </>
            }
          />
        </div>

        <div className="mt-6 grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Total value"
            value={p.total}
            prefix="$"
            delay={120}
            mask={mask}
            info="Market value of all holdings plus cash, at end-of-day (EOD) prices from Sharesight."
          />
          <StatTile
            label="Today"
            value={Math.abs(p.dayAbs)}
            prefix={p.dayAbs < 0 ? '-$' : '+$'}
            delta={p.dayPct}
            sparkColor="chart-2"
            delay={180}
            mask={mask}
            info="Dollar and percent move since the previous market close (1-day Sharesight performance window)."
          />
          <StatTile
            label="Return · YTD"
            value={p.ytdPct}
            suffix="%"
            decimals={1}
            delta={p.ytdPct}
            delay={240}
            mask={mask}
            info="Total return since 1 January, including currency moves (Sharesight total gain %)."
          />
          <StatTile
            label="Dry powder · cash"
            value={cash}
            prefix="$"
            sparkColor="chart-2"
            delay={300}
            mask={mask}
            info="Sum of cash account balances in the portfolio — funds available to deploy."
          />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Holdings data={p} mask={mask} />
          </div>
          <div className="space-y-4">
            <Allocation data={p} mask={mask} />
            <Watchlist watch={watch} />
            <Themes themes={themes} />
          </div>
        </div>
      </div>
    </RevealContext.Provider>
  )
}
