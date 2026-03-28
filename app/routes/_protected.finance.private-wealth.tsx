import { useState } from 'react'
import { X, Pencil, Trash2, Plus } from 'lucide-react'

interface Lender {
  id: string
  name: string
  lvrLimit: string
  lvrMin: string
  ratesApprox: string
  terms: string
  minWithdraw: string
  restrictions: string
}

const INITIAL_LENDERS: Lender[] = [
  {
    id: '1',
    name: 'Macquarie Private Bank',
    lvrLimit: '70%',
    lvrMin: '50%',
    ratesApprox: '6.2% – 7.1%',
    terms: '1–5 year fixed, variable available',
    minWithdraw: '$250,000',
    restrictions: 'Must hold Macquarie CMA. Min $1M net investable assets.',
  },
  {
    id: '2',
    name: 'Jarden Wealth',
    lvrLimit: '65%',
    lvrMin: '40%',
    ratesApprox: '6.5% – 7.5%',
    terms: 'Revolving credit, 12-month review',
    minWithdraw: '$500,000',
    restrictions: 'NZ-domiciled securities only. Margin call at LVR breach.',
  },
  {
    id: '3',
    name: 'Craigs Investment Partners',
    lvrLimit: '60%',
    lvrMin: '35%',
    ratesApprox: '7.0% – 7.8%',
    terms: 'On-demand revolving facility',
    minWithdraw: '$100,000',
    restrictions: 'Approved securities list. No international equities.',
  },
  {
    id: '4',
    name: 'Forsyth Barr',
    lvrLimit: '65%',
    lvrMin: '40%',
    ratesApprox: '6.8% – 7.5%',
    terms: 'Revolving credit, annual review',
    minWithdraw: '$200,000',
    restrictions: 'Must maintain portfolio with Forsyth Barr. NZX/ASX listed only.',
  },
  {
    id: '5',
    name: 'ASB Securities',
    lvrLimit: '50%',
    lvrMin: '30%',
    ratesApprox: '7.5% – 8.2%',
    terms: 'Variable rate, 12-month term',
    minWithdraw: '$50,000',
    restrictions: 'Limited approved securities. Personal guarantee required.',
  },
  {
    id: '6',
    name: 'BNZ Private Bank',
    lvrLimit: '55%',
    lvrMin: '35%',
    ratesApprox: '6.9% – 7.6%',
    terms: '1–3 year terms, revolving available',
    minWithdraw: '$300,000',
    restrictions: 'Min $1M lending. Must hold BNZ transactional account.',
  },
]

const EMPTY_LENDER: Omit<Lender, 'id'> = {
  name: '',
  lvrLimit: '',
  lvrMin: '',
  ratesApprox: '',
  terms: '',
  minWithdraw: '',
  restrictions: '',
}

type ModalMode = 'view' | 'edit' | 'add' | 'confirm-delete'

