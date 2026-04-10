import { useState } from 'react'
import { Link, useLoaderData, useFetcher } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { requireSession } from '~/lib/session.server'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import { Target, Building2, Layers, MapPin, ArrowRight, Plus, Pencil, Trash2, X, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { cn } from '~/lib/utils'

/* ── Types ───────────────────────────────────────────────────────── */

export type Verdict = 'Pursue' | 'Conditional' | 'Avoid'

export interface Vertical {
  id: string
  name: string
  description: string
  verdict: Verdict
  demand_trajectory: string
  demand_color: 'green' | 'amber' | 'red' | 'neutral'
  recession_sensitivity: string
  tech_disruption_risk: string
  regulatory_moat: string
  gross_margin: string
  sde_margin: string
  buy_multiple: string
  research_notes: string
}

/* ── Style maps ──────────────────────────────────────────────────── */

export const VERDICT_BADGE: Record<Verdict, string> = {
  Pursue: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/20 dark:text-emerald-400',
  Conditional: 'bg-amber-500/15 text-amber-700 border-amber-500/20 dark:text-amber-400',
  Avoid: 'bg-red-500/15 text-red-700 border-red-500/20 dark:text-red-400',
}

const VERDICT_ROW_TINT: Record<Verdict, string> = {
  Pursue: 'bg-emerald-500/[0.03] dark:bg-emerald-500/[0.04]',
  Conditional: 'bg-amber-500/[0.03] dark:bg-amber-500/[0.04]',
  Avoid: 'bg-red-500/[0.03] dark:bg-red-500/[0.04]',
}

const DOT_COLOR: Record<string, string> = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  neutral: 'bg-muted-foreground',
}

const VERDICT_OPTIONS: (Verdict | 'All')[] = ['All', 'Pursue', 'Conditional', 'Avoid']

const DEMAND_COLOR_OPTIONS: Vertical['demand_color'][] = ['green', 'amber', 'red', 'neutral']

/* ── Buy-box criteria (static) ───────────────────────────────────── */

const buyBoxCriteria = [
  { label: 'Target', value: 'B2B SaaS, Services, E-commerce' },
  { label: 'Revenue Range', value: '$300K – $2M ARR' },
  { label: 'SDE Range', value: '$150K – $750K' },
  { label: 'Entry Multiple', value: '2.5x – 4x SDE' },
  { label: 'Deal Structure', value: 'Seller Finance, Equity' },
  { label: 'Geography', value: 'Australia-wide (Remote OK)' },
  { label: 'Business Age', value: '3+ years operating history' },
  { label: 'Staff', value: '< 20 employees preferred' },
  { label: 'Owner Dependence', value: 'Low to Medium' },
  { label: 'Revenue Type', value: 'Recurring preferred (70%+)' },
  { label: 'Avoid', value: 'Retail, Heavy manufacturing, Regulated' },
]

/* ── Loader ──────────────────────────────────────────────────────── */

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, responseHeaders } = await requireSession(request)
  const [{ data: deals }, { data: verticals }] = await Promise.all([
    supabase.from('pipeline_deals').select('*').order('created_at', { ascending: false }),
    supabase.from('verticals').select('*').order('verdict').order('name'),
  ])
  return Response.json(
    { deals: deals ?? [], verticals: (verticals ?? []) as Vertical[] },
    { headers: responseHeaders },
  )
}

/* ── Action ──────────────────────────────────────────────────────── */

