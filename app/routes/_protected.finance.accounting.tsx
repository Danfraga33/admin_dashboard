import { useState } from 'react'
import { useLoaderData, useFetcher } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { requireSession } from '~/lib/session.server'
import { X, Pencil, Trash2, Plus } from 'lucide-react'

type AccountStatus = 'Active' | 'Inactive' | 'Under Review'

const STATUSES: AccountStatus[] = ['Active', 'Inactive', 'Under Review']

const STATUS_BADGE: Record<AccountStatus, string> = {
  Active: 'badge-success',
  Inactive: 'badge-neutral',
  'Under Review': 'badge-warning',
}

interface Account {
  id: string
  name: string
  description: string
  focus: string
  annual_price: string
  monthly_price: string
  contact_name: string
  status: AccountStatus
  notes: string
}

const EMPTY_ACCOUNT: Omit<Account, 'id'> = {
  name: '',
  description: '',
  focus: '',
  annual_price: '',
  monthly_price: '',
  contact_name: '',
  status: 'Active',
  notes: '',
}

type ModalMode = 'view' | 'edit' | 'add' | 'confirm-delete'

function formatCurrency(raw: string): string {
  const digits = raw.replace(/[^0-9.]/g, '')
  if (!digits) return raw
  const num = parseFloat(digits)
  if (isNaN(num)) return raw
  return '$' + num.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function stripToDigits(val: string): string {
  return val.replace(/[^0-9.]/g, '')
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, responseHeaders } = await requireSession(request)
  const { data } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: true })
  return Response.json({ accounts: (data ?? []) as Account[] }, { headers: responseHeaders })
}

export async function action({ request }: ActionFunctionArgs) {
  const { session, supabase, responseHeaders } = await requireSession(request)
  const form = await request.formData()
  const intent = form.get('intent') as string

  if (intent === 'create') {
    await supabase.from('accounts').insert({
      user_id: session.user.id,
      name: String(form.get('name') || ''),
      description: String(form.get('description') || ''),
      focus: String(form.get('focus') || ''),
      annual_price: String(form.get('annual_price') || ''),
      monthly_price: String(form.get('monthly_price') || ''),
      contact_name: String(form.get('contact_name') || ''),
      status: String(form.get('status') || 'Active'),
      notes: String(form.get('notes') || ''),
    })
  }

  if (intent === 'update') {
    await supabase
      .from('accounts')
      .update({
        name: String(form.get('name') || ''),
        description: String(form.get('description') || ''),
        focus: String(form.get('focus') || ''),
        annual_price: String(form.get('annual_price') || ''),
        monthly_price: String(form.get('monthly_price') || ''),
        contact_name: String(form.get('contact_name') || ''),
        status: String(form.get('status') || 'Active'),
        notes: String(form.get('notes') || ''),
      })
      .eq('id', String(form.get('id')))
  }

  if (intent === 'delete') {
    await supabase.from('accounts').delete().eq('id', String(form.get('id')))
  }

  return Response.json({}, { headers: responseHeaders })
}

