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
  mask = false,
}: {
  segments: AllocationSlice[]
  size?: number
  thickness?: number
  children?: React.ReactNode
  mask?: boolean
}) {
  const animate = useAnimateDraw()
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  let acc = 0

  return (
    <div
      className={cn('relative inline-grid place-items-center transition-[filter] duration-200', mask && 'blur-[7px] select-none')}
      style={{ width: size, height: size }}
    >
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

/** Smooth path through points via a Catmull-Rom spline converted to cubic béziers. */
function smoothPath(pts: readonly (readonly [number, number])[]): string {
  if (pts.length < 2) return ''
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2 < pts.length ? i + 2 : pts.length - 1]
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
  }
  return d
}

export interface ChartSeries {
  label: string
  color: ChartColor
  values: number[]
}

/** Multi-line time chart on a shared y-scale with a hover tooltip listing every
 *  series at the hovered date. Measures its container so lines never distort;
 *  renders an empty-state under 2 points. */
export function ValueChart({
  dates,
  series,
  height = 220,
  className,
  mask = false,
}: {
  dates: string[]
  series: ChartSeries[]
  height?: number
  className?: string
  mask?: boolean
}) {
  const animate = useAnimateDraw()
  const gid = useId()
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
    if (dates.length < 2 || series.length === 0) return null
    const all = series.flatMap((s) => s.values)
    const min = Math.min(...all)
    const max = Math.max(...all)
    const span = max - min || 1
    const xAt = (i: number) => (i / (dates.length - 1)) * w
    const yAt = (v: number) => PAD + (1 - (v - min) / span) * (H - PAD * 2)
    const lines = series.map((s) => {
      const pts = s.values.map((v, i) => [xAt(i), yAt(v)] as const)
      const d = smoothPath(pts)
      let len = 0
      for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
      return { ...s, pts, d, area: `${d} L${w.toFixed(1)} ${H} L0 ${H} Z`, len }
    })
    return { lines, xAt }
  }, [dates, series, w, H])

  if (!geom) {
    return (
      <div
        className={cn('flex items-center justify-center text-[12px] text-muted-foreground', className)}
        style={{ height: H }}
      >
        History building — chart appears once a few days of data accrue.
      </div>
    )
  }

  function onMove(e: React.MouseEvent) {
    const el = wrapRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const rel = (e.clientX - rect.left) / rect.width
    setActive(Math.max(0, Math.min(dates.length - 1, Math.round(rel * (dates.length - 1)))))
  }

  const guideX = active != null ? geom.xAt(active) : 0
  const leftPct = active != null ? (active / (dates.length - 1)) * 100 : 0

  return (
    <div className={cn('relative', className)}>
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1">
        {series.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="h-2 w-2.5 rounded-full" style={{ background: `var(--${s.color})` }} />
            {s.label}
          </span>
        ))}
      </div>
      <div
        ref={wrapRef}
        className={cn('relative transition-[filter] duration-200', mask && 'blur-[7px] select-none')}
        onMouseMove={mask ? undefined : onMove}
        onMouseLeave={() => setActive(null)}
      >
        <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} className="block overflow-visible">
          <defs>
            {geom.lines.map((ln, li) => (
              <linearGradient key={ln.label} id={`${gid}-${li}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={`var(--${ln.color})`} stopOpacity="0.18" />
                <stop offset="100%" stopColor={`var(--${ln.color})`} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>
          {geom.lines.map((ln, li) => (
            <path
              key={`area-${ln.label}`}
              d={ln.area}
              fill={`url(#${gid}-${li})`}
              stroke="none"
              style={{
                opacity: animate ? 0 : 1,
                animation: animate ? `atlasFadeIn 700ms ease ${400 + li * 120}ms forwards` : undefined,
              }}
            />
          ))}
          {active != null && <line x1={guideX} y1={0} x2={guideX} y2={H} stroke="var(--border)" strokeWidth={1} />}
          {geom.lines.map((ln, li) => (
            <path
              key={ln.label}
              d={ln.d}
              fill="none"
              stroke={`var(--${ln.color})`}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: ln.len,
                strokeDashoffset: animate ? ln.len : 0,
                animation: animate ? `atlasDraw 1100ms ${EASE} ${200 + li * 120}ms forwards` : undefined,
              }}
            />
          ))}
          {active != null &&
            geom.lines.map((ln) => (
              <circle
                key={ln.label}
                cx={ln.pts[active][0]}
                cy={ln.pts[active][1]}
                r={3.5}
                fill={`var(--${ln.color})`}
                stroke="var(--background)"
                strokeWidth={2}
              />
            ))}
          <style>{`@keyframes atlasDraw{to{stroke-dashoffset:0}}@keyframes atlasFadeIn{to{opacity:1}}`}</style>
        </svg>
        {active != null && (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2.5 py-1.5 shadow-sm"
            style={{ left: `${leftPct}%` }}
          >
            <div className="mb-1 text-[10px] text-muted-foreground">{fmtDate(dates[active])}</div>
            {geom.lines.map((ln) => (
              <div key={ln.label} className="flex items-center gap-2 text-[11px]">
                <span className="h-2 w-2 rounded-full" style={{ background: `var(--${ln.color})` }} />
                <span className="text-muted-foreground">{ln.label}</span>
                <span className="ml-auto font-mono text-foreground">{fmtMoney(ln.values[active])}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
