import { useState } from 'react'
import { useLoaderData, useFetcher } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { requireSession } from '~/lib/session.server'
import { X, Pencil, Trash2, Plus } from 'lucide-react'

interface Deal {
  id: string
  name: string
  sector: string
  revenue_range: string
  ebitda: string
  asking_price: string
  model: string
  location: string
  status: string
  notes: string
}

const STATUS_COLORS: Record<string, string> = {
  Watching: 'badge-outline',
  Contacted: 'badge-info',
  'In Diligence': 'badge-warning',
  Passed: 'badge-ghost',
  Rejected: 'badge-error',
}

const STATUSES = ['Watching', 'Contacted', 'In Diligence', 'Passed', 'Rejected']

const EMPTY_DEAL = {
  name: '',
  sector: '',
  revenue_range: '',
  ebitda: '',
  asking_price: '',
  model: '',
  location: '',
  status: 'Watching',
  notes: '',
}

type ModalMode = 'view' | 'edit' | 'add' | 'confirm-delete'

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, responseHeaders } = await requireSession(request)
  const { data: deals } = await supabase
    .from('pipeline_deals')
    .select('*')
    .order('created_at', { ascending: false })
  return Response.json({ deals: deals ?? [] }, { headers: responseHeaders })
}

export async function action({ request }: ActionFunctionArgs) {
  const { session, supabase, responseHeaders } = await requireSession(request)
  const formData = await request.formData()
  const intent = formData.get('intent')

  if (intent === 'create') {
    await supabase.from('pipeline_deals').insert({
      user_id: session.user.id,
      name: String(formData.get('name') || ''),
      sector: String(formData.get('sector') || ''),
      revenue_range: String(formData.get('revenue_range') || ''),
      ebitda: String(formData.get('ebitda') || ''),
      asking_price: String(formData.get('asking_price') || ''),
      model: String(formData.get('model') || ''),
      location: String(formData.get('location') || ''),
      status: String(formData.get('status') || 'Watching'),
      notes: String(formData.get('notes') || ''),
    })
  }

  if (intent === 'update') {
    await supabase.from('pipeline_deals').update({
      name: String(formData.get('name') || ''),
      sector: String(formData.get('sector') || ''),
      revenue_range: String(formData.get('revenue_range') || ''),
      ebitda: String(formData.get('ebitda') || ''),
      asking_price: String(formData.get('asking_price') || ''),
      model: String(formData.get('model') || ''),
      location: String(formData.get('location') || ''),
      status: String(formData.get('status') || 'Watching'),
      notes: String(formData.get('notes') || ''),
    }).eq('id', String(formData.get('id')))
  }

  if (intent === 'delete') {
    await supabase.from('pipeline_deals').delete().eq('id', String(formData.get('id')))
  }

  return Response.json({}, { headers: responseHeaders })
}

