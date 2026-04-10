import { useState } from 'react'
import { useLoaderData, useFetcher } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { requireSession } from '~/lib/session.server'
import { X, Pencil, Trash2, Plus } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import type { Vertical } from './_protected.deals'

interface Deal {
  id: string
  name: string
  sector: string
  vertical: string
  revenue_range: string
  ebitda: string
  asking_price: string
  model: string
  location: string
  status: string
  notes: string
}

const STATUS_COLORS: Record<string, string> = {
  Watching: 'bg-muted text-muted-foreground',
  Contacted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'In Diligence': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Passed: 'bg-secondary text-secondary-foreground',
  Rejected: 'bg-destructive/10 text-destructive',
}

const STATUSES = ['Watching', 'Contacted', 'In Diligence', 'Passed', 'Rejected']

const EMPTY_DEAL = {
  name: '',
  sector: '',
  vertical: '',
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
  const [{ data: deals }, { data: verticals }] = await Promise.all([
    supabase.from('pipeline_deals').select('*').order('created_at', { ascending: false }),
    supabase.from('verticals').select('id, name, verdict').order('verdict').order('name'),
  ])
  return Response.json({ deals: deals ?? [], verticals: (verticals ?? []) as Pick<Vertical, 'id' | 'name' | 'verdict'>[] }, { headers: responseHeaders })
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
      vertical: String(formData.get('vertical') || ''),
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
      vertical: String(formData.get('vertical') || ''),
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
  const { deals, verticals } = useLoaderData<typeof loader>()
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
      vertical: deal.vertical || '',
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
    fd.set('vertical', draft.vertical)
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
          <h1 className="font-semibold text-4xl text-foreground mb-1 tracking-wide">Pipeline</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Active deal pipeline and inbound opportunities.
          </p>
        </div>
        <Button type="button" size="sm" onClick={openAdd}>
          <Plus size={15} />
          Add Deal
        </Button>
      </div>

      {liveDealsList.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-14 text-center">
          <p className="font-semibold text-xl text-foreground mb-2 tracking-wide">No deals yet.</p>
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
                        <button type="button" onClick={() => openEdit(deal)} className="p-1 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer" title="Edit"><Pencil size={13} /></button>
                        <button type="button" onClick={() => { setSelected(deal); setMode('confirm-delete') }} className="p-1 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer" title="Delete"><Trash2 size={13} /></button>
                      </div>
                      <button type="button" onClick={() => openView(deal)} className="w-full text-left cursor-pointer">
                        <div className="mb-4">
                          <h3 className="font-semibold text-lg text-foreground tracking-wide leading-snug group-hover:text-primary transition-colors pr-12 mb-1">{deal.name}</h3>
                          <Badge variant="secondary" className={STATUS_COLORS[deal.status] ?? ''}>{deal.status}</Badge>
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
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={closeModal}>
          <div className="bg-card border border-border rounded-lg p-8 w-full max-w-lg shadow-lg" onClick={(e) => e.stopPropagation()}>
            {mode === 'view' && selected && (
              <>
                <ModalHeader title={selected.name} onClose={closeModal} />
                <Badge variant="secondary" className={`mb-6 ${STATUS_COLORS[selected.status] ?? ''}`}>{selected.status}</Badge>
                <div className="space-y-4">
                  <DetailRow label="Name" value={selected.name} />
                  <div className="border-t border-border my-4" />
                  <DetailRow label="Sector" value={selected.sector} />
                  {selected.vertical && <DetailRow label="Vertical" value={selected.vertical} />}
                  <DetailRow label="Business Model" value={selected.model} />
                  <DetailRow label="Location" value={selected.location} />
                  <div className="border-t border-border my-4" />
                  <DetailRow label="Revenue Range" value={selected.revenue_range} />
                  <DetailRow label="EBITDA" value={selected.ebitda} />
                  <DetailRow label="Asking Price" value={selected.asking_price} />
                  {selected.notes && (<><div className="border-t border-border my-4" /><DetailRow label="Notes" value={selected.notes} long /></>)}
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <Button type="button" variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 mr-auto" onClick={() => setMode('confirm-delete')}><Trash2 size={14} />Delete</Button>
                  <Button type="button" variant="secondary" size="sm" onClick={closeModal}>Close</Button>
                  <Button type="button" size="sm" onClick={() => openEdit(selected)}><Pencil size={14} />Edit</Button>
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
                  <div className="border-t border-border my-4" />
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Sector" value={draft.sector} onChange={(v) => setDraft((d) => ({ ...d, sector: v }))} />
                    <div>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-1.5">Vertical</p>
                      <select value={draft.vertical} onChange={(e) => setDraft((d) => ({ ...d, vertical: e.target.value }))} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                        <option value="">— None —</option>
                        {verticals.map((v) => <option key={v.id} value={v.name}>{v.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Business Model" value={draft.model} onChange={(v) => setDraft((d) => ({ ...d, model: v }))} placeholder="e.g. Subscription" />
                    <Field label="Location" value={draft.location} onChange={(v) => setDraft((d) => ({ ...d, location: v }))} placeholder="e.g. AU / US" />
                  </div>
                  <div className="border-t border-border my-4" />
                  <Field label="Revenue Range" value={draft.revenue_range} onChange={(v) => setDraft((d) => ({ ...d, revenue_range: v }))} placeholder="e.g. $200k - $500k ARR" />
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="EBITDA" value={draft.ebitda} onChange={(v) => setDraft((d) => ({ ...d, ebitda: v }))} placeholder="e.g. $80k - $150k" />
                    <Field label="Asking Price" value={draft.asking_price} onChange={(v) => setDraft((d) => ({ ...d, asking_price: v }))} placeholder="e.g. $1M - $2M" />
                  </div>
                  <div className="border-t border-border my-4" />
                  <Field label="Notes" value={draft.notes} onChange={(v) => setDraft((d) => ({ ...d, notes: v }))} multiline />
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <Button type="button" variant="secondary" size="sm" onClick={closeModal}>Cancel</Button>
                  <Button type="button" size="sm" onClick={submitSave} disabled={!draft.name.trim()}>{mode === 'add' ? 'Add Deal' : 'Save Changes'}</Button>
                </div>
              </>
            )}

            {mode === 'confirm-delete' && selected && (
              <>
                <ModalHeader title="Delete Deal" onClose={closeModal} />
                <p className="text-sm text-muted-foreground leading-relaxed mb-2">Are you sure you want to remove <span className="text-foreground font-medium">{selected.name}</span>?</p>
                <p className="text-xs text-muted-foreground">This cannot be undone.</p>
                <div className="flex justify-end gap-2 mt-6">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setMode('view')}>Cancel</Button>
                  <Button type="button" variant="destructive" size="sm" onClick={submitDelete}>Delete</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <h3 className="font-semibold text-2xl text-foreground tracking-wide">{title}</h3>
      <button type="button" onClick={onClose} className="p-1 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer"><X size={18} /></button>
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