export default function PrivateWealth() {
  const [lenders, setLenders] = useState<Lender[]>(INITIAL_LENDERS)
  const [selected, setSelected] = useState<Lender | null>(null)
  const [mode, setMode] = useState<ModalMode>('view')
  const [draft, setDraft] = useState<Omit<Lender, 'id'>>(EMPTY_LENDER)

  function openView(lender: Lender) {
    setSelected(lender)
    setMode('view')
  }

  function openEdit(lender: Lender) {
    setSelected(lender)
    setDraft({ ...lender })
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

  function saveEdit() {
    if (!selected) return
    setLenders((prev) =>
      prev.map((l) => (l.id === selected.id ? { ...draft, id: selected.id } : l))
    )
    closeModal()
  }

  function saveAdd() {
    const newLender: Lender = { ...draft, id: Date.now().toString() }
    setLenders((prev) => [...prev, newLender])
    closeModal()
  }

  function confirmDelete() {
    setMode('confirm-delete')
  }

  function deleteLender() {
    if (!selected) return
    setLenders((prev) => prev.filter((l) => l.id !== selected.id))
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
        <button
          type="button"
          onClick={openAdd}
          className="btn btn-sm gap-2 bg-primary text-primary-foreground border-0 hover:bg-primary/90"
        >
          <Plus size={15} />
          Add Lender
        </button>
      </div>

      {/* Lender card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {lenders.map((lender) => (
          <div
            key={lender.id}
            className="relative bg-card border border-border rounded-lg p-6 transition-all hover:border-primary/40 hover:shadow-[0_0_20px_rgba(200,170,110,0.06)] group"
          >
            {/* Action buttons — appear on hover */}
            <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => openEdit(lender)}
                className="btn btn-xs btn-ghost btn-circle text-muted-foreground hover:text-foreground"
                title="Edit"
              >
                <Pencil size={13} />
              </button>
              <button
                type="button"
                onClick={() => { setSelected(lender); setMode('confirm-delete') }}
                className="btn btn-xs btn-ghost btn-circle text-muted-foreground hover:text-error"
                title="Delete"
              >
                <Trash2 size={13} />
              </button>
            </div>

            {/* Clickable area — opens view modal */}
            <button
              type="button"
              onClick={() => openView(lender)}
              className="w-full text-left cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <h3 className="font-display text-lg text-foreground tracking-wide leading-snug group-hover:text-primary transition-colors pr-12">
                  {lender.name}
                </h3>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">LVR Limit</span>
                  <span className="font-mono text-foreground">{lender.lvrLimit}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Rates</span>
                  <span className="font-mono text-foreground">{lender.ratesApprox}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Min Withdraw</span>
                  <span className="font-mono text-foreground">{lender.minWithdraw}</span>
                </div>
              </div>
            </button>
          </div>
        ))}

        {lenders.length === 0 && (
          <div className="col-span-full bg-card border border-border rounded-lg p-14 text-center">
            <p className="font-display text-xl text-foreground mb-2 tracking-wide">No lenders yet.</p>
            <p className="text-muted-foreground text-sm">Add your first private wealth provider above.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <dialog className={`modal ${isOpen ? 'modal-open' : ''}`}>
        <div className="modal-box bg-card border border-border max-w-lg">

          {/* VIEW mode */}
          {mode === 'view' && selected && (
            <>
              <div className="flex items-start justify-between mb-6">
                <h3 className="font-display text-2xl text-foreground tracking-wide">{selected.name}</h3>
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn btn-sm btn-ghost btn-circle text-muted-foreground hover:text-foreground"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <DetailRow label="Name" value={selected.name} />
                <div className="divider my-0 before:bg-border after:bg-border" />
                <DetailRow label="LVR Limit" value={selected.lvrLimit} />
                <DetailRow label="LVR Min" value={selected.lvrMin} />
                <div className="divider my-0 before:bg-border after:bg-border" />
                <DetailRow label="Rates Approx" value={selected.ratesApprox} />
                <DetailRow label="Terms" value={selected.terms} />
                <div className="divider my-0 before:bg-border after:bg-border" />
                <DetailRow label="Min Withdraw Amount" value={selected.minWithdraw} />
                <DetailRow label="Restrictions" value={selected.restrictions} long />
              </div>

              <div className="modal-action">
                <button
                  type="button"
                  onClick={confirmDelete}
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

          {/* EDIT / ADD mode */}
          {(mode === 'edit' || mode === 'add') && (
            <>
              <div className="flex items-start justify-between mb-6">
                <h3 className="font-display text-2xl text-foreground tracking-wide">
                  {mode === 'add' ? 'Add Lender' : 'Edit Lender'}
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
                <LenderField label="Name" value={draft.name} onChange={(v) => setDraft((d) => ({ ...d, name: v }))} />
                <div className="divider my-0 before:bg-border after:bg-border" />
                <div className="grid grid-cols-2 gap-4">
                  <LenderField label="LVR Limit" value={draft.lvrLimit} onChange={(v) => setDraft((d) => ({ ...d, lvrLimit: v }))} placeholder="e.g. 70%" />
                  <LenderField label="LVR Min" value={draft.lvrMin} onChange={(v) => setDraft((d) => ({ ...d, lvrMin: v }))} placeholder="e.g. 40%" />
                </div>
                <div className="divider my-0 before:bg-border after:bg-border" />
                <LenderField label="Rates Approx" value={draft.ratesApprox} onChange={(v) => setDraft((d) => ({ ...d, ratesApprox: v }))} placeholder="e.g. 6.2% – 7.1%" />
                <LenderField label="Terms" value={draft.terms} onChange={(v) => setDraft((d) => ({ ...d, terms: v }))} />
                <div className="divider my-0 before:bg-border after:bg-border" />
                <LenderField label="Min Withdraw Amount" value={draft.minWithdraw} onChange={(v) => setDraft((d) => ({ ...d, minWithdraw: v }))} placeholder="e.g. $250,000" />
                <LenderField label="Restrictions" value={draft.restrictions} onChange={(v) => setDraft((d) => ({ ...d, restrictions: v }))} multiline />
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
                  {mode === 'add' ? 'Add Lender' : 'Save Changes'}
                </button>
              </div>
            </>
          )}

          {/* CONFIRM DELETE mode */}
          {mode === 'confirm-delete' && selected && (
            <>
              <div className="flex items-start justify-between mb-6">
                <h3 className="font-display text-2xl text-foreground tracking-wide">Delete Lender</h3>
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
                  onClick={deleteLender}
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

function LenderField({
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
