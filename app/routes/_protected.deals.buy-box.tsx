import { useState } from 'react'
import { X, Pencil, Trash2, Plus } from 'lucide-react'

interface Criterion {
  id: string
  label: string
  value: string
}

interface BuyBoxData {
  sectors: Criterion[]
  revenueMin: string
  revenueMax: string
  ebitdaMin: string
  ebitdaMax: string
  priceMin: string
  priceMax: string
  models: Criterion[]
  locations: Criterion[]
  mustHaves: Criterion[]
  dealBreakers: Criterion[]
}

const INITIAL: BuyBoxData = {
  sectors: [
    { id: '1', label: 'B2B SaaS', value: '' },
    { id: '2', label: 'Marketplace', value: '' },
  ],
  revenueMin: '$150k',
  revenueMax: '$2M',
  ebitdaMin: '$50k',
  ebitdaMax: '$600k',
  priceMin: '$300k',
  priceMax: '$3M',
  models: [
    { id: '1', label: 'Subscription', value: '' },
    { id: '2', label: 'Usage-based', value: '' },
  ],
  locations: [
    { id: '1', label: 'Australia', value: '' },
    { id: '2', label: 'New Zealand', value: '' },
    { id: '3', label: 'Remote-first', value: '' },
  ],
  mustHaves: [
    { id: '1', label: 'Profitable or near-profitable', value: '' },
    { id: '2', label: 'Owner willing to stay 6–12 months', value: '' },
    { id: '3', label: 'No key-person dependency', value: '' },
  ],
  dealBreakers: [
    { id: '1', label: 'Declining revenue 2+ years', value: '' },
    { id: '2', label: 'Heavy enterprise sales cycle', value: '' },
  ],
}

type EditSection =
  | 'ranges'
  | 'sectors'
  | 'models'
  | 'locations'
  | 'mustHaves'
  | 'dealBreakers'
  | null

