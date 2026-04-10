import { useState } from 'react'
import { Form, useLoaderData, useNavigation } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { requireSession } from '~/lib/session.server'
import { StatusBadge } from '~/components/status-badge'


export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, responseHeaders } = await requireSession(request)
  const { data: todos } = await supabase
    .from('todos')
    .select('*')
    .order('due_date', { ascending: true })
  return Response.json({ todos: todos ?? [] }, { headers: responseHeaders })
}

export async function action({ request }: ActionFunctionArgs) {
  const { session, supabase, responseHeaders } = await requireSession(request)
  const formData = await request.formData()
  const intent = formData.get('intent')

  if (intent === 'create') {
    const { error } = await supabase.from('todos').insert({
      user_id: session.user.id,
      task: String(formData.get('task')),
      description: String(formData.get('description') || '') || null,
      priority: String(formData.get('priority') || 'medium'),
      due_date: String(formData.get('due_date') || '') || null,
    })
    if (error) console.error('create-todo error:', error)
  }

  if (intent === 'toggle') {
    const id = String(formData.get('id'))
    const completed = formData.get('completed') === 'true'
    const { error } = await supabase.from('todos').update({ completed: !completed }).eq('id', id)
    if (error) console.error('toggle-todo error:', error)
  }

  if (intent === 'update') {
    const id = String(formData.get('id'))
    const { error } = await supabase.from('todos').update({
      task: String(formData.get('task')),
      description: String(formData.get('description') || '') || null,
      priority: String(formData.get('priority') || 'medium'),
      due_date: String(formData.get('due_date') || '') || null,
    }).eq('id', id)
    if (error) console.error('update-todo error:', error)
  }

  if (intent === 'delete') {
    const { error } = await supabase.from('todos').delete().eq('id', String(formData.get('id')))
    if (error) console.error('delete-todo error:', error)
  }

  return Response.json({}, { headers: responseHeaders })
}

