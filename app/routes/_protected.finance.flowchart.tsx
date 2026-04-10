import { useEffect, useRef } from 'react'
import mermaid from 'mermaid'
import { useTheme } from '~/components/theme-provider'
import { Card, CardHeader, CardTitle, CardContent } from '~/components/ui/card'

const CURRENT_CHART = `flowchart TD
    ME["Daniel Fraga\n(Personal)"]
    ME -->|holds directly| PORT["Investment Portfolio\nStocks · ETFs · Leveraged"]
    ME -->|owns| PTY["FragaVentures PTY LTD\n(Australian Entity)"]
    ME -->|owns| LLC["FragaVentures LLC\n(US Entity)"]`
const OPTIMAL_CHART = `flowchart TD
BIZ["Fragaventures Pty Ltd (Operating Entity)
Will earn operating profit
Will pay tax in operating entity
Can pay dividends to trust
Can retain earnings"]

subgraph TRUST_LAYER["DISCRETIONARY TRUST STRUCTURE"]
direction TB
CT["Fraga Corporate Pty Ltd (Trustee)
Will act as legal face of trust
Will sign contracts and open accounts
Holds no assets itself"]

DT["Fraga Investment Trust (Investment Entity)
Will own Operating Pty shares
Will own investment accounts
Will receive all profits and income
Must distribute income before 30 June
Undistributed income taxed at 47%"]
CT -.->|acts as trustee for| DT
end

BIZ -->|All after-tax business profit| DT

DT -->|"Distribute to individuals
(marginal rate + 50% CGT discount)"| IND["You / Spouse / Adult Children
Will receive cash for living costs
Will buy long-hold stocks personally
Assets here are not protected"]
`;

const ACTION_PLAN = [
  "Keep FragaVentures Pty Ltd active and compliant (ASIC review + simple tax return each year).",
  "Stop investing personally in stocks and ETFs, and instead invest via FragaVentures Pty Ltd to build up its cash balance for the acquisition.",
  "Wait to set up the family trust and corporate trustee company until a specific acquisition is close or confirmed.",
  "Once a deal is close, set up the corporate trustee Pty Ltd and the family discretionary trust with a broad beneficiary class.",
  "After the trust exists, continue investing from your personal shares in FragaVentures Pty Ltd to the corporate trustee as trustee for the trust.",
  "Use FragaVentures Pty Ltd (now owned by the trust) to buy and run the business.",
  "Each year, work with your accountant on how much profit to retain in FragaVentures and how much to pay as dividends to the trust.",
  "Each year before 30 June, have the trust resolve distributions of its income to you and family members as appropriate."
]

const CURRENT_BENEFITS = [
  'Simple to set up and maintain',
  'Low compliance costs',
  'Direct personal control of all assets',
  'No corporate trustee or trust admin overhead',
]

const OPTIMAL_BENEFITS = ['Asset protection: investments held in the trust are separated from personal creditors and relationship risk',
  'Future income splitting: trustee can distribute income and gains to future spouse, children or related companies on lower tax rates',
  'CGT flexibility: capital gains can be streamed to individuals so they can use the 50% CGT discount on assets held more than 12 months',
  'Business risk isolation: an operating Pty runs the business while the trust owns the shares and investment portfolio behind a corporate veil',
  'Year-by-year tuning: each 30 June the trustee can adjust who receives income based on that year\'s tax positions',
  'Bucket company option: later, overflow income the family cannot absorb personally can be capped at the 25% company tax rate via a corporate beneficiary',
  'Succession and estate planning: control of trust wealth can pass via appointor/trustee changes without moving assets or going through probate',
  'Scalable platform: the structure can add new businesses, investments and beneficiaries over time without needing to be rebuilt',]

const LIGHT_THEME_VARIABLES = {
  primaryColor: '#f1f5f9',
  primaryTextColor: '#1e293b',
  primaryBorderColor: '#cbd5e1',
  lineColor: '#94a3b8',
  secondaryColor: '#f8fafc',
  tertiaryColor: '#f1f5f9',
  fontFamily: 'Geist, sans-serif',
  fontSize: '13px',
}

const DARK_THEME_VARIABLES = {
  primaryColor: '#1e293b',
  primaryTextColor: '#e2e8f0',
  primaryBorderColor: '#475569',
  lineColor: '#64748b',
  secondaryColor: '#0f172a',
  tertiaryColor: '#1e293b',
  fontFamily: 'Geist, sans-serif',
  fontSize: '13px',
}

function MermaidDiagram({ chart, id, theme }: { chart: string; id: string; theme: 'light' | 'dark' }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return

    mermaid.initialize({
      startOnLoad: false,
      theme: theme === 'dark' ? 'dark' : 'default',
      themeVariables: theme === 'dark' ? DARK_THEME_VARIABLES : LIGHT_THEME_VARIABLES,
      flowchart: {
        useMaxWidth: false,
        nodeSpacing: 120,
        rankSpacing: 140,
      },
    })

    ref.current.innerHTML = ''
    mermaid
      .render(`mermaid-${id}-${theme}`, chart)
      .then(({ svg }) => {
        if (ref.current) ref.current.innerHTML = svg
      })
      .catch(console.error)
  }, [chart, id, theme])

  return (
    <div
      ref={ref}
      className="w-full overflow-x-auto"
      style={{ minWidth: 1100, minHeight: 500 }}
    />
  )
}

export default function Flowchart() {
  const { theme } = useTheme()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-semibold text-4xl text-foreground">
          Structure Flowchart
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Current Structure */}
          <div className="space-y-6">
            <h2 className="font-semibold text-2xl text-foreground">Current</h2>
            <div className="rounded-xl border border-border bg-card p-6">
              <MermaidDiagram chart={CURRENT_CHART} id="current" theme={theme} />
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-4">
                Benefits
              </h3>
              <ul className="space-y-2">
                {CURRENT_BENEFITS.map((b) => (
                  <li
                    key={b}
                    className="flex items-start gap-2 text-sm text-foreground"
                  >
                    <span className="text-muted-foreground mt-0.5">•</span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Optimal Structure */}
          <div className="space-y-6">
            <h2 className="font-semibold text-2xl text-foreground">
              Optimal Structure
            </h2>
            <div className="rounded-xl border border-border bg-card p-6">
              <MermaidDiagram chart={OPTIMAL_CHART} id="optimal" theme={theme} />
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-4">
                Benefits
              </h3>
              <ul className="space-y-2">
                {OPTIMAL_BENEFITS.map((b) => (
                  <li
                    key={b}
                    className="flex items-start gap-2 text-sm text-foreground"
                  >
                    <span className="text-muted-foreground mt-0.5">•</span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-4">
                Action Plan
              </h3>
              <ol className="space-y-2 list-decimal list-inside">
                {ACTION_PLAN.map((i, b) => (
                  <li
                    key={b}
                    className="text-sm text-foreground"
                  >
                    {i}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
