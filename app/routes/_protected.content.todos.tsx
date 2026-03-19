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
    await supabase.from('todos').insert({
      user_id: session.user.id,
      task: String(formData.get('task')),
      priority: String(formData.get('priority') || 'medium'),
      due_date: String(formData.get('due_date') || '') || null,
    })
  }

  if (intent === 'toggle') {
    const id = String(formData.get('id'))
    const completed = formData.get('completed') === 'true'
    await supabase.from('todos').update({ completed: !completed }).eq('id', id)
  }

  if (intent === 'delete') {
    await supabase.from('todos').delete().eq('id', String(formData.get('id')))
  }

  return Response.json({}, { headers: responseHeaders })
}

export default function Todos() {
  const { todos } = useLoaderData<typeof loader>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === 'submitting'
  const open = (todos as any[]).filter((t: any) => !t.completed)
  const done = (todos as any[]).filter((t: any) => t.completed)

  return (
    <div>
      <h1 className="font-display text-4xl text-foreground mb-1 tracking-wide">To-Dos</h1>
      <p className="text-muted-foreground text-sm mb-10 leading-relaxed">Tasks with priority and due date.</p>

      <div className="bg-card border border-border rounded-lg p-6 mb-10">
        <h2 className="text-sm font-medium text-foreground mb-5">New Task</h2>
        <Form method="post" className="grid grid-cols-3 gap-4">
          <input type="hidden" name="intent" value="create" />
          <input name="task" placeholder="Task" required className="col-span-3 bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
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
              <th className="text-left px-5 py-3.5 text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Priority</th>
              <th className="text-left px-5 py-3.5 text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Due</th>
              <th className="px-5 py-3.5"></th>
            </tr>
          </thead>
          <tbody>
            {open.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">All done!</td></tr>}
            {open.map((todo: any, i: number) => (
              <tr key={todo.id} className={`border-b border-border last:border-0 ${i % 2 === 1 ? 'bg-muted/20' : ''}`}>
                <td className="px-5 py-3.5">
                  <Form method="post">
                    <input type="hidden" name="intent" value="toggle" />
                    <input type="hidden" name="id" value={todo.id} />
                    <input type="hidden" name="completed" value={String(todo.completed)} />
                    <button type="submit" className="w-4 h-4 rounded border border-border bg-input hover:border-primary transition-colors cursor-pointer" aria-label={`Complete ${todo.task}`} />
                  </Form>
                </td>
                <td className="px-5 py-3.5 text-foreground">{todo.task}</td>
                <td className="px-5 py-3.5"><StatusBadge status={todo.priority} /></td>
                <td className="px-5 py-3.5 font-mono text-muted-foreground">{todo.due_date ?? '—'}</td>
                <td className="px-5 py-3.5">
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
                <tr key={todo.id} className={`border-b border-border last:border-0 ${i % 2 === 1 ? 'bg-muted/20' : ''}`}>
                  <td className="w-10 px-5 py-3.5">
                    <Form method="post">
                      <input type="hidden" name="intent" value="toggle" />
                      <input type="hidden" name="id" value={todo.id} />
                      <input type="hidden" name="completed" value={String(todo.completed)} />
                      <button type="submit" className="w-4 h-4 rounded border border-primary bg-primary/20 transition-colors cursor-pointer" aria-label={`Uncomplete ${todo.task}`} />
                    </Form>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground line-through">{todo.task}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={todo.priority} /></td>
                  <td className="px-5 py-3.5 font-mono text-muted-foreground">{todo.due_date ?? '—'}</td>
                  <td className="px-5 py-3.5">
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
    </div>
  )
}
