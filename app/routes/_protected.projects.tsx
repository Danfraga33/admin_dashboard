import { useCallback, useEffect, useRef, useState } from 'react'
import { data, useFetcher, useLoaderData, type LoaderFunctionArgs, type ActionFunctionArgs } from 'react-router'
import { Check, GitBranch, Minus, Plus } from 'lucide-react'
import { AGENTS, PROJECTS, type ProjectItem } from '~/lib/atlas-data'
import { cn } from '~/lib/utils'
import { requireSession } from '~/lib/session.server'
import {
  Reveal,
  RevealContext,
  SpotlightCard,
  Num,
  Label,
  StatusBadge,
  AgentSummary,
  PageHeader,
  stag,
} from '~/components/atlas'

type ProjectRow = ProjectItem & { id: string }

const STATUSES = ['Shipping', 'Building', 'Live', 'Paused'] as const
function isStatus(s: string): s is ProjectItem['status'] {
  return (STATUSES as readonly string[]).includes(s)
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, supabase } = await requireSession(request)
  const { data: rows } = await supabase
    .from('projects')
    .select('id, name, tag, status, progress, stack, metric_label, metric, activity, accent')
    .eq('user_id', session.user.id)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })

  const items: ProjectRow[] =
    rows && rows.length
      ? rows.map((r) => ({
          id: r.id,
          name: r.name,
          tag: r.tag,
          status: isStatus(r.status) ? r.status : 'Building',
          progress: r.progress,
          stack: r.stack,
          metricLabel: r.metric_label,
          metric: r.metric,
          activity: r.activity,
          accent: r.accent as ProjectItem['accent'],
        }))
      : PROJECTS.items.map((p, i) => ({ ...p, id: `static-${i}` }))

  return { items, forgeNote: PROJECTS.forgeNote, forge: AGENTS.find((a) => a.id === 'forge')! }
}

export async function action({ request }: ActionFunctionArgs) {
  const { session, supabase, responseHeaders } = await requireSession(request)
  const form = await request.formData()

  if (form.get('intent') === 'update-progress') {
    const id = String(form.get('id') || '')
    const raw = Number(form.get('progress'))
    if (id && !id.startsWith('static-') && Number.isFinite(raw)) {
      const progress = Math.max(0, Math.min(100, Math.round(raw)))
      await supabase.from('projects').update({ progress }).eq('id', id).eq('user_id', session.user.id)
    }
  }

  return data({ ok: true }, { headers: responseHeaders })
}

function StackChip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-md border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{children}</span>
}

/** Editable progress: click/drag the bar or use −/+ to set %, persisted on commit. */
function ProgressControl({ id, value, accent, editable }: { id: string; value: number; accent: ProjectItem['accent']; editable: boolean }) {
  const fetcher = useFetcher()
  const trackRef = useRef<HTMLDivElement>(null)
  const [pct, setPct] = useState(value)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dragging = useRef(false)

  // Keep in sync with server value when not mid-edit (e.g. after revalidation).
  useEffect(() => {
    if (!dragging.current && fetcher.state === 'idle') setPct(value)
  }, [value, fetcher.state])

  useEffect(() => () => { if (debounce.current) clearTimeout(debounce.current) }, [])

  const commit = useCallback(
    (next: number) => {
      fetcher.submit({ intent: 'update-progress', id, progress: String(next) }, { method: 'post' })
    },
    [fetcher, id],
  )

  const commitDebounced = useCallback(
    (next: number) => {
      if (debounce.current) clearTimeout(debounce.current)
      debounce.current = setTimeout(() => commit(next), 400)
    },
    [commit],
  )

  function pctFromClientX(clientX: number): number {
    const el = trackRef.current
    if (!el) return pct
    const rect = el.getBoundingClientRect()
    const rel = (clientX - rect.left) / rect.width
    return Math.max(0, Math.min(100, Math.round(rel * 100)))
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!editable) return
    dragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    setPct(pctFromClientX(e.clientX))
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current) return
    setPct(pctFromClientX(e.clientX))
  }
  function onPointerUp(e: React.PointerEvent) {
    if (!dragging.current) return
    dragging.current = false
    e.currentTarget.releasePointerCapture(e.pointerId)
    const next = pctFromClientX(e.clientX)
    setPct(next)
    commit(next)
  }

  function step(delta: number) {
    setPct((prev) => {
      const next = Math.max(0, Math.min(100, prev + delta))
      commitDebounced(next)
      return next
    })
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!editable) return
    let next: number | null = null
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = Math.max(0, pct - 1)
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = Math.min(100, pct + 1)
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = 100
    if (next !== null) {
      e.preventDefault()
      setPct(next)
      commitDebounced(next)
    }
  }

  return (
    <div className="flex items-center gap-2.5">
      {editable && (
        <button
          type="button"
          onClick={() => step(-1)}
          className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
          aria-label="Decrease progress"
        >
          <Minus size={12} />
        </button>
      )}
      <div
        ref={trackRef}
        role={editable ? 'slider' : undefined}
        tabIndex={editable ? 0 : undefined}
        aria-valuemin={editable ? 0 : undefined}
        aria-valuemax={editable ? 100 : undefined}
        aria-valuenow={editable ? pct : undefined}
        aria-label={editable ? 'Project progress' : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onKeyDown={onKeyDown}
        className={cn(
          'relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted',
          editable && 'cursor-pointer touch-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
        )}
      >
        <div className="h-full rounded-full transition-[width] duration-75" style={{ width: `${pct}%`, background: `var(--${accent})` }} />
      </div>
      {editable && (
        <button
          type="button"
          onClick={() => step(1)}
          className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
          aria-label="Increase progress"
        >
          <Plus size={12} />
        </button>
      )}
      <span className="w-9 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted-foreground">{pct}%</span>
    </div>
  )
}

