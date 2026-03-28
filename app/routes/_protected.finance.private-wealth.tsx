import { useState } from 'react'
import { useLoaderData, useFetcher } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { requireSession } from '~/lib/session.server'
import { X, Pencil, Trash2, Plus } from 'lucide-react'

interface Lender {
  id: string
  name: string
  lvr_limit: string
  lvr_min: string
  rates_approx: string
  terms: string
  min_withdraw: string
  restrictions: string
}

const EMPTY_LENDER = {
  name: '',
  lvr_limit: '',
  lvr_min: '',
  rates_approx: '',
  terms: '',
  min_withdraw: '',
  restrictions: '',
}

type ModalMode = 'view' | 'edit' | 'add' | 'confirm-delete'

// --- Formatting helpers ---

/** Format a raw number string as currency: 500000 → $500,000 */
function formatCurrency(raw: string): string {
  const digits = raw.replace(/[^0-9.]/g, '')
  if (!digits) return raw // leave non-numeric strings as-is (already formatted)
  const num = parseFloat(digits)
  if (isNaN(num)) return raw
  return '$' + num.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

/** Format a raw value as percent, handling ranges: 2.5-4.5 → 2.5% – 4.5% */
function formatPercent(raw: string): string {
  if (!raw.trim()) return raw
  // Split on common range separators: -, –, —, "to"
  const parts = raw.split(/\s*[-–—]|[\s]+to[\s]+/i).map((p) => p.trim()).filter(Boolean)
  if (parts.length === 2) {
    const [a, b] = parts.map((p) => {
      const clean = p.replace(/[^0-9.]/g, '')
      return clean ? clean + '%' : p
    })
    return `${a} – ${b}`
  }
  // Single value
  if (raw.includes('%')) return raw
  const digits = raw.replace(/[^0-9.]/g, '')
  if (!digits) return raw
  return digits + '%'
}

/** Strip formatting back to raw number for editing */
function stripToDigits(val: string): string {
  // Keep dots for decimals and dashes for ranges
  return val.replace(/[$,%\s]/g, '')
}

// --- Loader / Action ---

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, responseHeaders } = await requireSession(request)
  const { data: lenders } = await supabase
    .from('lenders')
    .select('*')
    .order('created_at', { ascending: true })
  return Response.json({ lenders: lenders ?? [] }, { headers: responseHeaders })
}

export async function action({ request }: ActionFunctionArgs) {
  const { session, supabase, responseHeaders } = await requireSession(request)
  const formData = await request.formData()
  const intent = formData.get('intent')

  if (intent === 'create') {
    await supabase.from('lenders').insert({
      user_id: session.user.id,
      name: String(formData.get('name') || ''),
      lvr_limit: String(formData.get('lvr_limit') || ''),
      lvr_min: String(formData.get('lvr_min') || ''),
      rates_approx: String(formData.get('rates_approx') || ''),
      terms: String(formData.get('terms') || ''),
      min_withdraw: String(formData.get('min_withdraw') || ''),
      restrictions: String(formData.get('restrictions') || ''),
    })
  }

  if (intent === 'update') {
    await supabase.from('lenders').update({
      name: String(formData.get('name') || ''),
      lvr_limit: String(formData.get('lvr_limit') || ''),
      lvr_min: String(formData.get('lvr_min') || ''),
      rates_approx: String(formData.get('rates_approx') || ''),
      terms: String(formData.get('terms') || ''),
      min_withdraw: String(formData.get('min_withdraw') || ''),
      restrictions: String(formData.get('restrictions') || ''),
    }).eq('id', String(formData.get('id')))
  }

  if (intent === 'delete') {
    await supabase.from('lenders').delete().eq('id', String(formData.get('id')))
  }

  return Response.json({}, { headers: responseHeaders })
}

// --- Component ---

