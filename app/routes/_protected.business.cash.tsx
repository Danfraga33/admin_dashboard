import { Form, useLoaderData, useNavigation } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { requireSession } from '~/lib/session.server'
import { StatCard } from '~/components/stat-card'

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, responseHeaders } = await requireSession(request)

  const { data: all } = await supabase
    .from('cash_positions')
    .select('*')
    .order('recorded_at', { ascending: false })

  const latest: Record<string, any> = {}
  for (const row of all ?? []) {
    if (!latest[row.entity_name]) latest[row.entity_name] = row
  }

  return Response.json({ latest, history: all ?? [] }, { headers: responseHeaders })
}

export async function action({ request }: ActionFunctionArgs) {
  const { session, supabase, responseHeaders } = await requireSession(request)
  const formData = await request.formData()

  await supabase.from('cash_positions').insert({
    user_id: session.user.id,
    entity_name: String(formData.get('entity_name')),
    balance: Number(formData.get('balance')),
    currency: String(formData.get('currency')),
  })

  return Response.json({}, { headers: responseHeaders })
}

export default function Cash() {
  const { latest, history } = useLoaderData<typeof loader>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === 'submitting'

  const au = latest['Fraga Ventures Pty Ltd']
  const us = latest['Fraga Ventures LLC']

  return (
    <div>
      <h1 className="font-serif text-3xl text-foreground mb-1">Cash Position</h1>
      <p className="text-muted-foreground text-sm mb-8">Manual balances. Basiq API integration coming later.</p>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatCard label="Fraga Ventures Pty Ltd (AUD)" value={au ? `$${Number(au.balance).toLocaleString()}` : null} />
        <StatCard label="Fraga Ventures LLC (USD)" value={us ? `$${Number(us.balance).toLocaleString()}` : null} />
      </div>

      <div className="bg-card border border-border rounded-lg p-6 mb-8">
        <h2 className="text-sm font-medium text-foreground mb-4">Log Balance</h2>
        <Form method="post" className="grid grid-cols-3 gap-4">
          <select name="entity_name" required className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="Fraga Ventures Pty Ltd">Fraga Ventures Pty Ltd (AU)</option>
            <option value="Fraga Ventures LLC">Fraga Ventures LLC (US)</option>
          </select>
          <input name="balance" type="number" step="0.01" placeholder="Balance" required className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          <select name="currency" className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="AUD">AUD</option>
            <option value="USD">USD</option>
          </select>
          <button type="submit" disabled={isSubmitting} className="col-span-3 bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">Save Balance</button>
        </Form>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border">
            <th className="text-left px-4 py-3 text-muted-foreground font-medium">Entity</th>
            <th className="text-left px-4 py-3 text-muted-foreground font-medium">Balance</th>
            <th className="text-left px-4 py-3 text-muted-foreground font-medium">Currency</th>
            <th className="text-left px-4 py-3 text-muted-foreground font-medium">Recorded</th>
          </tr></thead>
          <tbody>
            {history.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No balances logged yet.</td></tr>}
            {(history as any[]).map((row, i) => (
              <tr key={row.id} className={`border-b border-border last:border-0 ${i % 2 === 1 ? 'bg-muted/20' : ''}`}>
                <td className="px-4 py-3 text-foreground">{row.entity_name}</td>
                <td className="px-4 py-3 font-mono text-foreground">${Number(row.balance).toLocaleString()}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.currency}</td>
                <td className="px-4 py-3 font-mono text-muted-foreground">{new Date(row.recorded_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