export default function Pipeline() {
  const { deals } = useLoaderData<typeof loader>()
  const fetcher = useFetcher()
  const [selected, setSelected] = useState<Deal | null>(null)
  const [mode, setMode] = useState<ModalMode>('view')
  const [draft, setDraft] = useState(EMPTY_DEAL)

  // Optimistic: filter out deleted, add optimistic creates
  const pending = fetcher.formData
  const pendingIntent = pending?.get('intent')
  const pendingId = pending?.get('id')

  const liveDealsList = (deals as Deal[]).filter((d) => {
    if (pendingIntent === 'delete' && pendingId === d.id) return false
    return true
  })

  function openView(deal: Deal) {
    setSelected(deal)
    setMode('view')
  }

  function openEdit(deal: Deal) {
    setSelected(deal)
    setDraft({
      name: deal.name,
      sector: deal.sector,
      revenue_range: deal.revenue_range,
      ebitda: deal.ebitda,
      asking_price: deal.asking_price,
      model: deal.model,
      location: deal.location,
      status: deal.status,
      notes: deal.notes,
    })
    setMode('edit')
  }

  function openAdd() {
    setSelected(null)
    setDraft({ ...EMPTY_DEAL })
    setMode('add')
  }

  function closeModal() {
    setSelected(null)
    setMode('view')
  }

  function submitSave() {
    const fd = new FormData()
    if (mode === 'add') {
      fd.set('intent', 'create')
    } else if (selected) {
      fd.set('intent', 'update')
      fd.set('id', selected.id)
    }
    fd.set('name', draft.name)
    fd.set('sector', draft.sector)
    fd.set('revenue_range', draft.revenue_range)
    fd.set('ebitda', draft.ebitda)
    fd.set('asking_price', draft.asking_price)
    fd.set('model', draft.model)
    fd.set('location', draft.location)
    fd.set('status', draft.status)
    fd.set('notes', draft.notes)
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

  const grouped = STATUSES.reduce<Record<string, Deal[]>>((acc, status) => {
    acc[status] = liveDealsList.filter((d) => d.status === status)
    return acc
  }, {} as Record<string, Deal[]>)

  return (
    <div>
      <div className="flex items-start justify-between mb-10">
        <div>
          <h1 className="font-display text-4xl text-foreground mb-1 tracking-wide">Pipeline</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Active deal pipeline and inbound opportunities.
          </p>
        </div>
        <button type="button" onClick={openAdd} className="btn btn-sm gap-2 bg-primary text-primary-foreground border-0 hover:bg-primary/90">
          <Plus size={15} />
          Add Deal
        </button>
      </div>

      {liveDealsList.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-14 text-center">
          <p className="font-display text-xl text-foreground mb-2 tracking-wide">No deals yet.</p>
          <p className="text-muted-foreground text-sm">Add your first deal above.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {STATUSES.map((status) => {
            const group = grouped[status]
            if (group.length === 0) return null
            return (
              <div key={status}>
                <div className="flex items-center gap-3 mb-4">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">{status}</p>
                  <span className="text-[11px] text-muted-foreground/50">{group.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {group.map((deal) => (
                    <div key={deal.id} className="relative bg-card border border-border rounded-lg p-6 transition-all hover:border-primary/40 hover:shadow-[0_0_20px_rgba(200,170,110,0.06)] group">
                      <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button type="button" onClick={() => openEdit(deal)} className="btn btn-xs btn-ghost btn-circle text-muted-foreground hover:text-foreground" title="Edit"><Pencil size={13} /></button>
                        <button type="button" onClick={() => { setSelected(deal); setMode('confirm-delete') }} className="btn btn-xs btn-ghost btn-circle text-muted-foreground hover:text-error" title="Delete"><Trash2 size={13} /></button>
                      </div>
                      <button type="button" onClick={() => openView(deal)} className="w-full text-left cursor-pointer">
                        <div className="mb-4">
                          <h3 className="font-display text-lg text-foreground tracking-wide leading-snug group-hover:text-primary transition-colors pr-12 mb-1">{deal.name}</h3>
                          <span className={`badge badge-sm ${STATUS_COLORS[deal.status] ?? 'badge-outline'}`}>{deal.status}</span>
                        </div>
                        <div className="space-y-2">
                          <Row label="Sector" value={deal.sector} />
                          <Row label="Revenue" value={deal.revenue_range} />
                          <Row label="Asking Price" value={deal.asking_price} />
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      <dialog className={`modal ${isOpen ? 'modal-open' : ''}`}>
        <div className="modal-box bg-card border border-border max-w-lg">
          {mode === 'view' && selected && (
            <>
              <ModalHeader title={selected.name} onClose={closeModal} />
              <span className={`badge badge-sm mb-6 ${STATUS_COLORS[selected.status] ?? 'badge-outline'}`}>{selected.status}</span>
              <div className="space-y-4">
                <DetailRow label="Name" value={selected.name} />
                <div className="divider my-0 before:bg-border after:bg-border" />
                <DetailRow label="Sector" value={selected.sector} />
                <DetailRow label="Business Model" value={selected.model} />
                <DetailRow label="Location" value={selected.location} />
                <div className="divider my-0 before:bg-border after:bg-border" />
                <DetailRow label="Revenue Range" value={selected.revenue_range} />
                <DetailRow label="EBITDA" value={selected.ebitda} />
                <DetailRow label="Asking Price" value={selected.asking_price} />
                {selected.notes && (<><div className="divider my-0 before:bg-border after:bg-border" /><DetailRow label="Notes" value={selected.notes} long /></>)}
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
              <ModalHeader title={mode === 'add' ? 'Add Deal' : 'Edit Deal'} onClose={closeModal} />
              <div className="space-y-4">
                <Field label="Deal Name" value={draft.name} onChange={(v) => setDraft((d) => ({ ...d, name: v }))} />
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-1.5">Status</p>
                  <select value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="divider my-0 before:bg-border after:bg-border" />
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Sector" value={draft.sector} onChange={(v) => setDraft((d) => ({ ...d, sector: v }))} />
                  <Field label="Business Model" value={draft.model} onChange={(v) => setDraft((d) => ({ ...d, model: v }))} placeholder="e.g. Subscription" />
                </div>
                <Field label="Location" value={draft.location} onChange={(v) => setDraft((d) => ({ ...d, location: v }))} placeholder="e.g. AU / US" />
                <div className="divider my-0 before:bg-border after:bg-border" />
                <Field label="Revenue Range" value={draft.revenue_range} onChange={(v) => setDraft((d) => ({ ...d, revenue_range: v }))} placeholder="e.g. $200k – $500k ARR" />
                <div className="grid grid-cols-2 gap-4">
                  <Field label="EBITDA" value={draft.ebitda} onChange={(v) => setDraft((d) => ({ ...d, ebitda: v }))} placeholder="e.g. $80k – $150k" />
                  <Field label="Asking Price" value={draft.asking_price} onChange={(v) => setDraft((d) => ({ ...d, asking_price: v }))} placeholder="e.g. $1M – $2M" />
                </div>
                <div className="divider my-0 before:bg-border after:bg-border" />
                <Field label="Notes" value={draft.notes} onChange={(v) => setDraft((d) => ({ ...d, notes: v }))} multiline />
              </div>
              <div className="modal-action">
                <button type="button" onClick={closeModal} className="btn btn-sm bg-secondary text-secondary-foreground border-border hover:bg-secondary/80">Cancel</button>
                <button type="button" onClick={submitSave} disabled={!draft.name.trim()} className="btn btn-sm bg-primary text-primary-foreground border-0 hover:bg-primary/90 disabled:opacity-40">{mode === 'add' ? 'Add Deal' : 'Save Changes'}</button>
              </div>
            </>
          )}

          {mode === 'confirm-delete' && selected && (
            <>
              <ModalHeader title="Delete Deal" onClose={closeModal} />
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

function Row({ label, value }: { label: string; value: string }) {
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

function Field({ label, value, onChange, placeholder, multiline }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean }) {
  const cls = 'w-full bg-input border border-border rounded-md px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring'
  return (
    <div>
      <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-1.5">{label}</p>
      {multiline ? <textarea className={`${cls} resize-none`} rows={3} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} /> : <input type="text" className={cls} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />}
    </div>
  )
}