export default function PrivateWealth() {
  const { lenders } = useLoaderData<typeof loader>()
  const fetcher = useFetcher()
  const [selected, setSelected] = useState<Lender | null>(null)
  const [mode, setMode] = useState<ModalMode>('view')
  const [draft, setDraft] = useState(EMPTY_LENDER)

  const pending = fetcher.formData
  const pendingIntent = pending?.get('intent') as string | null
  const pendingId = pending?.get('id') as string | null

  // Build optimistic lender list
  let liveLenders = (lenders as Lender[]).slice()

  if (pendingIntent === 'delete' && pendingId) {
    liveLenders = liveLenders.filter((l) => l.id !== pendingId)
  }

  if (pendingIntent === 'update' && pendingId && pending) {
    liveLenders = liveLenders.map((l) =>
      l.id === pendingId
        ? {
            ...l,
            name: String(pending.get('name') || l.name),
            lvr_limit: String(pending.get('lvr_limit') || l.lvr_limit),
            lvr_min: String(pending.get('lvr_min') || l.lvr_min),
            rates_approx: String(pending.get('rates_approx') || l.rates_approx),
            terms: String(pending.get('terms') || l.terms),
            min_withdraw: String(pending.get('min_withdraw') || l.min_withdraw),
            restrictions: String(pending.get('restrictions') || l.restrictions),
          }
        : l
    )
  }

  if (pendingIntent === 'create' && pending) {
    const optimistic: Lender = {
      id: '__optimistic__',
      name: String(pending.get('name') || ''),
      lvr_limit: String(pending.get('lvr_limit') || ''),
      lvr_min: String(pending.get('lvr_min') || ''),
      rates_approx: String(pending.get('rates_approx') || ''),
      terms: String(pending.get('terms') || ''),
      min_withdraw: String(pending.get('min_withdraw') || ''),
      restrictions: String(pending.get('restrictions') || ''),
    }
    liveLenders = [...liveLenders, optimistic]
  }

  function openView(lender: Lender) {
    setSelected(lender)
    setMode('view')
  }

  function openEdit(lender: Lender) {
    setSelected(lender)
    setDraft({
      name: lender.name,
      lvr_limit: stripToDigits(lender.lvr_limit),
      lvr_min: stripToDigits(lender.lvr_min),
      rates_approx: stripToDigits(lender.rates_approx),
      terms: lender.terms,
      min_withdraw: stripToDigits(lender.min_withdraw),
      restrictions: lender.restrictions,
    })
    setMode('edit')
  }

  function openAdd() {
    setSelected(null)
    setDraft({ ...EMPTY_LENDER })
    setMode('add')
  }

  function closeModal() {
    setSelected(null)
    setMode('view')
  }

  function submitSave() {
    const formatted = {
      name: draft.name,
      lvr_limit: formatPercent(draft.lvr_limit),
      lvr_min: formatPercent(draft.lvr_min),
      rates_approx: formatPercent(draft.rates_approx),
      terms: draft.terms,
      min_withdraw: formatCurrency(draft.min_withdraw),
      restrictions: draft.restrictions,
    }

    const fd = new FormData()
    if (mode === 'add') {
      fd.set('intent', 'create')
    } else if (selected) {
      fd.set('intent', 'update')
      fd.set('id', selected.id)
    }
    fd.set('name', formatted.name)
    fd.set('lvr_limit', formatted.lvr_limit)
    fd.set('lvr_min', formatted.lvr_min)
    fd.set('rates_approx', formatted.rates_approx)
    fd.set('terms', formatted.terms)
    fd.set('min_withdraw', formatted.min_withdraw)
    fd.set('restrictions', formatted.restrictions)
    fetcher.submit(fd, { method: 'post' })
    closeModal()
  }

  function submitDelete() {
    if (!selected) return
    const fd = new FormData()
    fd.set('intent', 'delete')
    fd.set('id', selected.id)
    fetcher.submit(fd, { method: 'post' })
    closeModal()
  }

  const isOpen = selected !== null || mode === 'add'

  return (
    <div>
      <div className="flex items-start justify-between mb-10">
        <div>
          <h1 className="font-display text-4xl text-foreground mb-1 tracking-wide">Private Wealth</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Lending facilities and margin products across private wealth providers.
          </p>
        </div>
        <button type="button" onClick={openAdd} className="btn btn-sm gap-2 bg-primary text-primary-foreground border-0 hover:bg-primary/90">
          <Plus size={15} />
          Add Lender
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {liveLenders.map((lender) => {
          const isOptimistic = lender.id === '__optimistic__'
          return (
            <div
              key={lender.id}
              className={`relative bg-card border border-border rounded-lg p-6 transition-all hover:border-primary/40 hover:shadow-[0_0_20px_rgba(200,170,110,0.06)] group ${isOptimistic ? 'opacity-60' : ''}`}
            >
              {!isOptimistic && (
                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button type="button" onClick={() => openEdit(lender)} className="btn btn-xs btn-ghost btn-circle text-muted-foreground hover:text-foreground" title="Edit"><Pencil size={13} /></button>
                  <button type="button" onClick={() => { setSelected(lender); setMode('confirm-delete') }} className="btn btn-xs btn-ghost btn-circle text-muted-foreground hover:text-error" title="Delete"><Trash2 size={13} /></button>
                </div>
              )}
              <button type="button" onClick={() => !isOptimistic && openView(lender)} className="w-full text-left cursor-pointer">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <h3 className="font-display text-lg text-foreground tracking-wide leading-snug group-hover:text-primary transition-colors pr-12">{lender.name}</h3>
                </div>
                <div className="space-y-2">
                  <CardRow label="LVR Limit" value={lender.lvr_limit} />
                  <CardRow label="Rates" value={lender.rates_approx} />
                  <CardRow label="Min Withdraw" value={lender.min_withdraw} />
                </div>
              </button>
            </div>
          )
        })}

        {liveLenders.length === 0 && (
          <div className="col-span-full bg-card border border-border rounded-lg p-14 text-center">
            <p className="font-display text-xl text-foreground mb-2 tracking-wide">No lenders yet.</p>
            <p className="text-muted-foreground text-sm">Add your first private wealth provider above.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <dialog className={`modal ${isOpen ? 'modal-open' : ''}`}>
        <div className="modal-box bg-card border border-border max-w-lg">
          {mode === 'view' && selected && (
            <>
              <ModalHeader title={selected.name} onClose={closeModal} />
              <div className="space-y-4">
                <DetailRow label="Name" value={selected.name} />
                <div className="divider my-0 before:bg-border after:bg-border" />
                <DetailRow label="LVR Limit" value={selected.lvr_limit} />
                <DetailRow label="LVR Min" value={selected.lvr_min} />
                <div className="divider my-0 before:bg-border after:bg-border" />
                <DetailRow label="Rates Approx" value={selected.rates_approx} />
                <DetailRow label="Terms" value={selected.terms} />
                <div className="divider my-0 before:bg-border after:bg-border" />
                <DetailRow label="Min Withdraw Amount" value={selected.min_withdraw} />
                <DetailRow label="Restrictions" value={selected.restrictions} long />
              </div>
              <div className="modal-action">
                <button type="button" onClick={() => setMode('confirm-delete')} className="btn btn-sm btn-ghost text-error hover:bg-error/10 mr-auto"><Trash2 size={14} />Delete</button>
                <button type="button" onClick={closeModal} className="btn btn-sm bg-secondary text-secondary-foreground border-border hover:bg-secondary/80">Close</button>
                <button type="button" onClick={() => openEdit(selected)} className="btn btn-sm bg-primary text-primary-foreground border-0 hover:bg-primary/90"><Pencil size={14} />Edit</button>
              </div>
            </>
          )}

          {(mode === 'edit' || mode === 'add') && (
            <>
              <ModalHeader title={mode === 'add' ? 'Add Lender' : 'Edit Lender'} onClose={closeModal} />
              <div className="space-y-4">
                <Field label="Name" value={draft.name} onChange={(v) => setDraft((d) => ({ ...d, name: v }))} />
                <div className="divider my-0 before:bg-border after:bg-border" />
                <div className="grid grid-cols-2 gap-4">
                  <Field label="LVR Limit" value={draft.lvr_limit} onChange={(v) => setDraft((d) => ({ ...d, lvr_limit: v }))} placeholder="e.g. 70" suffix="%" />
                  <Field label="LVR Min" value={draft.lvr_min} onChange={(v) => setDraft((d) => ({ ...d, lvr_min: v }))} placeholder="e.g. 40" suffix="%" />
                </div>
                <div className="divider my-0 before:bg-border after:bg-border" />
                <Field label="Rates Approx" value={draft.rates_approx} onChange={(v) => setDraft((d) => ({ ...d, rates_approx: v }))} placeholder="e.g. 6.2 – 7.1" suffix='%' />
                <Field label="Terms" value={draft.terms} onChange={(v) => setDraft((d) => ({ ...d, terms: v }))} />
                <div className="divider my-0 before:bg-border after:bg-border" />
                <Field label="Min Withdraw Amount" value={draft.min_withdraw} onChange={(v) => setDraft((d) => ({ ...d, min_withdraw: v }))} placeholder="e.g. 500000" prefix="$" />
                <Field label="Restrictions" value={draft.restrictions} onChange={(v) => setDraft((d) => ({ ...d, restrictions: v }))} multiline />
              </div>
              <div className="modal-action">
                <button type="button" onClick={closeModal} className="btn btn-sm bg-secondary text-secondary-foreground border-border hover:bg-secondary/80">Cancel</button>
                <button type="button" onClick={submitSave} disabled={!draft.name.trim()} className="btn btn-sm bg-primary text-primary-foreground border-0 hover:bg-primary/90 disabled:opacity-40">{mode === 'add' ? 'Add Lender' : 'Save Changes'}</button>
              </div>
            </>
          )}

          {mode === 'confirm-delete' && selected && (
            <>
              <ModalHeader title="Delete Lender" onClose={closeModal} />
              <p className="text-sm text-muted-foreground leading-relaxed mb-2">Are you sure you want to remove <span className="text-foreground font-medium">{selected.name}</span>?</p>
              <p className="text-xs text-muted-foreground">This cannot be undone.</p>
              <div className="modal-action">
                <button type="button" onClick={() => setMode('view')} className="btn btn-sm bg-secondary text-secondary-foreground border-border hover:bg-secondary/80">Cancel</button>
                <button type="button" onClick={submitDelete} className="btn btn-sm bg-error text-white border-0 hover:bg-error/90">Delete</button>
              </div>
            </>
          )}
        </div>
        <form method="dialog" className="modal-backdrop"><button type="button" onClick={closeModal}>close</button></form>
      </dialog>
    </div>
  )
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <h3 className="font-display text-2xl text-foreground tracking-wide">{title}</h3>
      <button type="button" onClick={onClose} className="btn btn-sm btn-ghost btn-circle text-muted-foreground hover:text-foreground"><X size={18} /></button>
    </div>
  )
}

function CardRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-foreground">{value}</span>
    </div>
  )
}

