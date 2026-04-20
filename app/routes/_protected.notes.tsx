import { useEffect, useRef, useState } from 'react'
import { Form, useActionData, useLoaderData, useNavigation } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { requireSession } from '~/lib/session.server'

type NotesActionData = {
  ok: boolean
  intent: string
  message?: string
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, responseHeaders } = await requireSession(request)
  const { data: notes } = await supabase
    .from('notes')
    .select('*')
    .order('updated_at', { ascending: false })
  return Response.json({ notes: notes ?? [] }, { headers: responseHeaders })
}

export async function action({ request }: ActionFunctionArgs) {
  const { session, supabase, responseHeaders } = await requireSession(request)
  const formData = await request.formData()
  const intent = formData.get('intent')

  if (intent === 'create') {
    const { error } = await supabase.from('notes').insert({
      user_id: session.user.id,
      title: String(formData.get('title')),
      body: String(formData.get('body') || '') || null,
    })
    if (error) {
      console.error('create-note error:', error)
      return Response.json(
        {
          ok: false,
          intent: 'create',
          message: 'Failed to save note. Please try again.',
        },
        { headers: responseHeaders },
      )
    }

    return Response.json(
      {
        ok: true,
        intent: 'create',
        message: 'Note saved.',
      },
      { headers: responseHeaders },
    )
  }

  if (intent === 'update') {
    const id = String(formData.get('id'))
    const { error } = await supabase
      .from('notes')
      .update({
        title: String(formData.get('title')),
        body: String(formData.get('body') || '') || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (error) console.error('update-note error:', error)
  }

  if (intent === 'delete') {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', String(formData.get('id')))
    if (error) console.error('delete-note error:', error)
  }

  return Response.json({ ok: true, intent: String(intent ?? '') }, { headers: responseHeaders })
}

function NoteModal({ note, onClose }: { note: any; onClose: () => void }) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="bg-card border border-border rounded-lg p-8 w-full max-w-lg shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-2xl text-foreground tracking-wide">Edit Note</h2>
            <button
              onClick={onClose}
              className="text-xl text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              ×
            </button>
          </div>
          <Form method="post" className="flex flex-col gap-4" onSubmit={onClose}>
            <input type="hidden" name="intent" value="update" />
            <input type="hidden" name="id" value={note.id} />
            <input
              name="title"
              defaultValue={note.title}
              required
              placeholder="Title"
              className="bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <textarea
              name="body"
              defaultValue={note.body ?? ''}
              rows={8}
              placeholder="Note body..."
              className="bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <button
              type="submit"
              className="self-end bg-primary text-primary-foreground rounded-md px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
            >
              Save
            </button>
          </Form>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-lg p-8 w-full max-w-2xl max-h-[90vh] flex flex-col shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-6 shrink-0">
          <h2 className="font-semibold text-2xl text-foreground tracking-wide">{note.title}</h2>
          <button
            onClick={onClose}
            className="text-xl text-muted-foreground hover:text-foreground transition-colors cursor-pointer ml-4"
          >
            ×
          </button>
        </div>

        {note.body ? (
          <div className="mb-6 overflow-y-auto">
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{note.body}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mb-6">No content.</p>
        )}

        <p className="text-[11px] text-muted-foreground mb-6 shrink-0">
          Updated {new Date(note.updated_at).toLocaleDateString()}
        </p>

        <div className="flex items-center gap-3 pt-4 border-t border-border shrink-0">
          <button
            onClick={() => setEditing(true)}
            className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
          >
            Edit
          </button>
          <Form method="post">
            <input type="hidden" name="intent" value="delete" />
            <input type="hidden" name="id" value={note.id} />
            <button
              type="submit"
              onClick={(e) => {
                if (!window.confirm('Delete this note?')) e.preventDefault()
                else onClose()
              }}
              className="text-sm text-muted-foreground hover:text-destructive-foreground transition-colors cursor-pointer"
            >
              Delete
            </button>
          </Form>
        </div>
      </div>
    </div>
  )
}

