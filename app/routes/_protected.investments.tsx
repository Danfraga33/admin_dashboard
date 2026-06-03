import { useEffect, useRef, useState } from 'react'
import { data, useFetcher, useLoaderData, type LoaderFunctionArgs, type ActionFunctionArgs } from 'react-router'
import { useReducedMotion } from 'framer-motion'
import { Check, Star, Plus, X, Pencil, Loader2 } from 'lucide-react'
import { AGENTS, type Holding, type Portfolio } from '~/lib/atlas-data'
import { requireSession } from '~/lib/session.server'
import { createSupabaseAdminClient } from '~/lib/supabase.admin'
import { readPortfolio } from '~/lib/sharesight.server'

interface WatchRow {
  id: string
  sym: string
  note: string
}
import {
  Reveal,
  RevealContext,
  Card,
  Sparkline,
  Donut,
  Num,
  Delta,
  Label,
  AgentSummary,
  PageHeader,
  StatTile,
  toneColor,
  stag,
} from '~/components/atlas'

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, supabase } = await requireSession(request)
  const admin = createSupabaseAdminClient()
  const { portfolio, live } = await readPortfolio(admin, session.user.id)
  const { data: watch } = await supabase
    .from('watchlist')
    .select('id, sym, note')
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })
  return {
    portfolio,
    cash: portfolio.cash,
    live,
    watch: (watch ?? []) as WatchRow[],
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

  return data({ ok: true }, { headers: responseHeaders })
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

function HoldingRow({ h, i }: { h: Holding; i: number }) {
  return (
    <Reveal delay={stag(i, 0, 60)} className="group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/40">
      <span className="grid w-12 shrink-0 place-items-center rounded-md border border-border bg-muted/40 py-1 font-mono text-[11px] font-semibold text-foreground">{h.sym}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{h.name}</p>
        <p className="truncate text-[11px] text-muted-foreground">{h.note}</p>
      </div>
      <div className="hidden sm:block">
        <Sparkline data={h.spark} color={toneColor(h.tone)} w={96} h={30} fill={false} delay={300 + i * 60} />
      </div>
      <div className="w-24 text-right">
        <p className="font-mono text-sm text-foreground">
          <Num value={h.val} prefix="$" />
        </p>
        <Delta pct={h.pct} className="justify-end" />
      </div>
      <div className="hidden w-12 text-right font-mono text-[11px] text-muted-foreground md:block">{h.alloc}%</div>
    </Reveal>
  )
}

function Holdings({ data }: { data: Portfolio }) {
  const loaded = useFetch(820)
  return (
    <Reveal delay={260}>
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <Label>Holdings</Label>
          <span className="font-mono text-[11px] text-muted-foreground">{loaded ? `${data.holdings.length} positions` : 'Scout fetching…'}</span>
        </div>
        <div className="divide-y divide-border">
          {loaded ? data.holdings.map((h, i) => <HoldingRow key={h.sym} h={h} i={i} />) : Array.from({ length: 5 }).map((_, i) => <HoldingSkeleton key={i} />)}
        </div>
      </Card>
    </Reveal>
  )
}

function Allocation({ data }: { data: Portfolio }) {
  return (
    <Reveal delay={300}>
      <Card className="p-5">
        <Label>Allocation</Label>
        <div className="mt-4 flex items-center gap-5">
          <Donut segments={data.allocation} size={132} thickness={14}>
            <div>
              <p className="font-mono text-lg text-foreground">
                <Num value={4} suffix=" cls" />
              </p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">classes</p>
            </div>
          </Donut>
          <ul className="flex-1 space-y-2.5">
            {data.allocation.map((s, i) => (
              <Reveal key={s.label} delay={stag(i, 360, 70)} className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: `var(--${s.color})` }} />
                <span className="flex-1 text-[13px] text-foreground">{s.label}</span>
                <span className="font-mono text-[12px] text-muted-foreground">{s.pct}%</span>
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

  return (
    <div className="group flex items-center gap-3 rounded-lg px-1 py-2 hover:bg-muted/40 transition-colors">
      <span className="grid w-12 shrink-0 place-items-center rounded-md border border-border bg-muted/40 py-1 font-mono text-[11px] font-semibold text-foreground">{w.sym}</span>
      <span className="flex-1 truncate text-[13px] text-muted-foreground">{w.note || '—'}</span>
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
          <Label>Scout watchlist</Label>
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

export const meta = () => [{ title: 'Atlas · Investments' }]

export default function Investments() {
  const { portfolio: p, cash, live, watch, scout } = useLoaderData<typeof loader>()

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
              <p className="mt-1.5 font-mono text-2xl tracking-tight text-foreground md:text-3xl">
                <Num value={p.total} prefix="$" />
              </p>
              <p className="mt-1 flex items-center gap-1.5 md:justify-end">
                <Delta pct={p.dayPct} /> <span className="font-mono text-[11px] text-muted-foreground">+${(p.dayAbs / 1000).toFixed(1)}K</span>
              </p>
            </div>
          }
        />

        <div className="mt-7">
          <AgentSummary
            agent={scout}
            label={live ? 'Portfolio & market read · live from Sharesight' : 'Portfolio & market read · sample data'}
            text={p.scoutNote}
            footer={
              <>
                <Check size={13} className="text-chart-2" /> {live ? `Fetched ${p.holdings.length} holdings from Sharesight` : 'Connect Sharesight to replace sample data'}
              </>
            }
          />
        </div>

        <div className="mt-6 grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Total value" value={p.total} prefix="$" spark={p.spark} sparkColor="chart-1" delay={120} />
          <StatTile label="Today" value={p.dayAbs} prefix="+$" delta={p.dayPct} sparkColor="chart-2" delay={180} />
          <StatTile label="Return · YTD" value={p.ytdPct} suffix="%" decimals={1} delta={p.ytdPct} delay={240} />
          <StatTile label="Dry powder · cash" value={cash} prefix="$" sparkColor="chart-2" delay={300} />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Holdings data={p} />
          </div>
          <div className="space-y-4">
            <Allocation data={p} />
            <Watchlist watch={watch} />
          </div>
        </div>
      </div>
    </RevealContext.Provider>
  )
}
