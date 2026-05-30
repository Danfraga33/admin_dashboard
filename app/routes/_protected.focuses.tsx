import { useState } from 'react'
import { useFetcher, useLoaderData } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { motion, useReducedMotion } from 'framer-motion'
import { requireSession } from '~/lib/session.server'
import { Target, ArrowDown } from 'lucide-react'

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
    final_picture: 'Automations, Micro SaaS, Website Generation, AI Engineer - Heavy SaaS',
    position: 0,
  },
  {
    name: 'Build Business',
    final_picture: 'Build business using skills and build playbook',
    position: 1,
  },
  {
    name: 'Integrate Playbook',
    final_picture: 'Integrate Playbook into business acquisitions',
    position: 2,
  },
]

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

  return Response.json({ focuses: focuses ?? [] }, { headers: responseHeaders })
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

  return Response.json({ ok: true }, { headers: responseHeaders })
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
        className="w-full bg-input border border-border rounded-md px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none leading-relaxed"
      />
    )
  }

  return (
    <p
      onClick={() => { setEditing(true); setDraft(value) }}
      className={`cursor-text text-sm leading-relaxed ${value ? 'text-foreground' : 'text-muted-foreground/50 italic'}`}
    >
      {value || 'Click to add detail…'}
    </p>
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

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: reduce ? 0 : index * 0.15, ease: 'easeOut' }}
      className="relative w-full bg-card border border-border rounded-xl p-6 flex flex-col gap-3"
    >
      {saving && (
        <div className="absolute top-3 right-3 rounded-full bg-muted px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Saving…
        </div>
      )}

      <div className="flex items-center gap-3">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold shrink-0">
          {index + 1}
        </span>
        <h3 className="font-semibold text-base text-foreground leading-tight">{focus.name}</h3>
      </div>

      <div className="pl-11">
        <EditableBody value={body} onSave={save} />
      </div>
    </motion.div>
  )
}

// ─── Connector ────────────────────────────────────────────────────────────────
function FlowConnector({ index }: { index: number }) {
  const reduce = useReducedMotion()

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: reduce ? 0 : index * 0.15 + 0.25, ease: 'easeOut' }}
      className="flex items-center justify-center text-muted-foreground/60 py-2"
      aria-hidden
    >
      <ArrowDown className="w-5 h-5" />
    </motion.div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Focuses() {
  const { focuses } = useLoaderData<typeof loader>()
  const layers = focuses as Focus[]

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-6">
        <Target className="w-4 h-4" />
        <span>Strategy flow · {layers.length} layer{layers.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Flow */}
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
