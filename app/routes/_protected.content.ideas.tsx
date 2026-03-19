import { Form, useLoaderData, useNavigation } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { requireSession } from '~/lib/session.server'
import { StatusBadge } from '~/components/status-badge'

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, responseHeaders } = await requireSession(request)
  const { data: ideas } = await supabase
    .from('content_ideas')
    .select('*')
    .order('created_at', { ascending: false })
  return Response.json({ ideas: ideas ?? [] }, { headers: responseHeaders })
}

export async function action({ request }: ActionFunctionArgs) {
  const { session, supabase, responseHeaders } = await requireSession(request)
  const formData = await request.formData()
  const intent = formData.get('intent')

  if (intent === 'create') {
    await supabase.from('content_ideas').insert({
      user_id: session.user.id,
      title: String(formData.get('title')),
      format: String(formData.get('format') || ''),
      status: String(formData.get('status') || 'idea'),
      notes: String(formData.get('notes') || ''),
    })
  }

  if (intent === 'delete') {
    await supabase.from('content_ideas').delete().eq('id', String(formData.get('id')))
  }

  return Response.json({}, { headers: responseHeaders })
}

export default function ContentIdeas() {
  const { ideas } = useLoaderData<typeof loader>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === 'submitting'

  return (
    <div>
      <h1 className="font-serif text-3xl text-foreground mb-1">Content Ideas</h1>
      <p className="text-muted-foreground text-sm mb-8">Track ideas before they go to schedule.</p>

      <div className="bg-card border border-border rounded-lg p-6 mb-8">
        <h2 className="text-sm font-medium text-foreground mb-4">New Idea</h2>
        <Form method="post" className="grid grid-cols-2 gap-4">
          <input type="hidden" name="intent" value="create" />
          <input
            name="title"
            placeholder="Title"
            required
            className="col-span-2 bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            name="format"
            placeholder="Format (thread, article, video…)"
            className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <select
            name="status"
            className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="idea">Idea</option>
            <option value="in-progress">In Progress</option>
            <option value="ready">Ready</option>
          </select>
          <textarea
            name="notes"
            placeholder="Notes"
            rows={2}
            className="col-span-2 bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="col-span-2 bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Add Idea
          </button>
        </Form>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Title</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Format</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Notes</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {ideas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No ideas yet. Add one above.
                </td>
              </tr>
            )}
            {ideas.map((idea: any, i: number) => (
              <tr
                key={idea.id}
                className={`border-b border-border last:border-0 ${i % 2 === 1 ? 'bg-muted/20' : ''}`}
              >
                <td className="px-4 py-3 text-foreground">{idea.title}</td>
                <td className="px-4 py-3 text-muted-foreground">{idea.format}</td>
                <td className="px-4 py-3"><StatusBadge status={idea.status} /></td>
                <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{idea.notes}</td>
                <td className="px-4 py-3">
                  <Form method="post">
                    <input type="hidden" name="intent" value="delete" />
                    <input type="hidden" name="id" value={idea.id} />
                    <button
                      type="submit"
                      className="text-xs text-muted-foreground hover:text-destructive-foreground transition-colors"
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
    </div>
  )
}