export default function BuyBox() {
  const [data, setData] = useState<BuyBoxData>(INITIAL)
  const [editSection, setEditSection] = useState<EditSection>(null)
  const [draft, setDraft] = useState<BuyBoxData>(INITIAL)

  function openEdit(section: EditSection) {
    setDraft({ ...data, sectors: [...data.sectors], models: [...data.models], locations: [...data.locations], mustHaves: [...data.mustHaves], dealBreakers: [...data.dealBreakers] })
    setEditSection(section)
  }

  function save() {
    setData(draft)
    setEditSection(null)
  }

  function addTag(field: keyof Pick<BuyBoxData, 'sectors' | 'models' | 'locations' | 'mustHaves' | 'dealBreakers'>) {
    setDraft((d) => ({ ...d, [field]: [...d[field], { id: Date.now().toString(), label: '', value: '' }] }))
  }

  function removeTag(field: keyof Pick<BuyBoxData, 'sectors' | 'models' | 'locations' | 'mustHaves' | 'dealBreakers'>, id: string) {
    setDraft((d) => ({ ...d, [field]: d[field].filter((t) => t.id !== id) }))
  }

  function updateTag(field: keyof Pick<BuyBoxData, 'sectors' | 'models' | 'locations' | 'mustHaves' | 'dealBreakers'>, id: string, label: string) {
    setDraft((d) => ({ ...d, [field]: d[field].map((t) => t.id === id ? { ...t, label } : t) }))
  }

  return (
    <div>
      <h1 className="font-display text-4xl text-foreground mb-1 tracking-wide">Buy Box</h1>
      <p className="text-muted-foreground text-sm mb-10 leading-relaxed">
        Acquisition criteria — what you're looking for.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Financial Ranges */}
        <CriteriaCard title="Financial Ranges" onEdit={() => openEdit('ranges')}>
          <div className="space-y-3">
            <RangeRow label="Revenue" min={data.revenueMin} max={data.revenueMax} />
            <RangeRow label="EBITDA" min={data.ebitdaMin} max={data.ebitdaMax} />
            <RangeRow label="Price" min={data.priceMin} max={data.priceMax} />
          </div>
        </CriteriaCard>

        {/* Sectors */}
        <CriteriaCard title="Target Sectors" onEdit={() => openEdit('sectors')}>
          <TagList items={data.sectors} />
        </CriteriaCard>

        {/* Business Models */}
        <CriteriaCard title="Business Models" onEdit={() => openEdit('models')}>
          <TagList items={data.models} />
        </CriteriaCard>

        {/* Locations */}
        <CriteriaCard title="Locations" onEdit={() => openEdit('locations')}>
          <TagList items={data.locations} />
        </CriteriaCard>

        {/* Must Haves */}
        <CriteriaCard title="Must Haves" onEdit={() => openEdit('mustHaves')}>
          <CheckList items={data.mustHaves} positive />
        </CriteriaCard>

        {/* Deal Breakers */}
        <CriteriaCard title="Deal Breakers" onEdit={() => openEdit('dealBreakers')}>
          <CheckList items={data.dealBreakers} />
        </CriteriaCard>

      </div>

      {/* Edit Modal */}
      <dialog className={`modal ${editSection !== null ? 'modal-open' : ''}`}>
        <div className="modal-box bg-card border border-border max-w-lg">
          <div className="flex items-start justify-between mb-6">
            <h3 className="font-display text-2xl text-foreground tracking-wide">
              {editSection === 'ranges' && 'Financial Ranges'}
              {editSection === 'sectors' && 'Target Sectors'}
              {editSection === 'models' && 'Business Models'}
              {editSection === 'locations' && 'Locations'}
              {editSection === 'mustHaves' && 'Must Haves'}
              {editSection === 'dealBreakers' && 'Deal Breakers'}
            </h3>
            <button
              type="button"
              onClick={() => setEditSection(null)}
              className="btn btn-sm btn-ghost btn-circle text-muted-foreground hover:text-foreground"
            >
              <X size={18} />
            </button>
          </div>

          {/* Ranges form */}
          {editSection === 'ranges' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <RangeField label="Revenue Min" value={draft.revenueMin} onChange={(v) => setDraft((d) => ({ ...d, revenueMin: v }))} />
                <RangeField label="Revenue Max" value={draft.revenueMax} onChange={(v) => setDraft((d) => ({ ...d, revenueMax: v }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <RangeField label="EBITDA Min" value={draft.ebitdaMin} onChange={(v) => setDraft((d) => ({ ...d, ebitdaMin: v }))} />
                <RangeField label="EBITDA Max" value={draft.ebitdaMax} onChange={(v) => setDraft((d) => ({ ...d, ebitdaMax: v }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <RangeField label="Price Min" value={draft.priceMin} onChange={(v) => setDraft((d) => ({ ...d, priceMin: v }))} />
                <RangeField label="Price Max" value={draft.priceMax} onChange={(v) => setDraft((d) => ({ ...d, priceMax: v }))} />
              </div>
            </div>
          )}

          {/* Tag list forms */}
          {(editSection === 'sectors' || editSection === 'models' || editSection === 'locations' || editSection === 'mustHaves' || editSection === 'dealBreakers') && (
            <TagEditor
              items={draft[editSection]}
              onAdd={() => addTag(editSection)}
              onRemove={(id) => removeTag(editSection, id)}
              onChange={(id, label) => updateTag(editSection, id, label)}
            />
          )}

          <div className="modal-action">
            <button
              type="button"
              onClick={() => setEditSection(null)}
              className="btn btn-sm bg-secondary text-secondary-foreground border-border hover:bg-secondary/80"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              className="btn btn-sm bg-primary text-primary-foreground border-0 hover:bg-primary/90"
            >
              Save
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button type="button" onClick={() => setEditSection(null)}>close</button>
        </form>
      </dialog>
    </div>
  )
}

function CriteriaCard({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-lg p-6 group relative">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">{title}</p>
        <button
          type="button"
          onClick={onEdit}
          className="btn btn-xs btn-ghost btn-circle text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          title="Edit"
        >
          <Pencil size={13} />
        </button>
      </div>
      {children}
    </div>
  )
}

function RangeRow({ label, min, max }: { label: string; min: string; max: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-foreground">{min} – {max}</span>
    </div>
  )
}

function TagList({ items }: { items: { id: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item.id} className="badge badge-outline badge-md border-border text-foreground">
          {item.label}
        </span>
      ))}
    </div>
  )
}

function CheckList({ items, positive }: { items: { id: string; label: string }[]; positive?: boolean }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-2 text-sm">
          <span className={positive ? 'text-success mt-0.5' : 'text-error mt-0.5'}>
            {positive ? '✓' : '✗'}
          </span>
          <span className="text-foreground">{item.label}</span>
        </li>
      ))}
    </ul>
  )
}

function RangeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-1.5">{label}</p>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  )
}

function TagEditor({
  items,
  onAdd,
  onRemove,
  onChange,
}: {
  items: { id: string; label: string }[]
  onAdd: () => void
  onRemove: (id: string) => void
  onChange: (id: string, label: string) => void
}) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-2">
          <input
            type="text"
            value={item.label}
            onChange={(e) => onChange(item.id, e.target.value)}
            placeholder="Enter value..."
            className="flex-1 bg-input border border-border rounded-md px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="btn btn-xs btn-ghost btn-circle text-muted-foreground hover:text-error"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={onAdd}
        className="btn btn-xs btn-ghost gap-1.5 text-muted-foreground hover:text-foreground mt-1"
      >
        <Plus size={13} />
        Add
      </button>
    </div>
  )
}
