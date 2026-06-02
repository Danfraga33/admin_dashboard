import { useState } from 'react'
import { data, useFetcher, useLoaderData } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { motion, useReducedMotion } from 'framer-motion'
import { requireSession } from '~/lib/session.server'
import { Target } from 'lucide-react'

type Focus = {
  id: string
  name: string
  final_picture: string | null
  next_step: string | null
  position: number
  updated_at: string
}

const SEED: Array<{ name: string; final_picture: string; position: number }> = [
  {
    name: 'Learn AI',
    final_picture:
      'Master the highest-leverage skill: AI workflows, orchestration, agentic systems, RAG. Build a SWE AI-agent business. Outputs: automations, micro-SaaS, website generation, AI-engineer-grade heavy SaaS. Go deep — advanced agentic patterns, multi-agent orchestration, evals.',
    position: 0,
  },
  {
    name: 'Build Business',
    final_picture:
      'Pick a domain with an unfair advantage (B2B, ecommerce). Ship real businesses to learn the playbook by doing. Fail fast, learn fast. Distribution and cashflow first — revenue teaches what theory can’t.',
    position: 1,
  },
  {
    name: 'Integrate Playbook',
    final_picture:
      'Acquire SaaS (Dan Martell model). Apply the operating playbook to what you buy. Ownership as the output of stages 1–2.',
    position: 2,
  },
]

// Short uppercase tracked label per stage, keyed by position.
const STAGE_LABELS = ['SKILL', 'CASHFLOW', 'OWNERSHIP']

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, supabase, responseHeaders } = await requireSession(request)

  let { data: focuses } = await supabase
    .from('focuses')
    .select('*')
    .order('position', { ascending: true })

  // Seed the three strategy layers once, when the board is empty.
  if ((focuses?.length ?? 0) === 0 && session?.user?.id) {
    await supabase
      .from('focuses')
      .insert(SEED.map((layer) => ({ ...layer, user_id: session.user.id })))

    const reloaded = await supabase
      .from('focuses')
      .select('*')
      .order('position', { ascending: true })
    focuses = reloaded.data
  }

  return data({ focuses: focuses ?? [] }, { headers: responseHeaders })
}

export async function action({ request }: ActionFunctionArgs) {
  const { supabase, responseHeaders } = await requireSession(request)
  const formData = await request.formData()

  if (String(formData.get('intent')) === 'update') {
    await supabase
      .from('focuses')
      .update({
        final_picture: String(formData.get('final_picture') || '') || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', String(formData.get('id')))
  }

  return data({ ok: true }, { headers: responseHeaders })
}

// ─── Editable body ────────────────────────────────────────────────────────────
function EditableBody({ value, onSave }: { value: string; onSave: (val: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  function commit() {
    setEditing(false)
    if (draft !== value) onSave(draft)
  }

  if (editing) {
    return (
      <textarea
        autoFocus
        value={draft}
        rows={3}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Escape') commit()
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) commit()
        }}
        className="w-full bg-input border border-border rounded-md px-3 py-2 text-[15px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none leading-relaxed"
      />
    )
  }

  return (
    <p
      onClick={() => { setEditing(true); setDraft(value) }}
      className={`cursor-text text-[15px] leading-relaxed ${value ? 'text-muted-foreground' : 'text-muted-foreground/40 italic'}`}
    >
      {value || 'Click to add detail…'}
    </p>
  )
}

// ─── North Star banner ──────────────────────────────────────────────────────
function NorthStar() {
  const reduce = useReducedMotion()

  return (
    <motion.header
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="max-w-2xl mx-auto pt-4 pb-14 text-center"
    >
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-4">North Star</p>
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground leading-tight text-balance">
        Build leverage — skill → cashflow → ownership.
      </h1>
      <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
        Fail fast, learn fast → distribution, cashflow.
      </p>
    </motion.header>
  )
}

// ─── Flow step ──────────────────────────────────────────────────────────────
function FlowStep({ focus, index }: { focus: Focus; index: number }) {
  const reduce = useReducedMotion()
  const fetcher = useFetcher()
  const [body, setBody] = useState(focus.final_picture ?? '')

  function save(val: string) {
    setBody(val)
    fetcher.submit({ intent: 'update', id: focus.id, final_picture: val }, { method: 'post' })
  }

  const saving = fetcher.state !== 'idle'
  const num = String(index + 1).padStart(2, '0')
  const stage = STAGE_LABELS[index] ?? focus.name.toUpperCase()

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={reduce ? undefined : { y: -2 }}
      transition={{ duration: 0.4, delay: reduce ? 0 : index * 0.15, ease: 'easeOut' }}
      className="group relative w-full bg-card border border-border rounded-xl p-6 sm:p-7 shadow-sm transition-shadow hover:shadow-md"
    >
      {saving && (
        <div className="absolute top-3 right-3 rounded-full bg-muted px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Saving…
        </div>
      )}

      <div className="flex items-start gap-5">
        <span
          className="font-mono text-4xl sm:text-5xl font-medium leading-none text-chart-1 tabular-nums shrink-0"
          aria-hidden
        >
          {num}
        </span>

        <div className="flex flex-col gap-2 min-w-0">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            {num} — {stage}
          </p>
          <h3 className="font-semibold text-lg text-foreground leading-tight tracking-tight">
            {focus.name}
          </h3>
          <div className="mt-1">
            <EditableBody value={body} onSave={save} />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Connector ────────────────────────────────────────────────────────────────
// Thin vertical progress line, drawn in on mount (scaleY, origin-top).
function FlowConnector({ index }: { index: number }) {
  const reduce = useReducedMotion()

  return (
    <div className="flex justify-start pl-[2.4rem] sm:pl-[2.9rem]" aria-hidden>
      <motion.div
        initial={reduce ? false : { scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.45, delay: reduce ? 0 : index * 0.15 + 0.3, ease: 'easeOut' }}
        style={{ originY: 0 }}
        className="w-px h-8 bg-chart-1/40"
      />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export const meta = () => [{ title: 'Atlas · Focuses' }]

export default function Focuses() {
  const { focuses } = useLoaderData<typeof loader>()
  const layers = focuses as Focus[]

  return (
    <div>
      <NorthStar />

      {layers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Target className="w-10 h-10 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-medium">No focuses yet</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Add layers in Supabase to populate the flow.</p>
        </div>
      ) : (
        <div className="flex flex-col items-stretch max-w-2xl mx-auto">
          {layers.map((focus, index) => (
            <div key={focus.id}>
              <FlowStep focus={focus} index={index} />
              {index < layers.length - 1 && <FlowConnector index={index} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