function ProjectCard({ p, i }: { p: ProjectRow; i: number }) {
  const editable = !p.id.startsWith('static-')
  return (
    <Reveal delay={stag(i, 120, 70)}>
      <SpotlightCard glow={p.accent} className="flex h-full flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: `var(--${p.accent})` }} />
              <h3 className="text-base font-semibold tracking-tight text-foreground">{p.name}</h3>
            </div>
            <p className="mt-1 text-[13px] text-muted-foreground">{p.tag}</p>
          </div>
          <StatusBadge status={p.status} />
        </div>

        <div className="mt-5">
          <ProgressControl id={p.id} value={p.progress} accent={p.accent} editable={editable} />
        </div>

        <div className="mt-4 flex items-end justify-between">
          <div>
            <Label>{p.metricLabel}</Label>
            <p className="mt-1 font-mono text-xl text-foreground">{p.metric}</p>
          </div>
          <div className="flex flex-wrap justify-end gap-1.5">
            {p.stack.map((s) => (
              <StackChip key={s}>{s}</StackChip>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-1.5 border-t border-border pt-3 text-[11px] text-muted-foreground">
          <GitBranch size={12} /> <span>{p.activity}</span>
        </div>
      </SpotlightCard>
    </Reveal>
  )
}

export const meta = () => [{ title: 'Atlas · Projects' }]

export default function Projects() {
  const { items, forgeNote, forge } = useLoaderData<typeof loader>()
  const building = items.filter((p) => p.status === 'Building').length
  const avg = items.length ? Math.round(items.reduce((s, p) => s + p.progress, 0) / items.length) : 0

  return (
    <RevealContext.Provider value={false}>
      <div className="mx-auto max-w-screen-2xl">
        <PageHeader
          kicker="Projects"
          title="What I'm building"
          sub="Forge watches your repos and deploys, and tells you where the leverage is today."
          right={
            <div className="flex gap-6 md:justify-end">
              <div className="md:text-right">
                <Label>Building</Label>
                <p className="mt-1 font-mono text-2xl text-foreground">
                  <Num value={building} />
                </p>
              </div>
              <div className="md:text-right">
                <Label>Avg %</Label>
                <p className="mt-1 font-mono text-2xl text-foreground">
                  <Num value={avg} />
                </p>
              </div>
            </div>
          }
        />

        <div className="mt-7">
          <AgentSummary
            agent={forge}
            label="Build status · updated now"
            text={forgeNote}
            footer={
              <>
                <Check size={13} className="text-chart-2" /> Scanned 4 repos · Pavement nearing launch
              </>
            }
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {items.map((p, i) => (
            <ProjectCard key={p.id} p={p} i={i} />
          ))}
        </div>
      </div>
    </RevealContext.Provider>
  )
}
