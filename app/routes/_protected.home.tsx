import { useState, useMemo } from 'react'
import { useNavigate, useLoaderData, type LoaderFunctionArgs } from 'react-router'
import { motion, useReducedMotion } from 'framer-motion'
import { TrendingUp, TrendingDown, Dot, Check, ArrowUpRight, Sparkles, Hammer } from 'lucide-react'
import {
  AGENTS,
  ACTIVITY,
  PROJECTS,
  type Agent,
  type Signal,
  type Briefing as BriefingData,
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
  useMounted,
} from '~/components/atlas'
import { useAgents } from '~/components/atlas/agents-context'
import { usePrivacy } from '~/components/privacy-provider'

const TZ = 'Australia/Sydney'

function signed(p: number): string {
  return `${p >= 0 ? '+' : ''}${p}%`
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await requireSession(request)
  const admin = createSupabaseAdminClient()
  const { portfolio } = await readPortfolio(admin, session.user.id)

  const top = portfolio.holdings.filter((h) => h.sym !== 'CASH').sort((a, b) => b.alloc - a.alloc)[0]
  const ytd = `YTD ${signed(portfolio.ytdPct)}`
  const investInsight = top ? `${top.sym} leads the book at ${top.alloc}% · ${ytd}` : ytd

  const active = PROJECTS.items.filter((p) => p.status !== 'Paused')
  const ranked = [...active].sort((a, b) => b.progress - a.progress)
  const lead = ranked[0]
  const projects = {
    count: active.length,
    sub: `Active builds · led by ${lead.name}`,
    insight: `${lead.name} at ${lead.progress}% — ${lead.activity}`,
    bars: ranked.slice(0, 3).map((p) => ({ label: p.name, pct: p.progress, color: p.accent })),
  }

  const now = new Date()
  const hour = Number(new Intl.DateTimeFormat('en-AU', { hour: 'numeric', hour12: false, timeZone: TZ }).format(now))
  const part = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
  const cashPct = portfolio.total > 0 ? Math.round((portfolio.cash / portfolio.total) * 100) : 0
  const dir = portfolio.dayPct >= 0 ? 'up' : 'down'

  const briefing: BriefingData = {
    date: new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: TZ }).format(now),
    greeting: `Good ${part}, Daniel.`,
    synthLabel: 'Synthesized from Sharesight + active builds',
    summary: [
      `Portfolio is ${dir} ${Math.abs(portfolio.dayPct)}% on the day, ${ytd.toLowerCase()}`,
      top ? ` — ${top.sym} is the largest position at ${top.alloc}% of the book, with cash at ${cashPct}% for dry powder.` : `, with cash at ${cashPct}% for dry powder.`,
      ` On the build side, ${lead.name} leads ${active.length} active builds at ${lead.progress}%.`,
      ` Fraga Ventures is still in construction — ideas prove out on the ABN, winners transfer to the Pty.`,
      ` Your highest-leverage move today: ship ${lead.name}'s last ${100 - lead.progress}%.`,
    ].join(''),
    signals: [
      ...(top
        ? [{ agent: 'scout', tone: (top.pct > 0 ? 'up' : top.pct < 0 ? 'down' : 'flat') as Signal['tone'], text: `${top.sym} ${signed(top.pct)} today — ${top.alloc}% of the book` }]
        : []),
      { agent: 'forge', tone: 'up' as const, text: `${lead.name} at ${lead.progress}% — ${lead.activity}` },
      { agent: 'ledger', tone: 'flat' as const, text: `Cash at ${cashPct}% of portfolio — dry powder for acquisitions` },
      { agent: 'ledger', tone: 'flat' as const, text: 'Fraga Ventures in construction — ABN→Pty structure playbook drafted' },
    ],
  }

  return {
    briefing,
    investTotal: portfolio.total,
    investDayPct: portfolio.dayPct,
    investSpark: portfolio.spark,
    investInsight,
    projects,
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

function Briefing({ agents, b }: { agents: Agent[]; b: BriefingData }) {
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
  privacy = false,
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
  privacy?: boolean
}) {
  const { hidden } = usePrivacy()
  const masked = privacy && hidden
  const maskCls = masked ? 'blur-[7px] select-none' : ''
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
            <p className="text-xs text-muted-foreground">This page is being built. Check back soon.</p>
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
        <div className={cn('mt-4 flex items-end gap-2 transition-[filter] duration-200', maskCls)}>
          <span className="font-mono text-3xl leading-none tracking-tight text-foreground">{metric}</span>
          {deltaPct != null && <Delta pct={deltaPct} className="mb-1" />}
        </div>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
        <div className={cn('mt-4 h-10 transition-[filter] duration-200', maskCls)}>
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
          <span className={cn('transition-[filter] duration-200', maskCls)}>{insight}</span>
        </p>
      </SpotlightCard>
    </Reveal>
  )
}

