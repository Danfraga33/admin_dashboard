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
    A[Total Cash]

   A --> C[Core Position]
    A --> D[Thematic Position]
    A --> E[Individual Position]
    `

const OPTIMAL_CHART = `flowchart TD
    A[Total Capital] --> B{Decide Position Type}

    B --> C[Core Position]
    C --> C1["Use internally leveraged index ETFs (e.g. 2x-3x US indices) -No additional margin loan on core "]

    B --> D[Thematic Position]
    D --> D1[Allow limited margin loan -  Target LVR ≤ 30%]


    B --> E[Individual Position]
    E --> E1[No leverage allowed - Fund 100% with cash]`
const CURRENT_BENEFITS = [
  'Zero margin-call risk — you can always ride through volatility.',
  'Very simple to manage and report; no loan balances, LVRs, or interest to track.',
  'Behaviourally safer: less temptation to over-size or "double down" with borrowed money.',
  'All returns are clean equity returns, easy to understand and model.',
]

const OPTIMAL_BENEFITS = [
  'Core — leverage sits in broad indices with strong long-term growth. No margin calls or LVR monitoring on core. Cheaper embedded borrowing than retail margin. Leaves any margin facility free for other uses.',
  'Thematic — lets you scale thematics slightly without huge cash outlay. 30% cap limits margin-call and drawdown risk. Ensures only highest-conviction thematics get leverage.',
  'Individual — avoids catastrophic single-stock blow-ups with debt. Easier to hold through volatility without lender pressure. Keeps single stocks as pure equity, optional upside only.',
]

function MermaidDiagram({ chart, id }: { chart: string; id: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    ref.current.innerHTML = ''
    mermaid
      .render(`mermaid-inv-${id}`, chart)
      .then(({ svg }) => {
        if (ref.current) ref.current.innerHTML = svg
      })
      .catch(console.error)
  }, [chart, id])

  return (
    <div
      ref={ref}
      className="w-full overflow-x-auto"
      style={{ minWidth: 600, minHeight: 400 }}
    />
  )
}

export default function InvestmentFlowchart() {
  return (
    <div className="space-y-8">
      <h1 className="font-display text-4xl text-foreground">Investment Flowchart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Current */}
        <div className="space-y-6">
          <h2 className="font-display text-2xl text-foreground">Current</h2>
          <div className="rounded-xl border border-border bg-card p-6">
            <MermaidDiagram chart={CURRENT_CHART} id="current" />
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-4">
              Reasons
            </h3>
            <ul className="space-y-2">
              {CURRENT_BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="text-muted-foreground mt-0.5 shrink-0">•</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Optimal */}
        <div className="space-y-6">
          <h2 className="font-display text-2xl text-foreground">Optimal</h2>
          <div className="rounded-xl border border-border bg-card p-6">
            <MermaidDiagram chart={OPTIMAL_CHART} id="optimal" />
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-4">
              Reasons
            </h3>
            <ul className="space-y-2">
              {OPTIMAL_BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="text-muted-foreground mt-0.5 shrink-0">•</span>
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
