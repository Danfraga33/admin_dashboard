import { useState } from 'react'
import { X, Pencil, Trash2, Plus } from 'lucide-react'

interface Deal {
  id: string
  name: string
  sector: string
  revenueRange: string
  ebitda: string
  askingPrice: string
  model: string
  location: string
  status: 'Watching' | 'Contacted' | 'In Diligence' | 'Passed'
  notes: string
}

const STATUS_COLORS: Record<Deal['status'], string> = {
  Watching: 'badge-outline',
  Contacted: 'badge-info',
  'In Diligence': 'badge-warning',
  Passed: 'badge-ghost',
}

const INITIAL_DEALS: Deal[] = [
  {
    id: '1',
    name: 'SaaS Accounting Tool',
    sector: 'B2B SaaS',
    revenueRange: '$200k – $500k ARR',
    ebitda: '$80k – $150k',
    askingPrice: '$600k – $1.2M',
    model: 'Subscription',
    location: 'AU / NZ',
    status: 'Watching',
    notes: 'Strong retention. Owner looking to exit in 12 months.',
  },
  {
    id: '2',
    name: 'HR Platform NZ',
    sector: 'B2B SaaS',
    revenueRange: '$400k – $800k ARR',
    ebitda: '$120k – $200k',
    askingPrice: '$1.2M – $2M',
    model: 'Subscription',
    location: 'New Zealand',
    status: 'Contacted',
    notes: 'Intro call done. Waiting on financials.',
  },
]

const EMPTY_DEAL: Omit<Deal, 'id'> = {
  name: '',
  sector: '',
  revenueRange: '',
  ebitda: '',
  askingPrice: '',
  model: '',
  location: '',
  status: 'Watching',
  notes: '',
}

const STATUSES: Deal['status'][] = ['Watching', 'Contacted', 'In Diligence', 'Passed']

type ModalMode = 'view' | 'edit' | 'add' | 'confirm-delete'

