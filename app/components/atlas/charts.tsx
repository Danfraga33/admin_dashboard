import { useId, useMemo } from 'react'
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
