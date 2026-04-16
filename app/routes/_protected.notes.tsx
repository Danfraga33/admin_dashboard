import { useState } from 'react'
import { Form, useLoaderData, useNavigation } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { requireSession } from '~/lib/session.server'

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
    if (error) console.error('create-note error:', error)
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

  return Response.json({}, { headers: responseHeaders })
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
              onClick={onClose}
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
  const navigation = useNavigation()
  const isSubmitting = navigation.state === 'submitting'
  const [selectedNote, setSelectedNote] = useState<any | null>(null)

  return (
    <div>
      {/* New note form */}
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <h2 className="text-sm font-medium text-foreground mb-5">New Note</h2>
        <Form method="post" className="flex flex-col gap-4">
          <input type="hidden" name="intent" value="create" />
          <input
            name="title"
            placeholder="Title"
            required
            className="bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <textarea
            name="body"
            placeholder="Note body..."
            rows={3}
            className="bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary text-primary-foreground rounded-md px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
            >
              Add
            </button>
          </div>
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
            {(notes as any[]).length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-muted-foreground">
                  No notes yet.
                </td>
              </tr>
            )}
            {(notes as any[]).map((note: any, i: number) => (
              <tr
                key={note.id}
                onClick={() => setSelectedNote(note)}
                className={`border-b border-border last:border-0 cursor-pointer hover:bg-muted/10 transition-colors ${i % 2 === 1 ? 'bg-muted/20' : ''}`}
              >
                <td className="px-5 py-3.5 text-foreground font-medium">{note.title}</td>
                <td className="px-5 py-3.5 text-muted-foreground max-w-[300px] truncate hidden md:table-cell">
                  {note.body || '—'}
                </td>
                <td className="px-5 py-3.5 font-mono text-muted-foreground hidden md:table-cell">
                  {new Date(note.updated_at).toLocaleDateString()}
                </td>
                <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                  <Form method="post">
                    <input type="hidden" name="intent" value="delete" />
                    <input type="hidden" name="id" value={note.id} />
                    <button
                      type="submit"
                      className="text-xs text-muted-foreground hover:text-destructive-foreground transition-colors cursor-pointer"
                    >
                      Delete
                    </button>
                  </Form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedNote && (
        <NoteModal note={selectedNote} onClose={() => setSelectedNote(null)} />
      )}
    </div>
  )
}