/**
 * Operating principle — Skiper-style per-word blur-rise cascade. Reuses the
 * atlas entrance pattern: renders final state on the server / under reduced-motion
 * (so it's visible without JS and respects a11y), then plays once on the live client.
 * Tokens flagged `accent` land in chart-1 to make the phrase carry weight.
 */
const MANTRA: { text: string; accent?: boolean }[] = [
  { text: 'The' },
  { text: 'first' },
  { text: 'pick' },
  { text: 'barely', accent: true },
  { text: 'matters.', accent: true },
  { text: 'The' },
  { text: 'hundredth', accent: true },
  { text: 'ship', accent: true },
  { text: 'does.' },
  { text: 'Choose' },
  { text: 'a' },
  { text: 'space' },
  { text: "you'd" },
  { text: 'happily' },
  { text: 'live' },
  { text: 'in,' },
  { text: 'build' },
  { text: 'apps' },
  { text: 'for' },
  { text: 'real' },
  { text: 'users,' },
  { text: 'let' },
  { text: 'each' },
  { text: 'one' },
  { text: 'show' },
  { text: 'you' },
  { text: 'the' },
  { text: 'next' },
  { text: 'problem' },
  { text: '—' },
  { text: 'and', accent: true },
  { text: 'never', accent: true },
  { text: 'break', accent: true },
  { text: 'the', accent: true },
  { text: 'chain.', accent: true },
]

const MANTRA_EASE = [0.22, 1, 0.36, 1] as const

function Mantra() {
  const mounted = useMounted()
  const reduce = useReducedMotion()
  const animate = mounted && !reduce
  const words = useMemo(() => MANTRA, [])

  return (
    <Reveal delay={100} className="mt-7">
      <div className="relative flex flex-col items-center text-center">
        <Label className="block">Operating Principle</Label>
        <p className="mt-3 max-w-3xl text-pretty text-xl font-medium leading-snug tracking-tight text-foreground md:text-[27px] md:leading-[1.32]">
          {words.map((w, i) => (
            <span key={i}>
              <motion.span
                className={cn('inline-block', w.accent && 'text-chart-1')}
                initial={false}
                animate={
                  animate
                    ? { opacity: [0, 1], y: [14, 0], filter: ['blur(8px)', 'blur(0px)'] }
                    : { opacity: 1, y: 0, filter: 'blur(0px)' }
                }
                transition={{ duration: 0.5, ease: MANTRA_EASE, delay: 0.3 + i * 0.055 }}
              >
                {w.text}
              </motion.span>
              {i < words.length - 1 ? ' ' : ''}
            </span>
          ))}
        </p>
      </div>
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
  const { briefing, investTotal, investDayPct, investSpark, investInsight, projects, showVentures } = useLoaderData<typeof loader>()
  const { agents, running } = useAgents()
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
              <h2 className="mt-4 text-4xl font-semibold tracking-tight text-foreground md:text-6xl leading-[0.95]">{briefing.greeting}</h2>
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

        <Mantra />
        <Ticker agents={agents} />
        <Briefing agents={agents} b={briefing} />

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <SnapshotCard
            delay={220}
            label="Investments"
            icon={TrendingUp}
            metric={fmtCompact(investTotal)}
            deltaPct={investDayPct}
            sub="Portfolio value · today"
            insight={investInsight}
            spark={investSpark}
            sparkColor="chart-1"
            privacy
            onClick={() => navigate('/investments')}
          />
          <SnapshotCard
            delay={290}
            label="Projects"
            icon={Check}
            metric={String(projects.count)}
            sub={projects.sub}
            insight={projects.insight}
            bars={projects.bars}
            onClick={() => navigate('/projects')}
          />
          <SnapshotCard
            delay={360}
            label="Fraga Ventures"
            icon={ArrowUpRight}
            metric="—"
            sub="Acquisitions"
            insight="Structure playbook drafted — ABN to Pty Ltd"
            construction={!showVentures}
            onClick={() => navigate('/ventures')}
          />
        </div>
      </div>
    </RevealContext.Provider>
  )
}