function TodoModal({ todo, onClose }: { todo: any; onClose: () => void }) {
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
            <h2 className="font-semibold text-2xl text-foreground tracking-wide">Edit Task</h2>
            <button
              onClick={onClose}
              className="text-xl text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              ×
            </button>
          </div>
          <Form method="post" className="grid grid-cols-3 gap-4" onSubmit={onClose}>
            <input type="hidden" name="intent" value="update" />
            <input type="hidden" name="id" value={todo.id} />
            <input
              name="task"
              defaultValue={todo.task}
              required
              className="col-span-3 bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <textarea
              name="description"
              defaultValue={todo.description ?? ''}
              rows={3}
              className="col-span-3 bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <select
              name="priority"
              defaultValue={todo.priority}
              className="bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <input
              name="due_date"
              type="date"
              defaultValue={todo.due_date ?? ''}
              className="bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              className="bg-primary text-primary-foreground rounded-md px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
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
        className="bg-card border border-border rounded-lg p-8 w-full max-w-lg shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-2xl text-foreground tracking-wide">{todo.task}</h2>
            <div className="flex items-center gap-3 mt-2">
              <StatusBadge status={todo.priority} />
              {todo.due_date && (
                <span className="font-mono text-xs text-muted-foreground">{todo.due_date}</span>
              )}
              <span className="text-xs text-muted-foreground">
                {todo.completed ? 'Completed' : 'Open'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-xl text-muted-foreground hover:text-foreground transition-colors cursor-pointer ml-4"
          >
            ×
          </button>
        </div>

        {todo.description ? (
          <div className="mb-6">
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-2">Description</p>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{todo.description}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mb-6">No description.</p>
        )}

        <div className="flex items-center gap-3 pt-4 border-t border-border">
          <Form method="post">
            <input type="hidden" name="intent" value="toggle" />
            <input type="hidden" name="id" value={todo.id} />
            <input type="hidden" name="completed" value={String(todo.completed)} />
            <button
              type="submit"
              onClick={onClose}
              className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
            >
              {todo.completed ? 'Mark Open' : 'Mark Complete'}
            </button>
          </Form>
          <button
            onClick={() => setEditing(true)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Edit
          </button>
          <Form method="post">
            <input type="hidden" name="intent" value="delete" />
            <input type="hidden" name="id" value={todo.id} />
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

export default function Todos() {
  const { todos } = useLoaderData<typeof loader>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === 'submitting'
  const open = (todos as any[]).filter((t: any) => !t.completed)
  const done = (todos as any[]).filter((t: any) => t.completed)
  const [selectedTodo, setSelectedTodo] = useState<any | null>(null)

  return (
    <div>
      <div className="bg-card border border-border rounded-lg p-6 mb-10">
        <h2 className="text-sm font-medium text-foreground mb-5">New Task</h2>
        <Form method="post" className="grid grid-cols-3 gap-4">
          <input type="hidden" name="intent" value="create" />
          <input name="task" placeholder="Task" required className="col-span-3 bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          <textarea name="description" placeholder="Description" rows={2} className="col-span-3 bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          <select name="priority" defaultValue="medium" className="bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <input name="due_date" type="date" className="bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          <button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground rounded-md px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer">Add</button>
        </Form>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden mb-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="w-10 px-5 py-3.5"></th>
              <th className="text-left px-5 py-3.5 text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Task</th>
              <th className="text-left px-5 py-3.5 text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Description</th>
              <th className="text-left px-5 py-3.5 text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Priority</th>
              <th className="text-left px-5 py-3.5 text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Due</th>
              <th className="px-5 py-3.5"></th>
            </tr>
          </thead>
          <tbody>
            {open.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">All done!</td></tr>}
            {open.map((todo: any, i: number) => (
              <tr
                key={todo.id}
                onClick={() => setSelectedTodo(todo)}
                className={`border-b border-border last:border-0 cursor-pointer hover:bg-muted/10 transition-colors ${i % 2 === 1 ? 'bg-muted/20' : ''}`}
              >
                <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                  <Form method="post">
                    <input type="hidden" name="intent" value="toggle" />
                    <input type="hidden" name="id" value={todo.id} />
                    <input type="hidden" name="completed" value={String(todo.completed)} />
                    <button type="submit" className="w-4 h-4 rounded border border-border bg-input hover:border-primary transition-colors cursor-pointer" aria-label={`Complete ${todo.task}`} />
                  </Form>
                </td>
                <td className="px-5 py-3.5 text-foreground">{todo.task}</td>
                <td className="px-5 py-3.5 text-muted-foreground max-w-[200px] truncate">{todo.description || '—'}</td>
                <td className="px-5 py-3.5"><StatusBadge status={todo.priority} /></td>
                <td className="px-5 py-3.5 font-mono text-muted-foreground">{todo.due_date ?? '—'}</td>
                <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                  <Form method="post">
                    <input type="hidden" name="intent" value="delete" />
                    <input type="hidden" name="id" value={todo.id} />
                    <button type="submit" className="text-xs text-muted-foreground hover:text-destructive-foreground transition-colors cursor-pointer">Delete</button>
                  </Form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {done.length > 0 && (
        <details className="bg-card border border-border rounded-lg overflow-hidden">
          <summary className="px-5 py-3.5 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
            Completed ({done.length})
          </summary>
          <table className="w-full text-sm">
            <tbody>
              {done.map((todo: any, i: number) => (
                <tr
                  key={todo.id}
                  onClick={() => setSelectedTodo(todo)}
                  className={`border-b border-border last:border-0 cursor-pointer hover:bg-muted/10 transition-colors ${i % 2 === 1 ? 'bg-muted/20' : ''}`}
                >
                  <td className="w-10 px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <Form method="post">
                      <input type="hidden" name="intent" value="toggle" />
                      <input type="hidden" name="id" value={todo.id} />
                      <input type="hidden" name="completed" value={String(todo.completed)} />
                      <button type="submit" className="w-4 h-4 rounded border border-primary bg-primary/20 transition-colors cursor-pointer" aria-label={`Uncomplete ${todo.task}`} />
                    </Form>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground line-through">{todo.task}</td>
                  <td className="px-5 py-3.5 text-muted-foreground max-w-[200px] truncate">{todo.description || '—'}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={todo.priority} /></td>
                  <td className="px-5 py-3.5 font-mono text-muted-foreground">{todo.due_date ?? '—'}</td>
                  <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <Form method="post">
                      <input type="hidden" name="intent" value="delete" />
                      <input type="hidden" name="id" value={todo.id} />
                      <button type="submit" className="text-xs text-muted-foreground hover:text-destructive-foreground transition-colors cursor-pointer">Delete</button>
                    </Form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}

      {selectedTodo && (
        <TodoModal todo={selectedTodo} onClose={() => setSelectedTodo(null)} />
      )}
    </div>
  )
}