export default function Accounting() {
  const { accounts } = useLoaderData<typeof loader>()
  const fetcher = useFetcher()

  const [selected, setSelected] = useState<Account | null>(null)
  const [mode, setMode] = useState<ModalMode>('view')
  const [draft, setDraft] = useState<Omit<Account, 'id'>>(EMPTY_ACCOUNT)

  const isPending = fetcher.state !== 'idle'
  const pendingIntent = fetcher.formData?.get('intent') as string | null

  const deletingId =
    isPending && pendingIntent === 'delete'
      ? (fetcher.formData!.get('id') as string)
      : null

  const optimisticCreate: Account | null =
    isPending && pendingIntent === 'create'
      ? {
          id: '__optimistic__',
          name: fetcher.formData!.get('name') as string,
          description: fetcher.formData!.get('description') as string,
          focus: fetcher.formData!.get('focus') as string,
          annual_price: fetcher.formData!.get('annual_price') as string,
          monthly_price: fetcher.formData!.get('monthly_price') as string,
          contact_name: fetcher.formData!.get('contact_name') as string,
          status: (fetcher.formData!.get('status') as AccountStatus) ?? 'Active',
          notes: fetcher.formData!.get('notes') as string,
        }
      : null

  const updatingId =
    isPending && pendingIntent === 'update'
      ? (fetcher.formData!.get('id') as string)
      : null

  const visibleAccounts: Account[] = [
    ...accounts
      .filter((a) => a.id !== deletingId)
      .map((a) =>
        a.id === updatingId
          ? {
              ...a,
              name: fetcher.formData!.get('name') as string,
              description: fetcher.formData!.get('description') as string,
              focus: fetcher.formData!.get('focus') as string,
              annual_price: fetcher.formData!.get('annual_price') as string,
              monthly_price: fetcher.formData!.get('monthly_price') as string,
              contact_name: fetcher.formData!.get('contact_name') as string,
              status: (fetcher.formData!.get('status') as AccountStatus) ?? a.status,
              notes: fetcher.formData!.get('notes') as string,
            }
          : a
      ),
    ...(optimisticCreate ? [optimisticCreate] : []),
  ]

  function openView(account: Account) {
    setSelected(account)
    setMode('view')
  }

  function openEdit(account: Account) {
    setDraft({
      name: account.name,
      description: account.description,
      focus: account.focus,
      annual_price: stripToDigits(account.annual_price),
      monthly_price: stripToDigits(account.monthly_price),
      contact_name: account.contact_name,
      status: account.status,
      notes: account.notes,
    })
    setSelected(account)
    setMode('edit')
  }

  function openAdd() {
    setDraft(EMPTY_ACCOUNT)
    setSelected(null)
    setMode('add')
  }

  function closeModal() {
    setSelected(null)
    setMode('view')
  }

  function submitEdit() {
    if (!selected) return
    fetcher.submit(
      {
        intent: 'update',
        id: selected.id,
        name: draft.name,
        description: draft.description,
        focus: draft.focus,
        annual_price: draft.annual_price ? formatCurrency(draft.annual_price) : '',
        monthly_price: draft.monthly_price ? formatCurrency(draft.monthly_price) : '',
        contact_name: draft.contact_name,
        status: draft.status,
        notes: draft.notes,
      },
      { method: 'post' }
    )
    closeModal()
  }

  function submitAdd() {
    fetcher.submit(
      {
        intent: 'create',
        name: draft.name,
        description: draft.description,
        focus: draft.focus,
        annual_price: draft.annual_price ? formatCurrency(draft.annual_price) : '',
        monthly_price: draft.monthly_price ? formatCurrency(draft.monthly_price) : '',
        contact_name: draft.contact_name,
        status: draft.status,
        notes: draft.notes,
      },
      { method: 'post' }
    )
    closeModal()
  }

  function confirmDelete(account: Account) {
    setSelected(account)
    setMode('confirm-delete')
  }

  function submitDelete() {
    if (!selected) return
    fetcher.submit({ intent: 'delete', id: selected.id }, { method: 'post' })
    closeModal()
  }

  const isModalOpen = selected !== null || mode === 'add'

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl text-foreground">Accounting</h1>
        <button onClick={openAdd} className="btn btn-primary btn-sm gap-2">
          <Plus size={15} />
          Add Account
        </button>
      </div>

      {visibleAccounts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No accounts yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleAccounts.map((account) => (
            <div
              key={account.id}
              className="rounded-xl border border-border bg-card p-5 cursor-pointer hover:border-primary/40 transition-colors group relative"
              onClick={() => openView(account)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-foreground truncate">{account.name}</h3>
                    <span className={`badge badge-sm p-2 ${STATUS_BADGE[account.status] ?? 'badge-neutral'}`}>
                      {account.status}
                    </span>
                  </div>
                  {account.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {account.description}
                    </p>
                  )}
                </div>
                <div
                  className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => openEdit(account)}
                    className="btn btn-ghost btn-xs p-1"
                    title="Edit"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => confirmDelete(account)}
                    className="btn btn-ghost btn-xs p-1 text-error"
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              {(account.annual_price || account.monthly_price) && (
                <div className="flex gap-3 mt-3 pt-3 border-t border-border">
                  {account.annual_price && (
                    <span className="text-xs text-muted-foreground">
                      <span className="text-foreground font-medium">{account.annual_price}</span>
                      /yr
                    </span>
                  )}
                  {account.monthly_price && (
                    <span className="text-xs text-muted-foreground">
                      <span className="text-foreground font-medium">{account.monthly_price}</span>
                      /mo
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <dialog className={`modal ${isModalOpen ? 'modal-open' : ''}`}>
        <div className="modal-box max-w-lg">
          {/* VIEW */}
          {mode === 'view' && selected && (
            <>
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="font-display text-2xl text-foreground">{selected.name}</h3>
                  <span className={`badge ${STATUS_BADGE[selected.status] ?? 'badge-neutral'}`}>
                    {selected.status}
                  </span>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => openEdit(selected)} className="btn btn-ghost btn-sm gap-1">
                    <Pencil size={14} /> Edit
                  </button>
                  <button onClick={closeModal} className="btn btn-ghost btn-sm btn-circle">
                    <X size={16} />
                  </button>
                </div>
              </div>
              <dl className="space-y-4">
                {selected.description && (
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Description</dt>
                    <dd className="text-sm text-foreground">{selected.description}</dd>
                  </div>
                )}
                {selected.focus && (
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Focus</dt>
                    <dd className="text-sm text-foreground">{selected.focus}</dd>
                  </div>
                )}
                {selected.annual_price && (
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Annual Price</dt>
                    <dd className="text-sm text-foreground">{selected.annual_price}</dd>
                  </div>
                )}
                {selected.monthly_price && (
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Monthly Price</dt>
                    <dd className="text-sm text-foreground">{selected.monthly_price}</dd>
                  </div>
                )}
                {selected.contact_name && (
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Point of Contact</dt>
                    <dd className="text-sm text-foreground">{selected.contact_name}</dd>
                  </div>
                )}
                {selected.notes && (
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Notes</dt>
                    <dd className="text-sm text-foreground whitespace-pre-wrap">{selected.notes}</dd>
                  </div>
                )}
              </dl>
            </>
          )}

          {/* EDIT / ADD */}
          {(mode === 'edit' || mode === 'add') && (
            <>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display text-xl text-foreground">
                  {mode === 'add' ? 'Add Account' : 'Edit Account'}
                </h3>
                <button onClick={closeModal} className="btn btn-ghost btn-sm btn-circle">
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-widest block mb-1">Name</label>
                  <input
                    className="input input-bordered w-full text-sm"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    placeholder="e.g. USGLOBALTAX"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-widest block mb-1">Description</label>
                  <input
                    className="input input-bordered w-full text-sm"
                    value={draft.description}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    placeholder="Short description"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-widest block mb-1">Focus</label>
                  <input
                    className="input input-bordered w-full text-sm"
                    value={draft.focus}
                    onChange={(e) => setDraft({ ...draft, focus: e.target.value })}
                    placeholder="e.g. US Tax Compliance"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-widest block mb-1">Annual Price</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <input
                        className="input input-bordered w-full text-sm pl-7"
                        value={draft.annual_price}
                        onChange={(e) => setDraft({ ...draft, annual_price: stripToDigits(e.target.value) })}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-widest block mb-1">Monthly Price</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <input
                        className="input input-bordered w-full text-sm pl-7"
                        value={draft.monthly_price}
                        onChange={(e) => setDraft({ ...draft, monthly_price: stripToDigits(e.target.value) })}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-widest block mb-1">Point of Contact</label>
                  <input
                    className="input input-bordered w-full text-sm"
                    value={draft.contact_name}
                    onChange={(e) => setDraft({ ...draft, contact_name: e.target.value })}
                    placeholder="e.g. John Smith"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-widest block mb-1">Status</label>
                  <select
                    className="select select-bordered w-full text-sm"
                    value={draft.status}
                    onChange={(e) => setDraft({ ...draft, status: e.target.value as AccountStatus })}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-widest block mb-1">Notes</label>
                  <textarea
                    className="textarea textarea-bordered w-full text-sm"
                    rows={3}
                    value={draft.notes}
                    onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                    placeholder="Any additional notes"
                  />
                </div>
              </div>
              <div className="modal-action">
                <button onClick={closeModal} className="btn btn-ghost btn-sm">Cancel</button>
                <button
                  onClick={mode === 'add' ? submitAdd : submitEdit}
                  className="btn btn-primary btn-sm"
                  disabled={!draft.name.trim()}
                >
                  {mode === 'add' ? 'Add' : 'Save'}
                </button>
              </div>
            </>
          )}

          {/* CONFIRM DELETE */}
          {mode === 'confirm-delete' && selected && (
            <>
              <h3 className="font-display text-xl text-foreground mb-4">Delete Account</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to delete <span className="text-foreground font-medium">{selected.name}</span>? This cannot be undone.
              </p>
              <div className="modal-action">
                <button onClick={closeModal} className="btn btn-ghost btn-sm">Cancel</button>
                <button onClick={submitDelete} className="btn btn-error btn-sm">Delete</button>
              </div>
            </>
          )}
        </div>
        <div className="modal-backdrop" onClick={closeModal} />
      </dialog>
    </div>
  )
}
