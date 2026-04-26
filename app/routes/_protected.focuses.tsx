import { useState } from 'react'
import { useFetcher, useFetchers, useLoaderData } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { requireSession } from '~/lib/session.server'
import { Trash2, Plus, Target, Eye, ArrowRight } from 'lucide-react'

type Focus = {
  id: string
  name: string
  final_picture: string | null
  next_step: string | null
  position: number
  updated_at: string
}

type FocusValues = {
  name: string
  final_picture: string
  next_step: string
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, responseHeaders } = await requireSession(request)
  const { data: focuses } = await supabase
    .from('focuses')
    .select('*')
    .order('position', { ascending: true })
  return Response.json({ focuses: focuses ?? [] }, { headers: responseHeaders })
}

export async function action({ request }: ActionFunctionArgs) {
  const { session, supabase, responseHeaders } = await requireSession(request)
  const formData = await request.formData()
  const intent = String(formData.get('intent'))

  if (intent === 'create') {
    const { data: existing } = await supabase
      .from('focuses')
      .select('position')
      .order('position', { ascending: false })
      .limit(1)
    const nextPos = (existing?.[0]?.position ?? -1) + 1
    await supabase.from('focuses').insert({
      user_id: session.user.id,
      name: String(formData.get('name')),
      final_picture: String(formData.get('final_picture') || '') || null,
      next_step: String(formData.get('next_step') || '') || null,
      position: nextPos,
    })
  }

  if (intent === 'update') {
    await supabase
      .from('focuses')
      .update({
        name: String(formData.get('name')),
        final_picture: String(formData.get('final_picture') || '') || null,
        next_step: String(formData.get('next_step') || '') || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', String(formData.get('id')))
  }

  if (intent === 'delete') {
    await supabase.from('focuses').delete().eq('id', String(formData.get('id')))
  }

  return Response.json({ ok: true }, { headers: responseHeaders })
}

// ─── Field ────────────────────────────────────────────────────────────────────
function EditableField({
  value,
  placeholder,
  multiline = false,
  className = '',
  onSave,
}: {
  value: string
  placeholder: string
  multiline?: boolean
  className?: string
  onSave: (val: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  function commit() {
    setEditing(false)
    if (draft !== value) onSave(draft)
  }

  if (editing) {
    if (multiline) {
      return (
        <textarea
          autoFocus
          value={draft}
          rows={3}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Escape' && commit()}
          placeholder={placeholder}
          className={`w-full bg-input border border-border rounded-md px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none ${className}`}
        />
      )
    }
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === 'Escape') && commit()}
        placeholder={placeholder}
        className={`w-full bg-input border border-border rounded-md px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring ${className}`}
      />
    )
  }

  return (
    <span
      onClick={() => { setEditing(true); setDraft(value) }}
      className={`cursor-text block ${value ? '' : 'text-muted-foreground/50 italic'} ${className}`}
    >
      {value || placeholder}
    </span>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────
function FocusCard({ focus, status }: { focus: Focus; status?: 'saving' | 'creating' }) {
  const fetcher = useFetcher()
  const [values, setValues] = useState({
    name: focus.name,
    final_picture: focus.final_picture ?? '',
    next_step: focus.next_step ?? '',
  })

  function save(updated: Partial<typeof values>) {
    const next = { ...values, ...updated }
    setValues(next)
    fetcher.submit(
      { intent: 'update', id: focus.id, ...next },
      { method: 'post' },
    )
  }

  const isDeleting =
    fetcher.state !== 'idle' &&
    fetcher.formData?.get('intent') === 'delete'

  if (isDeleting) return null

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-5 relative group hover:border-border/80 transition-colors">
      {(status || fetcher.formData?.get('intent') === 'update') && (
        <div className="absolute top-3 left-3 rounded-full bg-muted px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {status === 'creating' ? 'Creating...' : 'Saving...'}
        </div>
      )}

      {/* Delete */}
      <fetcher.Form method="post" className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <input type="hidden" name="intent" value="delete" />
        <input type="hidden" name="id" value={focus.id} />
        <button
          type="submit"
          onClick={(e) => { if (!window.confirm('Delete this focus?')) e.preventDefault() }}
          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
          title="Delete focus"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </fetcher.Form>

      {/* Name */}
      <div className="pr-7">
        <EditableField
          value={values.name}
          placeholder="Focus name"
          className="font-semibold text-base text-foreground"
          onSave={(v) => save({ name: v })}
        />
      </div>

      {/* Final Picture */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
          <Eye className="w-3 h-3" />
          <span>Final Picture</span>
        </div>
        <EditableField
          value={values.final_picture}
          placeholder="What does success look like?"
          multiline
          className="text-sm text-foreground leading-relaxed"
          onSave={(v) => save({ final_picture: v })}
        />
      </div>

      {/* Next Step */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
          <ArrowRight className="w-3 h-3" />
          <span>Next Step</span>
        </div>
        <EditableField
          value={values.next_step}
          placeholder="What's the very next action?"
          multiline
          className="text-sm text-foreground leading-relaxed"
          onSave={(v) => save({ next_step: v })}
        />
      </div>
    </div>
  )
}

// ─── Add card ─────────────────────────────────────────────────────────────────
function AddFocusCard({ onCancel }: { onCancel: () => void }) {
  const fetcher = useFetcher()
  const [name, setName] = useState('')
  const [finalPicture, setFinalPicture] = useState('')
  const [nextStep, setNextStep] = useState('')

  const isSubmitting = fetcher.state !== 'idle'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    fetcher.submit(
      { intent: 'create', name: name.trim(), final_picture: finalPicture, next_step: nextStep },
      { method: 'post' },
    )
    onCancel()
  }

  return (
    <div className="bg-card border-2 border-dashed border-border rounded-xl p-5 flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Focus name"
          required
          className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
            <Eye className="w-3 h-3" />
            <span>Final Picture</span>
          </div>
          <textarea
            value={finalPicture}
            onChange={(e) => setFinalPicture(e.target.value)}
            placeholder="What does success look like?"
            rows={2}
            className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
            <ArrowRight className="w-3 h-3" />
            <span>Next Step</span>
          </div>
          <textarea
            value={nextStep}
            onChange={(e) => setNextStep(e.target.value)}
            placeholder="What's the very next action?"
            rows={2}
            className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        <div className="flex items-center gap-2 justify-end pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="px-4 py-1.5 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
          >
            Add Focus
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Focuses() {
  const { focuses } = useLoaderData<typeof loader>()
  const fetchers = useFetchers()
  const [showAdd, setShowAdd] = useState(false)

  const baseFocuses = (focuses as Focus[]).map((focus) => ({
    ...focus,
    final_picture: focus.final_picture ?? null,
    next_step: focus.next_step ?? null,
  }))

  const optimisticCreates = fetchers
    .filter((fetcher) => fetcher.state !== 'idle' && fetcher.formData?.get('intent') === 'create')
    .map((fetcher, index) => ({
      id: `optimistic-create-${index}`,
      name: String(fetcher.formData?.get('name') ?? ''),
      final_picture: String(fetcher.formData?.get('final_picture') ?? '') || null,
      next_step: String(fetcher.formData?.get('next_step') ?? '') || null,
      position: baseFocuses.length + index,
      updated_at: new Date().toISOString(),
      optimisticStatus: 'creating' as const,
    }))

  const optimisticDeletes = new Set(
    fetchers
      .filter((fetcher) => fetcher.state !== 'idle' && fetcher.formData?.get('intent') === 'delete')
      .map((fetcher) => String(fetcher.formData?.get('id'))),
  )

  const optimisticUpdates = new Map(
    fetchers
      .filter((fetcher) => fetcher.state !== 'idle' && fetcher.formData?.get('intent') === 'update')
      .map((fetcher) => [
        String(fetcher.formData?.get('id')),
        {
          name: String(fetcher.formData?.get('name') ?? ''),
          final_picture: String(fetcher.formData?.get('final_picture') ?? '') || null,
          next_step: String(fetcher.formData?.get('next_step') ?? '') || null,
          updated_at: new Date().toISOString(),
        },
      ]),
  )

  const visibleFocuses = [...baseFocuses, ...optimisticCreates]
    .filter((focus) => !optimisticDeletes.has(focus.id))
    .map((focus) => {
      const pendingUpdate = optimisticUpdates.get(focus.id)

      if (!pendingUpdate) {
        return focus
      }

      return {
        ...focus,
        ...pendingUpdate,
        optimisticStatus: 'saving' as const,
      }
    })
    .sort((left, right) => left.position - right.position)

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Target className="w-4 h-4" />
          <span>{visibleFocuses.length} focus{visibleFocuses.length !== 1 ? 'es' : ''}</span>
        </div>
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Focus
          </button>
        )}
      </div>

      {/* Board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleFocuses.map((focus) => (
          <FocusCard
            key={focus.id}
            focus={focus}
            status={'optimisticStatus' in focus ? focus.optimisticStatus : undefined}
          />
        ))}
        {showAdd && <AddFocusCard onCancel={() => setShowAdd(false)} />}
        {visibleFocuses.length === 0 && !showAdd && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
            <Target className="w-10 h-10 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">No focuses yet</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Add your first focus to get started.</p>
          </div>
        )}
      </div>
    </div>
  )
}
