import { Form, useLoaderData, useNavigation } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { requireSession } from '~/lib/session.server'
import { StatusBadge } from '~/components/status-badge'

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, responseHeaders } = await requireSession(request)
  const { data: schedule } = await supabase
    .from('content_schedule')
    .select('*')
    .order('post_date', { ascending: true })
  return Response.json({ schedule: schedule ?? [] }, { headers: responseHeaders })
}

export async function action({ request }: ActionFunctionArgs) {
  const { session, supabase, responseHeaders } = await requireSession(request)
  const formData = await request.formData()
  const intent = formData.get('intent')

  if (intent === 'create') {
    await supabase.from('content_schedule').insert({
      user_id: session.user.id,
      post_date: String(formData.get('post_date')),
      platform: String(formData.get('platform') || ''),
      topic: String(formData.get('topic') || ''),
      status: String(formData.get('status') || 'draft'),
    })
  }

  if (intent === 'delete') {
    await supabase.from('content_schedule').delete().eq('id', String(formData.get('id')))
  }

  return Response.json({}, { headers: responseHeaders })
}

export default function ContentSchedule() {
  const { schedule } = useLoaderData<typeof loader>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === 'submitting'

  return (
    <div>
      <h1 className="font-display text-3xl text-foreground mb-1">Content Schedule</h1>
      <p className="text-muted-foreground text-sm mb-8">Planned posts across platforms.</p>

      <div className="bg-card border border-border rounded-lg p-6 mb-8">
        <h2 className="text-sm font-medium text-foreground mb-4">New Entry</h2>
        <Form method="post" className="grid grid-cols-2 gap-4">
          <input type="hidden" name="intent" value="create" />
          <input
            name="post_date"
            type="date"
            required
            className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            name="platform"
            placeholder="Platform (X, LinkedIn…)"
            className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            name="topic"
            placeholder="Topic"
            className="col-span-2 bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <select
            name="status"
            className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
          </select>
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Add Entry
          </button>
        </Form>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Date</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Platform</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Topic</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {schedule.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No posts scheduled yet.
                </td>
              </tr>
            )}
            {(schedule as any[]).map((entry, i) => (
              <tr key={entry.id} className={`border-b border-border last:border-0 ${i % 2 === 1 ? 'bg-muted/20' : ''}`}>
                <td className="px-4 py-3 font-mono text-foreground">{entry.post_date}</td>
                <td className="px-4 py-3 text-muted-foreground">{entry.platform}</td>
                <td className="px-4 py-3 text-foreground">{entry.topic}</td>
                <td className="px-4 py-3"><StatusBadge status={entry.status} /></td>
                <td className="px-4 py-3">
                  <Form method="post">
                    <input type="hidden" name="intent" value="delete" />
                    <input type="hidden" name="id" value={entry.id} />
                    <button type="submit" className="text-xs text-muted-foreground hover:text-destructive-foreground transition-colors">Delete</button>
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
