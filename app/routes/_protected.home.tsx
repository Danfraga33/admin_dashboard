import { useState } from 'react'
import { useNavigate, useLoaderData, type LoaderFunctionArgs } from 'react-router'
import { TrendingUp, TrendingDown, Dot, Check, ArrowUpRight, Sparkles, Hammer } from 'lucide-react'
import {
  AGENTS,
  BRIEFING,
  ACTIVITY,
  PORTFOLIO,
  VENTURES,
  type Agent,
  type Signal,
  type ChartColor,
} from '~/lib/atlas-data'
import { cn, fmtCompact } from '~/lib/utils'
import { requireSession } from '~/lib/session.server'
import { createSupabaseAdminClient } from '~/lib/supabase.admin'
import { readPortfolio } from '~/lib/sharesight.server'
import {
  Reveal,
  RevealContext,
  Card,
  SpotlightCard,
  Sparkline,
  Bar,
  AgentAvatar,
  AgentDot,
  StreamingText,
  Delta,
  Kicker,
  Label,
  Marquee,
  Num,
  stag,
} from '~/components/atlas'
import { useAgents } from '~/components/atlas/agents-context'

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await requireSession(request)
  const admin = createSupabaseAdminClient()
  const { portfolio } = await readPortfolio(admin, session.user.id)
  return {
    AGENTS,
    BRIEFING,
    ACTIVITY,
    PORTFOLIO: portfolio,
    VENTURES,
    investTotal: portfolio.total,
    investDayPct: portfolio.dayPct,
    showVentures: process.env.SHOW_VENTURES === 'true',
  }
}

function SignalRow({ sig, agents, i }: { sig: Signal; agents: Agent[]; i: number }) {
  const a = agents.find((x) => x.id === sig.agent)!
  const Icon = sig.tone === 'up' ? TrendingUp : sig.tone === 'down' ? TrendingDown : Dot
  return (
    <Reveal delay={stag(i, 340, 90)} className="flex items-start gap-3 py-2.5">
      <AgentAvatar icon={a.icon} accent={a.accent} size={28} />
      <p className="flex-1 text-sm text-foreground/90 leading-snug">{sig.text}</p>
      <Icon size={15} className={cn('mt-0.5 shrink-0', sig.tone === 'up' ? 'text-chart-2' : sig.tone === 'down' ? 'text-destructive' : 'text-muted-foreground')} />
    </Reveal>
  )
}

function Briefing({ agents }: { agents: Agent[] }) {
  const b = BRIEFING
  return (
    <Reveal delay={180} className="mt-7">
      <SpotlightCard className="p-6 md:p-8" lift={false}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-2 rounded-full border border-chart-1/30 bg-chart-1/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-chart-1">
              <AgentDot state="running" /> Atlas Briefing
            </span>
            <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">{b.synthLabel}</span>
          </div>
          <span className="font-mono text-[11px] text-muted-foreground">{b.date}</span>
        </div>

        <p className="mt-5 text-lg md:text-[22px] leading-relaxed tracking-tight text-foreground">
          <StreamingText text={b.summary} speed={11} start={400} />
        </p>

        <div className="mt-6 grid gap-x-8 gap-y-0 border-t border-border pt-4 md:grid-cols-2">
          {b.signals.map((s, i) => (
            <SignalRow key={i} sig={s} agents={agents} i={i} />
          ))}
        </div>
      </SpotlightCard>
    </Reveal>
  )
}

interface BarData {
  label: string
  pct: number
  color: ChartColor
}

