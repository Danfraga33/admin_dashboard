import { Form, useLoaderData, useNavigation } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { requireSession } from '~/lib/session.server'
import { StatCard } from '~/components/stat-card'

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, responseHeaders } = await requireSession(request)
  const { data: metrics } = await supabase
    .from('x_metrics')
    .select('*')
    .order('recorded_date', { ascending: false })
  const latest = metrics?.[0] ?? null
  return Response.json({ metrics: metrics ?? [], latest }, { headers: responseHeaders })
}

export async function action({ request }: ActionFunctionArgs) {
  const { session, supabase, responseHeaders } = await requireSession(request)
  const formData = await request.formData()

  await supabase.from('x_metrics').insert({
    user_id: session.user.id,
    recorded_date: String(formData.get('recorded_date')),
    followers: Number(formData.get('followers')) || null,
    impressions: Number(formData.get('impressions')) || null,
    profile_visits: Number(formData.get('profile_visits')) || null,
  })

  return Response.json({}, { headers: responseHeaders })
}

export default function XMetrics() {
  const { metrics, latest } = useLoaderData<typeof loader>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === 'submitting'

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl font-semibold text-foreground mb-1">X / Twitter Metrics</h1>
      <p className="text-muted-foreground text-sm mb-10 leading-relaxed">Manual snapshots. API integration coming later.</p>

      <div className="grid grid-cols-3 gap-5 mb-10">
        <StatCard label="Followers" value={latest?.followers ?? null} />
        <StatCard label="Impressions" value={latest?.impressions ?? null} />
        <StatCard label="Profile Visits" value={latest?.profile_visits ?? null} />
      </div>

      <div className="bg-card border border-border rounded-lg p-6 mb-10">
        <h2 className="text-sm font-medium text-foreground mb-5">Log Snapshot</h2>
        <Form method="post" className="grid grid-cols-4 gap-4">
          <div>
            <label htmlFor="recorded_date" className="block text-[11px] text-muted-foreground uppercase tracking-wide mb-1.5">Date</label>
            <input
              id="recorded_date"
              name="recorded_date"
              type="date"
              required
              className="w-full bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="followers" className="block text-[11px] text-muted-foreground uppercase tracking-wide mb-1.5">Followers</label>
            <input id="followers" name="followers" type="number" placeholder="0" className="w-full bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label htmlFor="impressions" className="block text-[11px] text-muted-foreground uppercase tracking-wide mb-1.5">Impressions</label>
            <input id="impressions" name="impressions" type="number" placeholder="0" className="w-full bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label htmlFor="profile_visits" className="block text-[11px] text-muted-foreground uppercase tracking-wide mb-1.5">Profile Visits</label>
            <input id="profile_visits" name="profile_visits" type="number" placeholder="0" className="w-full bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <button type="submit" disabled={isSubmitting} className="col-span-4 bg-primary text-primary-foreground rounded-md px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer">
            Save Snapshot
          </button>
        </Form>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-5 py-3.5 text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Date</th>
              <th className="text-left px-5 py-3.5 text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Followers</th>
              <th className="text-left px-5 py-3.5 text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Impressions</th>
              <th className="text-left px-5 py-3.5 text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Profile Visits</th>
            </tr>
          </thead>
          <tbody>
            {metrics.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-muted-foreground">No snapshots yet.</td></tr>
            )}
            {(metrics as any[]).map((m, i) => (
              <tr key={m.id} className={`border-b border-border last:border-0 ${i % 2 === 1 ? 'bg-muted/20' : ''}`}>
                <td className="px-5 py-3.5 font-mono text-foreground">{m.recorded_date}</td>
                <td className="px-5 py-3.5 font-mono text-foreground">{m.followers?.toLocaleString() ?? '—'}</td>
                <td className="px-5 py-3.5 font-mono text-foreground">{m.impressions?.toLocaleString() ?? '—'}</td>
                <td className="px-5 py-3.5 font-mono text-foreground">{m.profile_visits?.toLocaleString() ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
