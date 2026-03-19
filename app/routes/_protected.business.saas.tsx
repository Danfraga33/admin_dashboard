import { useLoaderData } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { requireSession } from '~/lib/session.server'
import { StatCard } from '~/components/stat-card'

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, responseHeaders } = await requireSession(request)

  const { data: businesses } = await supabase
    .from('saas_businesses')
    .select('*, saas_metrics(*)')
    .order('acquired_at', { ascending: true })

  return Response.json({ businesses: businesses ?? [] }, { headers: responseHeaders })
}

export default function SaasHealth() {
  const { businesses } = useLoaderData<typeof loader>()

  if (businesses.length === 0) {
    return (
      <div>
        <h1 className="font-serif text-3xl text-foreground mb-1">SaaS Health</h1>
        <p className="text-muted-foreground text-sm mb-8">Portfolio metrics per business.</p>
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <p className="font-serif text-xl text-foreground mb-2">No businesses yet.</p>
          <p className="text-muted-foreground text-sm">First acquisition will appear here once the deal closes.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="font-serif text-3xl text-foreground mb-1">SaaS Health</h1>
      <p className="text-muted-foreground text-sm mb-8">Portfolio metrics per business.</p>

      <div className="space-y-8">
        {(businesses as any[]).map((biz) => {
          const metrics = biz.saas_metrics ?? []
          const latest = metrics.sort((a: any, b: any) =>
            b.recorded_month.localeCompare(a.recorded_month)
          )[0] ?? null

          return (
            <div key={biz.id} className="bg-card border border-border rounded-lg p-6">
              <div className="mb-6">
                <h2 className="font-serif text-2xl text-foreground">{biz.name}</h2>
                {biz.acquired_at && (
                  <p className="text-xs text-muted-foreground">
                    Acquired {new Date(biz.acquired_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-5 gap-4">
                <StatCard label="MRR" value={latest?.mrr ? `$${Number(latest.mrr).toLocaleString()}` : null} />
                <StatCard label="NRR" value={latest?.nrr ? `${latest.nrr}%` : null} />
                <StatCard label="Churn Rate" value={latest?.churn_rate ? `${latest.churn_rate}%` : null} />
                <StatCard label="Active Users" value={latest?.active_users ?? null} />
                <StatCard label="MoM Growth" value={latest?.mom_growth ? `${latest.mom_growth}%` : null} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