export default function Notes() {
  const { notes } = useLoaderData<typeof loader>()
  const actionData = useActionData() as NotesActionData | undefined
  const navigation = useNavigation()
  const [newTitle, setNewTitle] = useState('')
  const [newBody, setNewBody] = useState('')
  const [selectedNote, setSelectedNote] = useState<any | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const pendingCreateRef = useRef<{ title: string; body: string } | null>(null)

  const isCreating =
    navigation.state === 'submitting' &&
    navigation.formData?.get('intent') === 'create'

  const optimisticNote = isCreating
    ? {
        id: 'optimistic-new-note',
        title: String(navigation.formData?.get('title') ?? ''),
        body: String(navigation.formData?.get('body') ?? ''),
        updated_at: new Date().toISOString(),
      }
    : null

  const visibleNotes = optimisticNote ? [optimisticNote, ...(notes as any[])] : (notes as any[])

  useEffect(() => {
    if (!actionData || actionData.intent !== 'create') return

    if (actionData.ok) {
      setToast({ type: 'success', message: actionData.message ?? 'Note saved.' })
      pendingCreateRef.current = null
      return
    }

    setToast({ type: 'error', message: actionData.message ?? 'Failed to save note.' })
    if (pendingCreateRef.current) {
      setNewTitle(pendingCreateRef.current.title)
      setNewBody(pendingCreateRef.current.body)
    }
  }, [actionData])

  useEffect(() => {
    if (!toast) return
    const timeoutId = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(timeoutId)
  }, [toast])

  return (
    <div>
      {/* New note form */}
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <h2 className="text-sm font-medium text-foreground mb-5">New Note</h2>
        <Form
          method="post"
          className="flex flex-col gap-4"
          onSubmit={() => {
            pendingCreateRef.current = { title: newTitle, body: newBody }
            setNewTitle('')
            setNewBody('')
          }}
        >
          <input type="hidden" name="intent" value="create" />
          <input
            name="title"
            placeholder="Title"
            required
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <textarea
            name="body"
            placeholder="Note body..."
            rows={3}
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            className="bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isCreating}
              className="bg-primary text-primary-foreground rounded-md px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
            >
              Add
            </button>
          </div>
            {toast && (
              <div
                role="status"
                className={`fixed bottom-4 right-4 z-50 rounded-md border px-4 py-3 text-sm shadow-lg ${
                  toast.type === 'error'
                    ? 'border-destructive/40 bg-destructive/15 text-destructive-foreground'
                    : 'border-border bg-card text-foreground'
                }`}
              >
                {toast.message}
              </div>
            )}

        </Form>
      </div>

      {/* Notes table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-5 py-3.5 text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Title</th>
              <th className="text-left px-5 py-3.5 text-[11px] text-muted-foreground font-medium uppercase tracking-wide hidden md:table-cell">Body</th>
              <th className="text-left px-5 py-3.5 text-[11px] text-muted-foreground font-medium uppercase tracking-wide hidden md:table-cell">Updated</th>
              <th className="px-5 py-3.5"></th>
            </tr>
          </thead>
          <tbody>
            {visibleNotes.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-muted-foreground">
                  No notes yet.
                </td>
              </tr>
            )}
            {visibleNotes.map((note: any, i: number) => {
              const isOptimisticRow = note.id === 'optimistic-new-note'

              return (
              <tr
                key={note.id}
                onClick={() => {
                  if (!isOptimisticRow) setSelectedNote(note)
                }}
                className={`border-b border-border last:border-0 transition-colors ${
                  isOptimisticRow
                    ? 'cursor-default bg-muted/40'
                    : 'cursor-pointer hover:bg-muted/10'
                } ${i % 2 === 1 ? 'bg-muted/20' : ''}`}
              >
                <td className="px-5 py-3.5 text-foreground font-medium">{note.title}</td>
                <td className="px-5 py-3.5 text-muted-foreground max-w-[300px] truncate hidden md:table-cell">
                  {note.body || '—'}
                </td>
                <td className="px-5 py-3.5 font-mono text-muted-foreground hidden md:table-cell">
                  {isOptimisticRow ? 'Saving...' : new Date(note.updated_at).toLocaleDateString()}
                </td>
                <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                  {isOptimisticRow ? null : (
                    <Form method="post">
                      <input type="hidden" name="intent" value="delete" />
                      <input type="hidden" name="id" value={note.id} />
                      <button
                        type="submit"
                        onClick={(e) => {
                          if (!window.confirm('Delete this note?')) e.preventDefault()
                        }}
                        className="text-xs text-muted-foreground hover:text-destructive-foreground transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                    </Form>
                  )}
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {selectedNote && (
        <NoteModal note={selectedNote} onClose={() => setSelectedNote(null)} />
      )}
    </div>
  )
}
