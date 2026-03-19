import { Form, useLoaderData, useNavigation } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { requireSession } from '~/lib/session.server'
import { StatusBadge } from '~/components/status-badge'

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, responseHeaders } = await requireSession(request)
  const { data: deals } = await supabase
    .from('deals')
    .select('*')
    .order('created_at', { ascending: false })
  return Response.json({ deals: deals ?? [] }, { headers: responseHeaders })
}

export async function action({ request }: ActionFunctionArgs) {
  const { session, supabase, responseHeaders } = await requireSession(request)
  const formData = await request.formData()
  const intent = formData.get('intent')

  if (intent === 'create') {
    await supabase.from('deals').insert({
      user_id: session.user.id,
      business_name: String(formData.get('business_name')),
      asking_price: Number(formData.get('asking_price')) || null,
      source: String(formData.get('source') || ''),
      stage: String(formData.get('stage') || 'reviewing'),
      notes: String(formData.get('notes') || ''),
    })
  }

  if (intent === 'delete') {
    await supabase.from('deals').delete().eq('id', String(formData.get('id')))
  }

  return Response.json({}, { headers: responseHeaders })
}

export default function Pipeline() {
  const { deals } = useLoaderData<typeof loader>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === 'submitting'

  return (
    <div>
      <h1 className="font-serif text-3xl text-foreground mb-1">Deal Pipeline</h1>
      <p className="text-muted-foreground text-sm mb-8">Pre-acquisition deal tracking.</p>

      <div className="bg-card border border-border rounded-lg p-6 mb-8">
        <h2 className="text-sm font-medium text-foreground mb-4">Add Deal</h2>
        <Form method="post" className="grid grid-cols-2 gap-4">
          <input type="hidden" name="intent" value="create" />
          <input name="business_name" placeholder="Business name" required className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          <input name="asking_price" type="number" placeholder="Asking price" className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          <input name="source" placeholder="Source (broker, direct, marketplace…)" className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          <select name="stage" className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="reviewing">Reviewing</option>
            <option value="in-dd">In DD</option>
            <option value="offer-made">Offer Made</option>
            <option value="closed">Closed</option>
          </select>
          <textarea name="notes" placeholder="Notes" rows={2} className="col-span-2 bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          <button type="submit" disabled={isSubmitting} className="col-span-2 bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">Add Deal</button>
        </Form>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border">
            <th className="text-left px-4 py-3 text-muted-foreground font-medium">Business</th>
            <th className="text-left px-4 py-3 text-muted-foreground font-medium">Asking Price</th>
            <th className="text-left px-4 py-3 text-muted-foreground font-medium">Source</th>
            <th className="text-left px-4 py-3 text-muted-foreground font-medium">Stage</th>
            <th className="text-left px-4 py-3 text-muted-foreground font-medium">Notes</th>
            <th className="px-4 py-3"></th>
          </tr></thead>
          <tbody>
            {deals.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No deals in pipeline yet.</td></tr>}
            {(deals as any[]).map((deal, i) => (
              <tr key={deal.id} className={`border-b border-border last:border-0 ${i % 2 === 1 ? 'bg-muted/20' : ''}`}>
                <td className="px-4 py-3 text-foreground font-medium">{deal.business_name}</td>
                <td className="px-4 py-3 font-mono text-foreground">{deal.asking_price ? `$${Number(deal.asking_price).toLocaleString()}` : '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{deal.source}</td>
                <td className="px-4 py-3"><StatusBadge status={deal.stage} /></td>
                <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{deal.notes}</td>
                <td className="px-4 py-3">
                  <Form method="post">
                    <input type="hidden" name="intent" value="delete" />
                    <input type="hidden" name="id" value={deal.id} />
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