function DetailRow({ label, value, long }: { label: string; value: string; long?: boolean }) {
  return (
    <div className={long ? '' : 'flex items-center justify-between'}>
      <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
      <p className={`font-mono text-foreground ${long ? 'text-sm leading-relaxed' : 'text-sm'}`}>{value}</p>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, multiline, prefix, suffix }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  multiline?: boolean
  prefix?: string
  suffix?: string
}) {
  const cls = 'w-full bg-input border border-border rounded-md px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring'

  if (multiline) {
    return (
      <div>
        <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-1.5">{label}</p>
        <textarea className={`${cls} resize-none`} rows={3} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      </div>
    )
  }

  if (prefix || suffix) {
    return (
      <div>
        <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-1.5">{label}</p>
        <div className="flex items-center bg-input border border-border rounded-md focus-within:ring-1 focus-within:ring-ring overflow-hidden">
          {prefix && <span className="pl-3 text-sm font-mono text-muted-foreground select-none">{prefix}</span>}
          <input
            type="text"
            className="flex-1 bg-transparent px-2 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
          {suffix && <span className="pr-3 text-sm font-mono text-muted-foreground select-none">{suffix}</span>}
        </div>
      </div>
    )
  }

  return (
    <div>
      <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-1.5">{label}</p>
      <input type="text" className={cls} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}
