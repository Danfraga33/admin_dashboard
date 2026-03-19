import { Form, useLoaderData } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { requireSession } from '~/lib/session.server'

type ComplianceTask = { id: string; task: string; due_date: string | null; done: boolean }
type Entity = {
  id: string
  name: string
  jurisdiction: string
  compliance_tasks: ComplianceTask[]
  advisor_status: string | null
  next_filing_date: string | null
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, supabase, responseHeaders } = await requireSession(request)

  let { data: entities } = await supabase
    .from('entities')
    .select('*')
    .order('jurisdiction', { ascending: true })

  if (!entities || entities.length === 0) {
    await supabase.from('entities').insert([
      { user_id: session.user.id, name: 'Fraga Ventures Pty Ltd', jurisdiction: 'AU', compliance_tasks: [] },
      { user_id: session.user.id, name: 'Fraga Ventures LLC', jurisdiction: 'US', compliance_tasks: [] },
    ])
    const { data: seeded } = await supabase.from('entities').select('*').order('jurisdiction')
    entities = seeded
  }

  return Response.json({ entities: entities ?? [] }, { headers: responseHeaders })
}

export async function action({ request }: ActionFunctionArgs) {
  const { supabase, responseHeaders } = await requireSession(request)
  const formData = await request.formData()
  const intent = formData.get('intent')
  const entityId = String(formData.get('entity_id'))

  if (intent === 'add_task') {
    const { data: entity } = await supabase.from('entities').select('compliance_tasks').eq('id', entityId).single()
    const tasks: ComplianceTask[] = entity?.compliance_tasks ?? []
    tasks.push({
      id: crypto.randomUUID(),
      task: String(formData.get('task')),
      due_date: String(formData.get('due_date') || '') || null,
      done: false,
    })
    await supabase.from('entities').update({ compliance_tasks: tasks }).eq('id', entityId)
  }

  if (intent === 'toggle_task') {
    const taskId = String(formData.get('task_id'))
    const { data: entity } = await supabase.from('entities').select('compliance_tasks').eq('id', entityId).single()
    const tasks: ComplianceTask[] = (entity?.compliance_tasks ?? []).map((t: ComplianceTask) =>
      t.id === taskId ? { ...t, done: !t.done } : t
    )
    await supabase.from('entities').update({ compliance_tasks: tasks }).eq('id', entityId)
  }

  if (intent === 'update_meta') {
    await supabase.from('entities').update({
      advisor_status: String(formData.get('advisor_status') || '') || null,
      next_filing_date: String(formData.get('next_filing_date') || '') || null,
    }).eq('id', entityId)
  }

  return Response.json({}, { headers: responseHeaders })
}

function EntityCard({ entity }: { entity: Entity }) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="font-display text-xl text-foreground tracking-wide">{entity.name}</h2>
          <p className="text-[11px] text-muted-foreground uppercase tracking-widest mt-1">{entity.jurisdiction}</p>
        </div>
      </div>

      <Form method="post" className="grid grid-cols-2 gap-3 mb-6">
        <input type="hidden" name="intent" value="update_meta" />
        <input type="hidden" name="entity_id" value={entity.id} />
        <div>
          <label className="block text-[11px] text-muted-foreground uppercase tracking-wide mb-1.5">Advisor Status</label>
          <input name="advisor_status" defaultValue={entity.advisor_status ?? ''} placeholder="e.g. Active — Jane Smith" className="w-full bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="block text-[11px] text-muted-foreground uppercase tracking-wide mb-1.5">Next Filing Date</label>
          <input name="next_filing_date" type="date" defaultValue={entity.next_filing_date ?? ''} className="w-full bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <button type="submit" className="col-span-2 text-xs text-muted-foreground hover:text-primary transition-colors text-left cursor-pointer">Save meta</button>
      </Form>

      <div className="mb-5">
        <h3 className="text-[11px] text-muted-foreground uppercase tracking-widest mb-3">Compliance Tasks</h3>
        {entity.compliance_tasks.length === 0 && (
          <p className="text-sm text-muted-foreground">No tasks yet.</p>
        )}
        <ul className="space-y-2.5">
          {entity.compliance_tasks.map((t) => (
            <li key={t.id} className="flex items-start gap-3">
              <Form method="post">
                <input type="hidden" name="intent" value="toggle_task" />
                <input type="hidden" name="entity_id" value={entity.id} />
                <input type="hidden" name="task_id" value={t.id} />
                <button
                  type="submit"
                  className={`mt-0.5 w-4 h-4 rounded border transition-colors flex-shrink-0 cursor-pointer ${t.done ? 'bg-primary/20 border-primary' : 'bg-input border-border hover:border-primary'}`}
                  aria-label={`Toggle ${t.task}`}
                />
              </Form>
              <div>
                <p className={`text-sm leading-relaxed ${t.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{t.task}</p>
                {t.due_date && <p className="font-mono text-xs text-muted-foreground mt-0.5">{t.due_date}</p>}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <Form method="post" className="flex gap-2">
        <input type="hidden" name="intent" value="add_task" />
        <input type="hidden" name="entity_id" value={entity.id} />
        <input name="task" placeholder="New compliance task" required className="flex-1 bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        <input name="due_date" type="date" className="bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        <button type="submit" className="bg-primary text-primary-foreground rounded-md px-3 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer">Add</button>
      </Form>
    </div>
  )
}

export default function Entities() {
  const { entities } = useLoaderData<typeof loader>()

  return (
    <div>
      <h1 className="font-display text-4xl text-foreground mb-1 tracking-wide">Entity Health</h1>
      <p className="text-muted-foreground text-sm mb-10 leading-relaxed">Compliance and advisor status for both entities.</p>
      <div className="grid grid-cols-2 gap-6">
        {(entities as Entity[]).map((entity) => (
          <EntityCard key={entity.id} entity={entity} />
        ))}
      </div>
    </div>
  )
}
