import { useEffect, useMemo, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { cn } from '~/lib/utils'
import type { AgentState, ChartColor, Tone } from '~/lib/atlas-data'
import { getIcon } from './icons'
import { useMounted } from './motion'
import { ArrowUpRight, ArrowDownRight, Dot } from 'lucide-react'

/* -------------------------- type bits -------------------------- */
export function Kicker({ children, accent = true, className }: { children: React.ReactNode; accent?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      {accent && <span className="inline-block h-1.5 w-1.5 rounded-full bg-chart-1" />}
      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{children}</span>
    </div>
  )
}

export function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('text-[11px] uppercase tracking-widest text-muted-foreground', className)}>{children}</span>
}

/* ----------------------------- badges ---------------------------- */
type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

export function Badge({ variant = 'default', className, children }: { variant?: BadgeVariant; className?: string; children: React.ReactNode }) {
  const variants: Record<BadgeVariant, string> = {
    default: 'border-transparent bg-primary text-primary-foreground',
    secondary: 'border-transparent bg-secondary text-secondary-foreground',
    destructive: 'border-transparent bg-destructive text-white',
    outline: 'text-foreground',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 gap-1',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}

function getVariant(status: string): BadgeVariant {
  switch (status) {
    case 'high':
    case 'destructive':
    case 'error':
      return 'destructive'
    case 'Active':
    case 'Live':
      return 'default'
    case 'medium':
    case 'in-progress':
    case 'Next':
    case 'Shipping':
    case 'Building':
    case 'In Diligence':
      return 'secondary'
    case 'low':
    case 'draft':
    case 'idea':
    case 'Locked':
    case 'Watching':
    case 'Buy-box':
    case 'Paused':
      return 'outline'
    default:
      return 'secondary'
  }
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={getVariant(status)}>{status}</Badge>
}

/* -------------------------- agent atoms -------------------------- */
export function AgentDot({ state = 'idle', className }: { state?: AgentState; className?: string }) {
  const live = state === 'running'
  return (
    <span className={cn('relative inline-flex h-2 w-2', className)}>
      {live && <span className="absolute inset-0 rounded-full bg-chart-2 opacity-60 animate-ping" />}
      <span className={cn('relative inline-flex h-2 w-2 rounded-full', live ? 'bg-chart-2' : 'bg-muted-foreground/50')} />
    </span>
  )
}

export function AgentAvatar({
  icon,
  accent = 'chart-1',
  size = 36,
  active,
}: {
  icon: string
  accent?: ChartColor
  size?: number
  active?: boolean
}) {
  const Icon = getIcon(icon)
  return (
    <span
      className="inline-flex items-center justify-center rounded-lg border border-border shrink-0"
      style={{
        width: size,
        height: size,
        background: `color-mix(in oklch, var(--${accent}) 14%, transparent)`,
        color: `var(--${accent})`,
        boxShadow: active ? `0 0 0 1px color-mix(in oklch, var(--${accent}) 40%, transparent)` : 'none',
      }}
    >
      <Icon size={size * 0.5} />
    </span>
  )
}

/* ------------------------ streaming text ------------------------- */
/**
 * Word-by-word reveal. Renders the full text on the server / when reduced-motion
 * (un-revealed words sit at low opacity while streaming, so layout is reserved).
 */
export function StreamingText({
  text,
  className,
  speed = 14,
  start = 200,
  cursor = true,
}: {
  text: string
  className?: string
  speed?: number
  start?: number
  cursor?: boolean
}) {
  const words = useMemo(() => text.split(' '), [text])
  const mounted = useMounted()
  const reduce = useReducedMotion()
  const [n, setN] = useState(words.length)

  useEffect(() => {
    if (!mounted || reduce) {
      setN(words.length)
      return
    }
    setN(0)
    let interval: ReturnType<typeof setInterval> | null = null
    const begin = setTimeout(() => {
      let i = 0
      interval = setInterval(() => {
        i += 1
        setN(i)
        if (i >= words.length && interval) clearInterval(interval)
      }, speed)
    }, start)
    return () => {
      clearTimeout(begin)
      if (interval) clearInterval(interval)
    }
  }, [mounted, reduce, text, words.length, speed, start])

  return (
    <span className={className}>
      {words.map((w, i) => (
        <span key={i} style={{ opacity: i < n ? 1 : 0.16, transition: 'opacity 260ms ease' }}>
          {w}{' '}
        </span>
      ))}
      {cursor && n < words.length && (
        <span className="inline-block w-[2px] h-[1em] -mb-[0.12em] bg-chart-1 align-baseline animate-pulse" />
      )}
    </span>
  )
}

/* ---------------------------- marquee ---------------------------- */
export function Marquee({ children, speed = 38, className }: { children: React.ReactNode; speed?: number; className?: string }) {
  return (
    <div className={cn('group relative overflow-hidden', className)}>
      <div className="flex w-max gap-8 will-change-transform" style={{ animation: `atlasMarquee ${speed}s linear infinite` }}>
        <div className="flex shrink-0 gap-8">{children}</div>
        <div className="flex shrink-0 gap-8" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  )
}

/* ----------------------------- misc ------------------------------ */
export function Delta({ pct, className }: { pct: number; className?: string }) {
  const up = pct > 0
  const flat = pct === 0
  const Icon = up ? ArrowUpRight : flat ? Dot : ArrowDownRight
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 font-mono text-xs tabular-nums',
        up && 'text-chart-2',
        !up && !flat && 'text-destructive',
        flat && 'text-muted-foreground',
        className,
      )}
    >
      <Icon size={13} />
      {Math.abs(pct).toFixed(pct % 1 === 0 ? 0 : 1)}%
    </span>
  )
}

export function toneColor(t: Tone): ChartColor | 'destructive' {
  return t === 'up' ? 'chart-2' : t === 'down' ? 'destructive' : 'chart-1'
}