export async function action({ request }: ActionFunctionArgs) {
  const { session, supabase, responseHeaders } = await requireSession(request)
  const form = await request.formData()
  const intent = form.get('intent') as string

  if (intent === 'vertical_create') {
    await supabase.from('verticals').insert({
      user_id: session.user.id,
      name: String(form.get('name') || ''),
      description: String(form.get('description') || ''),
      verdict: String(form.get('verdict') || 'Pursue'),
      demand_trajectory: String(form.get('demand_trajectory') || ''),
      demand_color: String(form.get('demand_color') || 'neutral'),
      recession_sensitivity: String(form.get('recession_sensitivity') || ''),
      tech_disruption_risk: String(form.get('tech_disruption_risk') || ''),
      regulatory_moat: String(form.get('regulatory_moat') || ''),
      gross_margin: String(form.get('gross_margin') || ''),
      sde_margin: String(form.get('sde_margin') || ''),
      buy_multiple: String(form.get('buy_multiple') || ''),
      research_notes: String(form.get('research_notes') || ''),
    })
  }

  if (intent === 'vertical_update') {
    await supabase
      .from('verticals')
      .update({
        name: String(form.get('name') || ''),
        description: String(form.get('description') || ''),
        verdict: String(form.get('verdict') || 'Pursue'),
        demand_trajectory: String(form.get('demand_trajectory') || ''),
        demand_color: String(form.get('demand_color') || 'neutral'),
        recession_sensitivity: String(form.get('recession_sensitivity') || ''),
        tech_disruption_risk: String(form.get('tech_disruption_risk') || ''),
        regulatory_moat: String(form.get('regulatory_moat') || ''),
        gross_margin: String(form.get('gross_margin') || ''),
        sde_margin: String(form.get('sde_margin') || ''),
        buy_multiple: String(form.get('buy_multiple') || ''),
        research_notes: String(form.get('research_notes') || ''),
      })
      .eq('id', String(form.get('id')))
  }

  if (intent === 'vertical_delete') {
    await supabase.from('verticals').delete().eq('id', String(form.get('id')))
  }

  return Response.json({}, { headers: responseHeaders })
}

/* ── Empty draft ─────────────────────────────────────────────────── */

const EMPTY_VERTICAL: Omit<Vertical, 'id'> = {
  name: '',
  description: '',
  verdict: 'Pursue',
  demand_trajectory: '',
  demand_color: 'neutral',
  recession_sensitivity: '',
  tech_disruption_risk: '',
  regulatory_moat: '',
  gross_margin: '',
  sde_margin: '',
  buy_multiple: '',
  research_notes: '',
}

type ModalMode = 'view' | 'edit' | 'add' | 'confirm-delete'

/* ── Component ───────────────────────────────────────────────────── */