function SnapshotCard({
  delay,
  label,
  icon: Icon,
  metric,
  deltaPct,
  sub,
  insight,
  spark,
  sparkColor,
  bars,
  onClick,
  construction = false,
}: {
  delay: number
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  metric: string
  deltaPct?: number
  sub?: string
  insight: string
  spark?: number[]
  sparkColor?: ChartColor
  bars?: BarData[]
  onClick: () => void
  construction?: boolean
}) {
  if (construction) {
    return (
      <Reveal delay={delay}>
        <SpotlightCard glow="chart-1" className="cursor-pointer p-5" onClick={onClick}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon size={16} className="text-muted-foreground" />
              <Label>{label}</Label>
            </div>
            <ArrowUpRight size={15} className="text-muted-foreground transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </div>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 py-6 text-center">
            <span className="grid size-10 place-items-center rounded-xl border border-border bg-card">
              <Hammer size={18} className="text-muted-foreground" />
            </span>
            <p className="font-mono text-sm text-foreground">In Construction</p>
            <p className="text-xs text-muted-foreground">Being built — check back soon.</p>
          </div>
        </SpotlightCard>
      </Reveal>
    )
  }
  return (
    <Reveal delay={delay}>
      <SpotlightCard glow={sparkColor || 'chart-1'} className="cursor-pointer p-5" onClick={onClick}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon size={16} className="text-muted-foreground" />
            <Label>{label}</Label>
          </div>
          <ArrowUpRight size={15} className="text-muted-foreground transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </div>
        <div className="mt-4 flex items-end gap-2">
          <span className="font-mono text-3xl leading-none tracking-tight text-foreground">{metric}</span>
          {deltaPct != null && <Delta pct={deltaPct} className="mb-1" />}
        </div>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
        <div className="mt-4 h-10">
          {spark && <Sparkline data={spark} color={sparkColor} w={260} h={40} />}
          {bars && (
            <div className="space-y-2 pt-1">
              {bars.map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-20 shrink-0 truncate text-[11px] text-muted-foreground">{b.label}</span>
                  <Bar pct={b.pct} color={b.color} delay={300 + i * 100} />
                  <span className="w-8 text-right font-mono text-[10px] text-muted-foreground">{b.pct}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="mt-4 flex items-start gap-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
          <Sparkles size={13} className="mt-0.5 shrink-0 text-chart-1" />
          <span>{insight}</span>
        </p>
      </SpotlightCard>
    </Reveal>
  )
}

function Ticker({ agents }: { agents: Agent[] }) {
  return (
    <Reveal delay={140} className="mt-6">
      <div className="relative rounded-xl border border-border bg-card/60 py-2.5">
        <Marquee speed={42}>
          {ACTIVITY.map((ev, i) => {
            const a = agents.find((x) => x.id === ev.agent)!
            return (
              <span key={i} className="flex items-center gap-2 whitespace-nowrap text-[12px] text-muted-foreground">
                <AgentDot state={a.state} />
                <span className="font-medium text-foreground">{a.name}</span>
                <span>{ev.text}</span>
                <span className="font-mono text-[10px] opacity-60">{ev.t}</span>
                <span className="px-2 text-border">·</span>
              </span>
            )
          })}
        </Marquee>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-card to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-card to-transparent" />
      </div>
    </Reveal>
  )
}

export const meta = () => [{ title: 'Atlas · Daily Update' }]

export default function DailyUpdate() {
  const navigate = useNavigate()
  const { investTotal, investDayPct, showVentures } = useLoaderData<typeof loader>()
  const { agents, running } = useAgents()
  const v = VENTURES
  const liveCount = agents.filter((a) => a.state === 'running').length

  return (
    <RevealContext.Provider value={false}>
      <div className="mx-auto max-w-screen-2xl">
        <div className="flex flex-col gap-5 border-b border-border pb-7 md:flex-row md:items-end md:justify-between">
          <div>
            <Reveal delay={0}>
              <Kicker>Daily Update</Kicker>
            </Reveal>
            <Reveal delay={60}>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight text-foreground md:text-6xl leading-[0.95]">{BRIEFING.greeting}</h2>
            </Reveal>
            <Reveal delay={120}>
              <p className="mt-3 max-w-xl text-sm text-muted-foreground">
                Everything across investments, projects and ventures — synthesized by your agents while you slept.
              </p>
            </Reveal>
          </div>
          <Reveal delay={160} className="shrink-0">
            <div className="md:text-right">
              <Label>Now mastering</Label>
              <p className="mt-1.5 text-base font-medium tracking-tight text-foreground md:text-xl">AI Agents &amp; Orchestration</p>
              <p className="mt-1 inline-flex items-center gap-1.5 font-mono text-[11px] text-chart-2">
                <AgentDot state="running" /> {running ? 'agents running…' : `${liveCount} agents running`}
              </p>
            </div>
          </Reveal>
        </div>

        <Ticker agents={agents} />
        <Briefing agents={agents} />

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <SnapshotCard
            delay={220}
            label="Investments"
            icon={TrendingUp}
            metric={fmtCompact(investTotal)}
            deltaPct={investDayPct}
            sub="Portfolio value · today"
            insight="AI basket +3.2% — rebalance window open"
            spark={PORTFOLIO.spark}
            sparkColor="chart-1"
            onClick={() => navigate('/investments')}
          />
          <SnapshotCard
            delay={290}
            label="Projects"
            icon={Check}
            metric="2"
            sub="Shipping · 6 active builds"
            insight="RAG agent passed evals, hit staging"
            bars={[
              { label: 'Agent Core', pct: 88, color: 'chart-2' },
              { label: 'Orchestrator', pct: 70, color: 'chart-1' },
              { label: 'Atlas', pct: 52, color: 'chart-4' },
            ]}
            onClick={() => navigate('/projects')}
          />
          <SnapshotCard
            delay={360}
            label="Fraga Ventures"
            icon={ArrowUpRight}
            metric="$4.24M"
            deltaPct={v.finance.netWorthYtd}
            sub="Net worth · YTD"
            insight="2 acquisition targets in buy-box"
            spark={v.finance.netWorthSpark}
            sparkColor="chart-2"
            construction={!showVentures}
            onClick={() => navigate('/ventures')}
          />
        </div>
      </div>
    </RevealContext.Provider>
  )
}
