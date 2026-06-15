import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { cn } from '~/lib/utils'
import type { ChartColor, AllocationSlice } from '~/lib/atlas-data'
import { useMounted } from './motion'

const EASE = 'cubic-bezier(0.22,1,0.36,1)'

/** Returns whether to animate the draw: only on the live client (not SSR / reduced-motion). */
function useAnimateDraw() {
  const mounted = useMounted()
  const reduce = useReducedMotion()
  return mounted && !reduce
}

export function Sparkline({
  data,
  color = 'chart-1',
  w = 120,
  h = 36,
  fill = true,
  strokeW = 1.6,
  delay = 200,
}: {
  data: number[]
  color?: ChartColor | 'destructive'
  w?: number
  h?: number
  fill?: boolean
  strokeW?: number
  delay?: number
}) {
  const animate = useAnimateDraw()
  const id = useId()
  const { line, area, len } = useMemo(() => {
    const min = Math.min(...data)
    const max = Math.max(...data)
    const span = max - min || 1
    const pts = data.map(
      (d, i) => [(i / (data.length - 1)) * w, h - 3 - ((d - min) / span) * (h - 6)] as const,
    )
    const lineStr = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
    let length = 0
    for (let i = 1; i < pts.length; i++) {
      length += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
    }
    return { line: lineStr, area: `${lineStr} L${w} ${h} L0 ${h} Z`, len: length }
  }, [data, w, h])

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`var(--${color})`} stopOpacity="0.22" />
          <stop offset="100%" stopColor={`var(--${color})`} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && (
        <path
          d={area}
          fill={`url(#${id})`}
          style={{ opacity: animate ? 0 : 1, animation: animate ? `atlasFadeIn 700ms ease ${delay + 200}ms forwards` : undefined }}
        />
      )}
      <path
        d={line}
        fill="none"
        stroke={`var(--${color})`}
        strokeWidth={strokeW}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: len,
          strokeDashoffset: animate ? len : 0,
          animation: animate ? `atlasDraw 1100ms ${EASE} ${delay}ms forwards` : undefined,
        }}
      />
      <style>{`@keyframes atlasDraw{to{stroke-dashoffset:0}}@keyframes atlasFadeIn{to{opacity:1}}`}</style>
    </svg>
  )
}

export function Donut({
  segments,
  size = 168,
  thickness = 16,
  children,
}: {
  segments: AllocationSlice[]
  size?: number
  thickness?: number
  children?: React.ReactNode
}) {
  const animate = useAnimateDraw()
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  let acc = 0

  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={thickness} />
        {segments.map((s, i) => {
          const frac = s.pct / 100
          const dash = c * frac
          const off = -acc * c
          acc += frac
          return (
            <circle
              key={s.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={`var(--${s.color})`}
              strokeWidth={thickness}
              strokeLinecap="butt"
              strokeDasharray={`${animate ? 0 : dash} ${c}`}
              strokeDashoffset={off}
              style={{
                animation: animate
                  ? `atlasDonut-${i} 1000ms ${EASE} ${i * 120}ms forwards`
                  : undefined,
              }}
            >
              <style>{`@keyframes atlasDonut-${i}{to{stroke-dasharray:${dash} ${c}}}`}</style>
            </circle>
          )
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  )
}

export function Bar({
  pct,
  color = 'chart-1',
  delay = 200,
  className,
}: {
  pct: number
  color?: ChartColor | 'destructive'
  delay?: number
  className?: string
}) {
  const animate = useAnimateDraw()
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-muted', className)}>
      <div
        className="h-full rounded-full"
        style={{
          width: animate ? '0%' : `${pct}%`,
          background: `var(--${color})`,
          animation: animate ? `atlasBar 900ms ${EASE} ${delay}ms forwards` : undefined,
        }}
      >
        <style>{`@keyframes atlasBar{to{width:${pct}%}}`}</style>
      </div>
    </div>
  )
}

export interface ValuePoint {
  date: string
  total: number
}

function fmtMoney(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`
  return `${sign}$${abs.toFixed(0)}`
}
const FMT_DATE = new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short' })
function fmtDate(iso: string): string {
  const t = Date.parse(iso)
  return Number.isNaN(t) ? iso : FMT_DATE.format(new Date(t))
}

/** Full-width area+line chart with a hover tooltip (date · value). Measures its
 *  container so the line never distorts; renders an empty-state under 2 points. */
export function ValueChart({
  data,
  color = 'chart-1',
  height = 200,
  className,
}: {
  data: ValuePoint[]
  color?: ChartColor
  height?: number
  className?: string
}) {
  const animate = useAnimateDraw()
  const id = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(800)
  const [active, setActive] = useState<number | null>(null)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    setW(el.clientWidth)
    const ro = new ResizeObserver((entries) => setW(entries[0].contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const H = height
  const PAD = 10
  const geom = useMemo(() => {
    if (data.length < 2) return null
    const vals = data.map((d) => d.total)
    const min = Math.min(...vals)
    const max = Math.max(...vals)
    const span = max - min || 1
    const pts = data.map((d, i) => {
      const x = (i / (data.length - 1)) * w
      const y = PAD + (1 - (d.total - min) / span) * (H - PAD * 2)
      return [x, y] as const
    })
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
    let len = 0
    for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
    return { pts, line, area: `${line} L${w} ${H} L0 ${H} Z`, len }
  }, [data, w, H])

  if (!geom) {
    return (
      <div
        className={cn('flex items-center justify-center text-[12px] text-muted-foreground', className)}
        style={{ height: H }}
      >
        History building — real chart appears once a few days of data accrue.
      </div>
    )
  }

  function onMove(e: React.MouseEvent) {
    const el = wrapRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const rel = (e.clientX - rect.left) / rect.width
    setActive(Math.max(0, Math.min(data.length - 1, Math.round(rel * (data.length - 1)))))
  }

  const ap = active != null ? geom.pts[active] : null
  const ad = active != null ? data[active] : null
  const leftPct = active != null ? (active / (data.length - 1)) * 100 : 0

  return (
    <div ref={wrapRef} className={cn('relative', className)} onMouseMove={onMove} onMouseLeave={() => setActive(null)}>
      <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} className="block overflow-visible">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={`var(--${color})`} stopOpacity="0.20" />
            <stop offset="100%" stopColor={`var(--${color})`} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={geom.area} fill={`url(#${id})`} stroke="none" />
        <path
          d={geom.line}
          fill="none"
          stroke={`var(--${color})`}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: geom.len,
            strokeDashoffset: animate ? geom.len : 0,
            animation: animate ? `atlasDraw 1100ms ${EASE} 200ms forwards` : undefined,
          }}
        />
        {ap && (
          <>
            <line x1={ap[0]} y1={0} x2={ap[0]} y2={H} stroke="var(--border)" strokeWidth={1} />
            <circle cx={ap[0]} cy={ap[1]} r={4} fill={`var(--${color})`} stroke="var(--background)" strokeWidth={2} />
          </>
        )}
        <style>{`@keyframes atlasDraw{to{stroke-dashoffset:0}}`}</style>
      </svg>
      {ad && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 shadow-sm"
          style={{ left: `${leftPct}%` }}
        >
          <div className="font-mono text-[12px] text-foreground">{fmtMoney(ad.total)}</div>
          <div className="text-[10px] text-muted-foreground">{fmtDate(ad.date)}</div>
        </div>
      )}
    </div>
  )
}
