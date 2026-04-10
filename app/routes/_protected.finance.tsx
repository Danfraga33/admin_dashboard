import { Link, useLoaderData } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { requireSession } from '~/lib/session.server'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Wallet, Building, GitBranch, Calculator, ArrowRight } from 'lucide-react'

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, responseHeaders } = await requireSession(request)
  const [{ data: lenders }, { data: accounts }] = await Promise.all([
    supabase.from('lenders').select('*').order('created_at', { ascending: true }),
    supabase.from('accounts').select('*').order('created_at', { ascending: true }),
  ])
  return Response.json(
    { lenders: lenders ?? [], accounts: accounts ?? [] },
    { headers: responseHeaders },
  )
}

export default function FinanceLanding() {
  const { lenders, accounts } = useLoaderData<typeof loader>()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Private Wealth Card */}
      <Card className="gap-0 p-0">
        <CardHeader className="flex-row items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-base">Private Wealth</CardTitle>
            <Badge variant="secondary" className="ml-2">{(lenders as any[]).length} lenders</Badge>
          </div>
          <Link to="/finance/private-wealth" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Manage <ArrowRight className="w-3 h-3" />
          </Link>
        </CardHeader>
        <CardContent className="p-5">
          {(lenders as any[]).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No lenders added yet.</p>
          ) : (
            <div className="space-y-2">
              {(lenders as any[]).slice(0, 4).map((lender: any) => (
                <div key={lender.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                  <span className="text-sm font-medium text-foreground">{lender.name}</span>
                  <span className="text-xs text-muted-foreground">{lender.rates_approx || '\u2014'}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Accounting Card */}
      <Card className="gap-0 p-0">
        <CardHeader className="flex-row items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-base">Accounting</CardTitle>
            <Badge variant="secondary" className="ml-2">{(accounts as any[]).length} accounts</Badge>
          </div>
          <Link to="/finance/accounting" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Manage <ArrowRight className="w-3 h-3" />
          </Link>
        </CardHeader>
        <CardContent className="p-5">
          {(accounts as any[]).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No accounts added yet.</p>
          ) : (
            <div className="space-y-2">
              {(accounts as any[]).slice(0, 4).map((acct: any) => (
                <div key={acct.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                  <span className="text-sm font-medium text-foreground">{acct.name}</span>
                  <Badge variant={acct.status === 'Active' ? 'secondary' : 'outline'} className="text-[10px]">{acct.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Structure Flowchart Card */}
      <Card className="gap-0 p-0">
        <CardHeader className="flex-row items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-base">Structure Flowchart</CardTitle>
          </div>
          <Link to="/finance/flowchart" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            View <ArrowRight className="w-3 h-3" />
          </Link>
        </CardHeader>
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground text-center py-4">Entity structure and ownership diagram.<br /> Click View to see the full flowchart.</p>
        </CardContent>
      </Card>

      {/* Investment Flowchart Card */}
      <Card className="gap-0 p-0">
        <CardHeader className="flex-row items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-base">Investment Flowchart</CardTitle>
          </div>
          <Link to="/finance/investment-flowchart" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            View <ArrowRight className="w-3 h-3" />
          </Link>
        </CardHeader>
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground text-center py-4">Investment allocation and leverage strategy. <br /> Click View to see the full flowchart.</p>
        </CardContent>
      </Card>
    </div>
  )
}
