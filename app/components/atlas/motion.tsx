import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '~/lib/utils'

/**
 * SSR-safe entrance gate. Returns false on the server and on the very first
 * client render (so hydration matches and content is visible without JS), then
 * flips true after mount so the entrance plays exactly once on the live client.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted
}

const EASE = [0.22, 1, 0.36, 1] as const

/** When true, descendants skip their entrance and render final state (used during nav). */
export const RevealContext = createContext(false)

type RevealProps = {
  delay?: number // ms
  y?: number
  blur?: boolean
  className?: string
  children: React.ReactNode
} & Omit<HTMLMotionProps<'div'>, 'children' | 'className'>

/** Fade-up reveal on mount. Renders final/visible state on server + when reduced-motion. */
export function Reveal({ delay = 0, y = 12, blur = false, className, children, ...rest }: RevealProps) {
  const mounted = useMounted()
  const settled = useContext(RevealContext)
  const reduce = useReducedMotion()
  const animate = mounted && !settled && !reduce

  return (
    <motion.div
      className={className}
      initial={false}
      animate={
        animate
          ? { opacity: [0, 1], y: [y, 0], filter: blur ? ['blur(6px)', 'blur(0px)'] : undefined }
          : { opacity: 1, y: 0, filter: blur ? 'blur(0px)' : undefined }
      }
      transition={{ duration: 0.52, ease: EASE, delay: delay / 1000 }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

/** Stagger helper: delay (ms) for index i. */
export const stag = (i: number, base = 0, step = 70) => base + i * step

/** Count-up with reduced-motion + SSR safety (renders final value when not animating). */
export function useCountUp(
  target: number | null | undefined,
  { duration = 1100, decimals = 0 }: { duration?: number; decimals?: number } = {},
): string | null {
  const mounted = useMounted()
  const reduce = useReducedMotion()
  const [v, setV] = useState<number>(target ?? 0)
  const raf = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (target == null) return
    if (!mounted || reduce) {
      setV(target)
      return
    }
    let t0: number | undefined
    setV(0)
    const step = (t: number) => {
      if (t0 === undefined) t0 = t
      const p = Math.min(1, (t - t0) / duration)
      setV(target * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf.current = requestAnimationFrame(step)
      else setV(target)
    }
    raf.current = requestAnimationFrame(step)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [mounted, reduce, target, duration])

  if (target == null) return null
  return v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export function Num({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  duration,
  className,
}: {
  value: number | null | undefined
  prefix?: string
  suffix?: string
  decimals?: number
  duration?: number
  className?: string
}) {
  const n = useCountUp(value, { decimals, duration })
  return (
    <span className={cn('font-mono tabular-nums', className)}>
      {n == null ? '—' : `${prefix}${n}${suffix}`}
    </span>
  )
}
