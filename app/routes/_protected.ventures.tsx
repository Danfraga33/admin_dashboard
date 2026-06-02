import { Check, TrendingUp, Target, Sparkles } from 'lucide-react'
import { useLoaderData } from 'react-router'
import { AGENTS, VENTURES, type Deal, type Finance } from '~/lib/atlas-data'
import {
  Reveal,
  RevealContext,
  Card,
  SpotlightCard,
  Sparkline,
  Bar,
  Num,
  Delta,
  Label,
  StatusBadge,
  AgentSummary,
  PageHeader,
  StatTile,
  InConstruction,
  stag,
} from '~/components/atlas'

export function loader() {
  return {
    VENTURES,
    ledger: AGENTS.find((a) => a.id === 'ledger')!,
    show: process.env.SHOW_VENTURES === 'true',
  }
}

function NetWorthChart({ f }: { f: Finance }) {
  return (
    <Reveal delay={200}>
      <Card className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <Label>Net worth · trailing</Label>
            <div className="mt-2 flex items-end gap-2">
              <span className="font-mono text-3xl tracking-tight text-foreground">
                <Num value={f.netWorth} prefix="$" />
              </span>
              <Delta pct={f.netWorthYtd} className="mb-1.5" />
            </div>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">All-time high · YTD +{f.netWorthYtd}%</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 font-mono text-[10px] text-muted-foreground">
            <TrendingUp size={12} className="text-chart-2" /> 36-week
          </span>
        </div>
        <div className="mt-4">
          <Sparkline data={f.netWorthSpark} color="chart-2" w={760} h={120} strokeW={2} delay={300} />
        </div>
      </Card>
    </Reveal>
  )
}

function PipelineRow({ d, i }: { d: Deal; i: number }) {
  return (
    <Reveal delay={stag(i, 0, 60)} className="grid grid-cols-12 items-center gap-2 px-4 py-3.5 transition-colors hover:bg-muted/40">
      <div className="col-span-5 md:col-span-4">
        <p className="text-sm font-medium text-foreground">{d.name}</p>
        <p className="truncate text-[11px] text-muted-foreground">{d.note}</p>
      </div>
      <div className="col-span-3 text-right md:col-span-2 md:text-left">
        <p className="font-mono text-sm text-foreground">{d.arr}</p>
        <p className="font-mono text-[10px] text-muted-foreground">ARR</p>
      </div>
      <div className="hidden md:col-span-2 md:block">
        <p className="font-mono text-sm text-foreground">{d.multiple}</p>
        <p className="font-mono text-[10px] text-muted-foreground">multiple</p>
      </div>
      <div className="col-span-4 md:col-span-2">
        <div className="flex items-center gap-2">
          <Bar pct={d.fit} color={d.fit >= 80 ? 'chart-2' : d.fit >= 60 ? 'chart-1' : 'chart-5'} delay={300 + i * 70} />
          <span className="font-mono text-[10px] text-muted-foreground">{d.fit}</span>
        </div>
        <p className="mt-1 hidden font-mono text-[10px] text-muted-foreground md:block">buy-box fit</p>
      </div>
      <div className="col-span-12 mt-2 md:col-span-2 md:mt-0 md:text-right">
        <StatusBadge status={d.status} />
      </div>
    </Reveal>
  )
}

function Pipeline({ data }: { data: typeof VENTURES }) {
  return (
    <Reveal delay={260}>
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <Label>Acquisition pipeline</Label>
          <span className="font-mono text-[11px] text-muted-foreground">{data.pipeline.length} targets</span>
        </div>
        <div className="divide-y divide-border">
          {data.pipeline.map((d, i) => (
            <PipelineRow key={d.name} d={d} i={i} />
          ))}
        </div>
      </Card>
    </Reveal>
  )
}

function BuyBox({ data }: { data: typeof VENTURES }) {
  return (
    <Reveal delay={300}>
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <Label>Buy-box</Label>
          <Target size={14} className="text-muted-foreground" />
        </div>
        <dl className="mt-4 space-y-0 divide-y divide-border">
          {data.buyBox.map((c, i) => (
            <Reveal key={c.label} delay={stag(i, 340, 60)} className="flex items-center justify-between py-2.5">
              <dt className="text-[13px] text-muted-foreground">{c.label}</dt>
              <dd className="font-mono text-[13px] text-foreground">{c.value}</dd>
            </Reveal>
          ))}
        </dl>
      </Card>
    </Reveal>
  )
}

function CapitalCard({ f }: { f: Finance }) {
  return (
    <Reveal delay={340}>
      <SpotlightCard glow="chart-2" className="p-5">
        <Label>Capital available</Label>
        <p className="mt-3 font-mono text-2xl text-foreground">
          <Num value={f.cash} prefix="$" />
        </p>
        <p className="mt-1 text-[12px] text-muted-foreground">Liquid · {f.leverage}x leverage headroom</p>
        <div className="mt-4 flex items-center gap-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
          <Sparkles size={13} className="text-chart-1" /> Keep $200K+ liquid until a deal closes
        </div>
      </SpotlightCard>
    </Reveal>
  )
}

export const meta = () => [{ title: 'Atlas · Fraga Ventures' }]

export default function Ventures() {
  const { show } = useLoaderData<typeof loader>()
  const data = VENTURES
  const f = data.finance
  const ledger = AGENTS.find((a) => a.id === 'ledger')!

  if (!show) {
    return (
      <RevealContext.Provider value={false}>
        <InConstruction kicker="Fraga Ventures · Acquisitions" />
      </RevealContext.Provider>
    )
  }

  return (
    <RevealContext.Provider value={false}>
      <div className="mx-auto max-w-screen-2xl">
        <PageHeader
          kicker="Fraga Ventures · Acquisitions"
          title="Own & integrate"
          sub="Stage 3 — the output of the playbook. Ledger keeps the finances honest and the buy-box tight."
          right={
            <div className="md:text-right">
              <Label>Net worth</Label>
              <p className="mt-1.5 font-mono text-2xl tracking-tight text-foreground md:text-3xl">
                <Num value={f.netWorth} prefix="$" />
              </p>
              <p className="mt-1 md:flex md:justify-end">
                <Delta pct={f.netWorthYtd} />
              </p>
            </div>
          }
        />

        <div className="mt-7">
          <AgentSummary
            agent={ledger}
            label="Finance & deal read · updated 6m ago"
            text={data.ledgerNote}
            speed={11}
            footer={
              <>
                <Check size={13} className="text-chart-2" /> Reconciled 6 accounts · 2 buy-box matches flagged
              </>
            }
          />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Net worth" value={f.netWorth} prefix="$" spark={f.netWorthSpark} sparkColor="chart-2" delta={f.netWorthYtd} delay={120} />
          <StatTile label="Cash on hand" value={f.cash} prefix="$" spark={f.cashSpark} sparkColor="chart-1" delay={180} />
          <StatTile label="Leverage" value={f.leverage} decimals={1} unit="x" delay={240} />
          <StatTile label="Monthly cashflow" value={f.monthlyCashflow} prefix="$" delta={f.monthlyCashflowPct} sparkColor="chart-2" delay={300} />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <NetWorthChart f={f} />
            <Pipeline data={data} />
          </div>
          <div className="space-y-4">
            <BuyBox data={data} />
            <CapitalCard f={f} />
          </div>
        </div>
      </div>
    </RevealContext.Provider>
  )
}
