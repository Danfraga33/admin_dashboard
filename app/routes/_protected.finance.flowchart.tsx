import { useEffect, useRef } from 'react'
import mermaid from 'mermaid'

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#1e293b',
    primaryTextColor: '#e2e8f0',
    primaryBorderColor: '#475569',
    lineColor: '#64748b',
    secondaryColor: '#0f172a',
    tertiaryColor: '#1e293b',
    fontFamily: 'Geist Mono, monospace',
    fontSize: '13px',
  },
  flowchart: {
    useMaxWidth: false,   
    nodeSpacing: 120,     
    rankSpacing: 140,     
  },
})


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
  'Year-by-year tuning: each 30 June the trustee can adjust who receives income based on that year’s tax positions',
  'Bucket company option: later, overflow income the family cannot absorb personally can be capped at the 25% company tax rate via a corporate beneficiary',
  'Succession and estate planning: control of trust wealth can pass via appointor/trustee changes without moving assets or going through probate',
  'Scalable platform: the structure can add new businesses, investments and beneficiaries over time without needing to be rebuilt',]

function MermaidDiagram({ chart, id }: { chart: string; id: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    ref.current.innerHTML = ''
    mermaid
      .render(`mermaid-${id}`, chart)
      .then(({ svg }) => {
        if (ref.current) ref.current.innerHTML = svg
      })
      .catch(console.error)
  }, [chart, id])

  return (
    <div
      ref={ref}
      className="w-full overflow-x-auto"
      style={{ minWidth: 1100, minHeight: 500 }}  // wider + taller
    />
  )
}

export default function Flowchart() {
  return (
    <div className="space-y-8">
      <h1 className="font-display text-4xl text-foreground">
        Corporate Structure
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Current Structure */}
        <div className="space-y-6">
          <h2 className="font-display text-2xl text-foreground">Current</h2>
          <div className="rounded-xl border border-border bg-card p-6">
            <MermaidDiagram chart={CURRENT_CHART} id="current" />
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
          <h2 className="font-display text-2xl text-foreground">
            Optimal Structure
          </h2>
          <div className="rounded-xl border border-border bg-card p-6">
            <MermaidDiagram chart={OPTIMAL_CHART} id="optimal" />
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
        </div>
      </div>
    </div>
  )
}