export default function DealsLanding() {
  const { deals, verticals } = useLoaderData<typeof loader>()
  const fetcher = useFetcher()

  const [verdictFilter, setVerdictFilter] = useState<Verdict | 'All'>('All')
  const [modalMode, setModalMode] = useState<ModalMode>('view')
  const [selected, setSelected] = useState<Vertical | null>(null)
  const [draft, setDraft] = useState<Omit<Vertical, 'id'>>(EMPTY_VERTICAL)
  const [sortCol, setSortCol] = useState<keyof Vertical | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  function toggleSort(col: keyof Vertical) {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  function SortIcon({ col }: { col: keyof Vertical }) {
    if (sortCol !== col) return <ChevronsUpDown size={12} className="ml-1 opacity-40" />
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="ml-1 text-foreground" />
      : <ChevronDown size={12} className="ml-1 text-foreground" />
  }

  /* Optimistic updates */
  const pendingIntent = fetcher.formData?.get('intent') as string | null
  const deletingId = pendingIntent === 'vertical_delete' ? String(fetcher.formData!.get('id')) : null

  const liveVerticals: Vertical[] = verticals.filter((v) => v.id !== deletingId)

  const filteredVerticals = (() => {
    const base = verdictFilter === 'All' ? liveVerticals : liveVerticals.filter((v) => v.verdict === verdictFilter)
    if (!sortCol) return base
    return [...base].sort((a, b) => {
      const av = a[sortCol] ?? ''
      const bv = b[sortCol] ?? ''
      const cmp = String(av).localeCompare(String(bv), undefined, { sensitivity: 'base' })
      return sortDir === 'asc' ? cmp : -cmp
    })
  })()

  /* Modal helpers */
  function openAdd() {
    setDraft({ ...EMPTY_VERTICAL })
    setSelected(null)
    setModalMode('add')
  }

  function openView(v: Vertical) {
    setSelected(v)
    setModalMode('view')
  }

  function openEdit(v: Vertical) {
    setSelected(v)
    setDraft({
      name: v.name, description: v.description, verdict: v.verdict,
      demand_trajectory: v.demand_trajectory, demand_color: v.demand_color,
      recession_sensitivity: v.recession_sensitivity, tech_disruption_risk: v.tech_disruption_risk,
      regulatory_moat: v.regulatory_moat, gross_margin: v.gross_margin,
      sde_margin: v.sde_margin, buy_multiple: v.buy_multiple, research_notes: v.research_notes,
    })
    setModalMode('edit')
  }

  function closeModal() {
    setSelected(null)
    setModalMode('view')
  }

  function submitSave() {
    const fd = new FormData()
    fd.set('intent', modalMode === 'add' ? 'vertical_create' : 'vertical_update')
    if (modalMode === 'edit' && selected) fd.set('id', selected.id)
    Object.entries(draft).forEach(([k, v]) => fd.set(k, v as string))
    fetcher.submit(fd, { method: 'post' })
    closeModal()
  }

  function submitDelete() {
    if (!selected) return
    fetcher.submit({ intent: 'vertical_delete', id: selected.id }, { method: 'post' })
    closeModal()
  }

  const isModalOpen = modalMode === 'add' || selected !== null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Buy Box Card */}
        <Card className="gap-0 p-0 xl:col-span-1">
          <CardHeader className="flex-row items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Buy Box</CardTitle>
            </div>
            <Link to="/deals/buy-box" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              Details <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {buyBoxCriteria.map((item, idx) => (
                <div key={idx} className="flex items-start justify-between gap-4 px-5 py-3 hover:bg-muted/50 transition-colors">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">{item.label}</span>
                  <span className="text-sm text-foreground text-right font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Deals Table */}
        <Card className="gap-0 p-0 xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Active Deals</CardTitle>
              <Badge variant="secondary" className="ml-2">{(deals as any[]).length} total</Badge>
            </div>
            <Link to="/deals/pipeline" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {(deals as any[]).length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">No deals yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-5">Deal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Asking Price</TableHead>
                    <TableHead className="pr-5">Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(deals as any[]).map((deal: any) => (
                    <TableRow key={deal.id} className="cursor-pointer">
                      <TableCell className="pl-5">
                        <div>
                          <p className="font-medium text-foreground">{deal.name}</p>
                          <p className="text-xs text-muted-foreground">{deal.sector}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-medium">{deal.status}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{deal.revenue_range}</TableCell>
                      <TableCell className="text-muted-foreground">{deal.asking_price}</TableCell>
                      <TableCell className="pr-5">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          {deal.location}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Verticals Table */}
      <Card className="gap-0 p-0">
        <CardHeader className="flex-row items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-base">Verticals</CardTitle>
            <Badge variant="secondary" className="ml-2">{filteredVerticals.length} shown</Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              {VERDICT_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setVerdictFilter(opt)}
                  className={cn(
                    'px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer',
                    verdictFilter === opt
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
            <Button size="sm" onClick={openAdd} className="gap-1.5">
              <Plus size={13} /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {liveVerticals.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">No verticals yet. Add one above.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {(
                      [
                        { label: 'Vertical', col: 'name', cls: 'pl-5 min-w-[220px]' },
                        { label: 'Verdict', col: 'verdict', cls: 'min-w-[100px]' },
                        { label: 'Demand', col: 'demand_trajectory', cls: 'min-w-[120px]' },
                        { label: 'Recession', col: 'recession_sensitivity', cls: 'min-w-[150px]' },
                        { label: 'Tech Risk', col: 'tech_disruption_risk', cls: 'min-w-[100px]' },
                        { label: 'Reg. Moat', col: 'regulatory_moat', cls: 'min-w-[100px]' },
                        { label: 'Gross %', col: 'gross_margin', cls: 'min-w-[90px]' },
                        { label: 'SDE %', col: 'sde_margin', cls: 'min-w-[90px]' },
                        { label: 'Multiple', col: 'buy_multiple', cls: 'min-w-[90px]' },
                      ] as { label: string; col: keyof Vertical; cls: string }[]
                    ).map(({ label, col, cls }) => (
                      <TableHead key={col} className={cls}>
                        <button
                          onClick={() => toggleSort(col)}
                          className="flex items-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer select-none"
                        >
                          {label}
                          <SortIcon col={col} />
                        </button>
                      </TableHead>
                    ))}
                    <TableHead className="pr-5 w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVerticals.map((v) => (
                    <TableRow
                      key={v.id}
                      className={cn('cursor-pointer group', VERDICT_ROW_TINT[v.verdict])}
                      onClick={() => openView(v)}
                    >
                      <TableCell className="pl-5">
                        <div>
                          <p className="font-medium text-foreground text-sm">{v.name}</p>
                          <p className="text-xs text-muted-foreground">{v.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={VERDICT_BADGE[v.verdict]}>{v.verdict}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5 text-sm">
                          <span className={cn('w-2 h-2 rounded-full shrink-0', DOT_COLOR[v.demand_color])} />
                          {v.demand_trajectory}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{v.recession_sensitivity}</TableCell>
                      <TableCell className="text-sm">{v.tech_disruption_risk}</TableCell>
                      <TableCell className="text-sm">{v.regulatory_moat}</TableCell>
                      <TableCell className="text-sm font-mono">{v.gross_margin}</TableCell>
                      <TableCell className="text-sm font-mono">{v.sde_margin}</TableCell>
                      <TableCell className="text-sm font-mono">{v.buy_multiple}</TableCell>
                      <TableCell className="pr-5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(v)} className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground cursor-pointer"><Pencil size={12} /></button>
                          <button onClick={() => { setSelected(v); setModalMode('confirm-delete') }} className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-destructive cursor-pointer"><Trash2 size={12} /></button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={closeModal}>
          <div className="bg-card border border-border rounded-lg w-full max-w-2xl shadow-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

            {/* VIEW */}
            {modalMode === 'view' && selected && (
              <div className="p-8">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-xl text-foreground">{selected.name}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{selected.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(selected)} className="gap-1"><Pencil size={13} /> Edit</Button>
                    <Button variant="ghost" size="icon-sm" onClick={closeModal}><X size={16} /></Button>
                  </div>
                </div>
                <Badge variant="outline" className={cn('mb-6', VERDICT_BADGE[selected.verdict])}>{selected.verdict}</Badge>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <ViewRow label="Demand" value={<span className="flex items-center gap-1.5"><span className={cn('w-2 h-2 rounded-full', DOT_COLOR[selected.demand_color])} />{selected.demand_trajectory}</span>} />
                  <ViewRow label="Recession Sensitivity" value={selected.recession_sensitivity} />
                  <ViewRow label="Tech Disruption Risk" value={selected.tech_disruption_risk} />
                  <ViewRow label="Regulatory Moat" value={selected.regulatory_moat} />
                  <ViewRow label="Gross Margin" value={selected.gross_margin} />
                  <ViewRow label="SDE Margin" value={selected.sde_margin} />
                  <ViewRow label="Buy Multiple" value={selected.buy_multiple} />
                </div>
                {selected.research_notes && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Research Notes</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{selected.research_notes}</p>
                  </div>
                )}
                <div className="flex justify-end mt-6 pt-4 border-t border-border">
                  <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 mr-auto gap-1" onClick={() => setModalMode('confirm-delete')}><Trash2 size={13} /> Delete</Button>
                  <Button variant="secondary" size="sm" onClick={closeModal}>Close</Button>
                </div>
              </div>
            )}

            {/* ADD / EDIT */}
            {(modalMode === 'add' || modalMode === 'edit') && (
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-xl text-foreground">{modalMode === 'add' ? 'Add Vertical' : 'Edit Vertical'}</h3>
                  <Button variant="ghost" size="icon-sm" onClick={closeModal}><X size={16} /></Button>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <FieldLabel>Name</FieldLabel>
                      <input className={inputCls} value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="e.g. Pest Control (B2B Commercial)" />
                    </div>
                    <div className="col-span-2">
                      <FieldLabel>Short Description</FieldLabel>
                      <input className={inputCls} value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} placeholder="e.g. Growing climate-driven demand" />
                    </div>
                    <div>
                      <FieldLabel>Verdict</FieldLabel>
                      <select className={inputCls} value={draft.verdict} onChange={(e) => setDraft((d) => ({ ...d, verdict: e.target.value as Verdict }))}>
                        <option>Pursue</option>
                        <option>Conditional</option>
                        <option>Avoid</option>
                      </select>
                    </div>
                    <div>
                      <FieldLabel>Demand Trajectory</FieldLabel>
                      <input className={inputCls} value={draft.demand_trajectory} onChange={(e) => setDraft((d) => ({ ...d, demand_trajectory: e.target.value }))} placeholder="e.g. Growing" />
                    </div>
                    <div>
                      <FieldLabel>Demand Colour</FieldLabel>
                      <select className={inputCls} value={draft.demand_color} onChange={(e) => setDraft((d) => ({ ...d, demand_color: e.target.value as Vertical['demand_color'] }))}>
                        {DEMAND_COLOR_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <FieldLabel>Recession Sensitivity</FieldLabel>
                      <input className={inputCls} value={draft.recession_sensitivity} onChange={(e) => setDraft((d) => ({ ...d, recession_sensitivity: e.target.value }))} placeholder="e.g. Non-deferrable" />
                    </div>
                    <div>
                      <FieldLabel>Tech Disruption Risk</FieldLabel>
                      <input className={inputCls} value={draft.tech_disruption_risk} onChange={(e) => setDraft((d) => ({ ...d, tech_disruption_risk: e.target.value }))} placeholder="e.g. Low" />
                    </div>
                    <div>
                      <FieldLabel>Regulatory Moat</FieldLabel>
                      <input className={inputCls} value={draft.regulatory_moat} onChange={(e) => setDraft((d) => ({ ...d, regulatory_moat: e.target.value }))} placeholder="e.g. High" />
                    </div>
                    <div>
                      <FieldLabel>Gross Margin Range</FieldLabel>
                      <input className={inputCls} value={draft.gross_margin} onChange={(e) => setDraft((d) => ({ ...d, gross_margin: e.target.value }))} placeholder="e.g. 60–80%" />
                    </div>
                    <div>
                      <FieldLabel>SDE Margin Range</FieldLabel>
                      <input className={inputCls} value={draft.sde_margin} onChange={(e) => setDraft((d) => ({ ...d, sde_margin: e.target.value }))} placeholder="e.g. 28–35%" />
                    </div>
                    <div>
                      <FieldLabel>Buy Multiple Range</FieldLabel>
                      <input className={inputCls} value={draft.buy_multiple} onChange={(e) => setDraft((d) => ({ ...d, buy_multiple: e.target.value }))} placeholder="e.g. 2.3–3.0×" />
                    </div>
                    <div className="col-span-2">
                      <FieldLabel>Research Notes</FieldLabel>
                      <textarea className={cn(inputCls, 'resize-none')} rows={5} value={draft.research_notes} onChange={(e) => setDraft((d) => ({ ...d, research_notes: e.target.value }))} placeholder="Qualitative notes, sourcing leads, licensing requirements…" />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <Button variant="secondary" size="sm" onClick={closeModal}>Cancel</Button>
                  <Button size="sm" onClick={submitSave} disabled={!draft.name.trim()}>
                    {modalMode === 'add' ? 'Add Vertical' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            )}

            {/* CONFIRM DELETE */}
            {modalMode === 'confirm-delete' && selected && (
              <div className="p-8">
                <h3 className="font-semibold text-xl text-foreground mb-3">Delete Vertical</h3>
                <p className="text-sm text-muted-foreground mb-1">Are you sure you want to delete <span className="text-foreground font-medium">{selected.name}</span>?</p>
                <p className="text-xs text-muted-foreground">This cannot be undone.</p>
                <div className="flex justify-end gap-2 mt-6">
                  <Button variant="secondary" size="sm" onClick={() => setModalMode('view')}>Cancel</Button>
                  <Button variant="destructive" size="sm" onClick={submitDelete}>Delete</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Helpers ─────────────────────────────────────────────────────── */

const inputCls = 'w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring'

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-1.5">{children}</p>
}

function ViewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  )
}
