import { Check, Hammer, Info } from 'lucide-react'
import { cn } from '~/lib/utils'
import type { Agent, ChartColor } from '~/lib/atlas-data'
import { Reveal, Num } from './motion'
import { Card, SpotlightCard } from './cards'
import { Sparkline } from './charts'
import { AgentAvatar, AgentDot, Delta, Kicker, Label, StreamingText } from './agent'

export function PageHeader({
  kicker,
  title,
  sub,
  right,
}: {
  kicker: string
  title: string
  sub?: string
  right?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-5 border-b border-border pb-7 md:flex-row md:items-end md:justify-between">
      <div>
        <Reveal delay={0}>
          <Kicker>{kicker}</Kicker>
        </Reveal>
        <Reveal delay={60}>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-foreground md:text-6xl leading-[0.95]">{title}</h2>
        </Reveal>
        {sub && (
          <Reveal delay={120}>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">{sub}</p>
          </Reveal>
        )}
      </div>
      {right && (
        <Reveal delay={160} className="shrink-0">
          {right}
        </Reveal>
      )}
    </div>
  )
}

/** Small "i" icon with a native tooltip explaining a metric. */
export function InfoHint({ text, className }: { text: string; className?: string }) {
  return (
    <span
      title={text}
      aria-label={text}
      className={cn('inline-flex shrink-0 cursor-help text-muted-foreground/60 transition-colors hover:text-muted-foreground', className)}
    >
      <Info size={12} />
    </span>
  )
}

export function StatTile({
  label,
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  unit,
  delta,
  spark,
  sparkColor = 'chart-1',
  delay = 0,
  info,
}: {
  label: string
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
  unit?: string
  delta?: number
  spark?: number[]
  sparkColor?: ChartColor
  delay?: number
  info?: string
}) {
  return (
    <Reveal delay={delay} className="h-full">
      <Card className="flex h-full flex-col p-5 transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Label>{label}</Label>
            {info && <InfoHint text={info} />}
          </span>
          {delta != null && <Delta pct={delta} />}
        </div>
        <div className="mt-3 flex items-end gap-1.5">
          <Num value={value} prefix={prefix} suffix={suffix} decimals={decimals} className="text-2xl text-foreground md:text-3xl leading-none" />
          {unit && <span className="mb-0.5 text-sm text-muted-foreground">{unit}</span>}
        </div>
        <div className="mt-3 flex h-[34px] items-end">
          {spark && <Sparkline data={spark} color={sparkColor} w={240} h={34} />}
        </div>
      </Card>
    </Reveal>
  )
}

/** Agent "thinking → summary" card with streaming text. */
export function AgentSummary({
  agent,
  label,
  text,
  footer,
  delay = 0,
  speed = 11,
}: {
  agent: Agent
  label: string
  text: string
  footer?: React.ReactNode
  delay?: number
  speed?: number
}) {
  return (
    <Reveal delay={delay}>
      <SpotlightCard className="p-6 md:p-7" lift={false} glow={agent.accent}>
        <div className="flex items-center gap-3">
          <AgentAvatar icon={agent.icon} accent={agent.accent} size={40} active={agent.state === 'running'} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold tracking-tight text-foreground">{agent.name}</p>
              <AgentDot state={agent.state} />
            </div>
            <p className="text-[11px] text-muted-foreground">{label}</p>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {agent.state === 'running' ? 'analyzing…' : 'idle'}
          </span>
        </div>
        <p className="mt-4 text-base leading-relaxed tracking-tight text-foreground/95 md:text-lg">
          <StreamingText text={text} speed={speed} start={300} />
        </p>
        {footer && <div className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">{footer}</div>}
      </SpotlightCard>
    </Reveal>
  )
}

/** Full-page placeholder shown when a feature flag is off. */
export function InConstruction({
  kicker,
  title = 'In Construction',
  sub = 'This page is being built. Check back soon.',
  children,
}: {
  kicker: string
  title?: string
  sub?: string
  children?: React.ReactNode
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-screen-2xl flex-col items-center justify-center py-10 text-center">
      <Reveal delay={0}>
        <span className="grid size-14 place-items-center rounded-2xl border border-border bg-card shadow-sm">
          <Hammer size={24} className="text-muted-foreground" />
        </span>
      </Reveal>
      <Reveal delay={60} className="mt-6">
        <Kicker>{kicker}</Kicker>
      </Reveal>
      <Reveal delay={120}>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight text-foreground md:text-5xl">{title}</h2>
      </Reveal>
      <Reveal delay={180}>
        <p className="mt-3 max-w-sm text-sm text-muted-foreground">{sub}</p>
      </Reveal>
      {children && (
        <Reveal delay={240} className="mt-10 w-full">
          {children}
        </Reveal>
      )}
    </div>
  )
}

export { Check as AgentCheck }