export default function Pipeline() {
  const [deals, setDeals] = useState<Deal[]>(INITIAL_DEALS)
  const [selected, setSelected] = useState<Deal | null>(null)
  const [mode, setMode] = useState<ModalMode>('view')
  const [draft, setDraft] = useState<Omit<Deal, 'id'>>(EMPTY_DEAL)

  function openView(deal: Deal) {
    setSelected(deal)
    setMode('view')
  }

  function openEdit(deal: Deal) {
    setSelected(deal)
    setDraft({ ...deal })
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

  function saveEdit() {
    if (!selected) return
    setDeals((prev) => prev.map((d) => (d.id === selected.id ? { ...draft, id: selected.id } : d)))
    closeModal()
  }

  function saveAdd() {
    setDeals((prev) => [...prev, { ...draft, id: Date.now().toString() }])
    closeModal()
  }

  function deleteDeal() {
    if (!selected) return
    setDeals((prev) => prev.filter((d) => d.id !== selected.id))
    closeModal()
  }

  const isOpen = selected !== null || mode === 'add'

  const grouped = STATUSES.reduce<Record<string, Deal[]>>((acc, status) => {
    acc[status] = deals.filter((d) => d.status === status)
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
        <button
          type="button"
          onClick={openAdd}
          className="btn btn-sm gap-2 bg-primary text-primary-foreground border-0 hover:bg-primary/90"
        >
          <Plus size={15} />
          Add Deal
        </button>
      </div>

      {deals.length === 0 ? (
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
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
                    {status}
                  </p>
                  <span className="text-[11px] text-muted-foreground/50">{group.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {group.map((deal) => (
                    <div
                      key={deal.id}
                      className="relative bg-card border border-border rounded-lg p-6 transition-all hover:border-primary/40 hover:shadow-[0_0_20px_rgba(200,170,110,0.06)] group"
                    >
                      {/* Hover actions */}
                      <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => openEdit(deal)}
                          className="btn btn-xs btn-ghost btn-circle text-muted-foreground hover:text-foreground"
                          title="Edit"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => { setSelected(deal); setMode('confirm-delete') }}
                          className="btn btn-xs btn-ghost btn-circle text-muted-foreground hover:text-error"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {/* Card body */}
                      <button
                        type="button"
                        onClick={() => openView(deal)}
                        className="w-full text-left cursor-pointer"
                      >
                        <div className="mb-4">
                          <h3 className="font-display text-lg text-foreground tracking-wide leading-snug group-hover:text-primary transition-colors pr-12 mb-1">
                            {deal.name}
                          </h3>
                          <span className={`badge badge-sm ${STATUS_COLORS[deal.status]}`}>
                            {deal.status}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Sector</span>
                            <span className="font-mono text-foreground">{deal.sector}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Revenue</span>
                            <span className="font-mono text-foreground">{deal.revenueRange}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Asking Price</span>
                            <span className="font-mono text-foreground">{deal.askingPrice}</span>
                          </div>
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

          {/* VIEW */}
          {mode === 'view' && selected && (
            <>
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-display text-2xl text-foreground tracking-wide">{selected.name}</h3>
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn btn-sm btn-ghost btn-circle text-muted-foreground hover:text-foreground"
                >
                  <X size={18} />
                </button>
              </div>
              <span className={`badge badge-sm mb-6 ${STATUS_COLORS[selected.status]}`}>{selected.status}</span>

              <div className="space-y-4">
                <DetailRow label="Name" value={selected.name} />
                <div className="divider my-0 before:bg-border after:bg-border" />
                <DetailRow label="Sector" value={selected.sector} />
                <DetailRow label="Business Model" value={selected.model} />
                <DetailRow label="Location" value={selected.location} />
                <div className="divider my-0 before:bg-border after:bg-border" />
                <DetailRow label="Revenue Range" value={selected.revenueRange} />
                <DetailRow label="EBITDA" value={selected.ebitda} />
                <DetailRow label="Asking Price" value={selected.askingPrice} />
                {selected.notes && (
                  <>
                    <div className="divider my-0 before:bg-border after:bg-border" />
                    <DetailRow label="Notes" value={selected.notes} long />
                  </>
                )}
              </div>

              <div className="modal-action">
                <button
                  type="button"
                  onClick={() => setMode('confirm-delete')}
                  className="btn btn-sm btn-ghost text-error hover:bg-error/10 mr-auto"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn btn-sm bg-secondary text-secondary-foreground border-border hover:bg-secondary/80"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(selected)}
                  className="btn btn-sm bg-primary text-primary-foreground border-0 hover:bg-primary/90"
                >
                  <Pencil size={14} />
                  Edit
                </button>
              </div>
            </>
          )}

          {/* EDIT / ADD */}
          {(mode === 'edit' || mode === 'add') && (
            <>
              <div className="flex items-start justify-between mb-6">
                <h3 className="font-display text-2xl text-foreground tracking-wide">
                  {mode === 'add' ? 'Add Deal' : 'Edit Deal'}
                </h3>
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn btn-sm btn-ghost btn-circle text-muted-foreground hover:text-foreground"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <DealField label="Deal Name" value={draft.name} onChange={(v) => setDraft((d) => ({ ...d, name: v }))} />
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-1.5">Status</p>
                  <select
                    value={draft.status}
                    onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as Deal['status'] }))}
                    className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="divider my-0 before:bg-border after:bg-border" />
                <div className="grid grid-cols-2 gap-4">
                  <DealField label="Sector" value={draft.sector} onChange={(v) => setDraft((d) => ({ ...d, sector: v }))} />
                  <DealField label="Business Model" value={draft.model} onChange={(v) => setDraft((d) => ({ ...d, model: v }))} placeholder="e.g. Subscription" />
                </div>
                <DealField label="Location" value={draft.location} onChange={(v) => setDraft((d) => ({ ...d, location: v }))} placeholder="e.g. AU / NZ" />
                <div className="divider my-0 before:bg-border after:bg-border" />
                <DealField label="Revenue Range" value={draft.revenueRange} onChange={(v) => setDraft((d) => ({ ...d, revenueRange: v }))} placeholder="e.g. $200k – $500k ARR" />
                <div className="grid grid-cols-2 gap-4">
                  <DealField label="EBITDA" value={draft.ebitda} onChange={(v) => setDraft((d) => ({ ...d, ebitda: v }))} placeholder="e.g. $80k – $150k" />
                  <DealField label="Asking Price" value={draft.askingPrice} onChange={(v) => setDraft((d) => ({ ...d, askingPrice: v }))} placeholder="e.g. $1M – $2M" />
                </div>
                <div className="divider my-0 before:bg-border after:bg-border" />
                <DealField label="Notes" value={draft.notes} onChange={(v) => setDraft((d) => ({ ...d, notes: v }))} multiline />
              </div>

              <div className="modal-action">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn btn-sm bg-secondary text-secondary-foreground border-border hover:bg-secondary/80"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={mode === 'add' ? saveAdd : saveEdit}
                  disabled={!draft.name.trim()}
                  className="btn btn-sm bg-primary text-primary-foreground border-0 hover:bg-primary/90 disabled:opacity-40"
                >
                  {mode === 'add' ? 'Add Deal' : 'Save Changes'}
                </button>
              </div>
            </>
          )}

          {/* CONFIRM DELETE */}
          {mode === 'confirm-delete' && selected && (
            <>
              <div className="flex items-start justify-between mb-6">
                <h3 className="font-display text-2xl text-foreground tracking-wide">Delete Deal</h3>
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn btn-sm btn-ghost btn-circle text-muted-foreground hover:text-foreground"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                Are you sure you want to remove{' '}
                <span className="text-foreground font-medium">{selected.name}</span>?
              </p>
              <p className="text-xs text-muted-foreground">This cannot be undone.</p>
              <div className="modal-action">
                <button
                  type="button"
                  onClick={() => setMode('view')}
                  className="btn btn-sm bg-secondary text-secondary-foreground border-border hover:bg-secondary/80"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={deleteDeal}
                  className="btn btn-sm bg-error text-white border-0 hover:bg-error/90"
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>

        <form method="dialog" className="modal-backdrop">
          <button type="button" onClick={closeModal}>close</button>
        </form>
      </dialog>
    </div>
  )
}

function DetailRow({ label, value, long }: { label: string; value: string; long?: boolean }) {
  return (
    <div className={long ? '' : 'flex items-center justify-between'}>
      <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
      <p className={`font-mono text-foreground ${long ? 'text-sm leading-relaxed' : 'text-sm'}`}>
        {value}
      </p>
    </div>
  )
}

function DealField({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  multiline?: boolean
}) {
  const inputClass =
    'w-full bg-input border border-border rounded-md px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring'
  return (
    <div>
      <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-1.5">{label}</p>
      {multiline ? (
        <textarea
          className={`${inputClass} resize-none`}
          rows={3}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          type="text"
          className={inputClass}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  )
}
