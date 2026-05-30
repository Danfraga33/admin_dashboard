import { useRef } from 'react'
import { cn } from '~/lib/utils'
import type { ChartColor } from '~/lib/atlas-data'

export function Card({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('bg-card border border-border rounded-xl shadow-sm', className)} {...rest}>
      {children}
    </div>
  )
}

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: ChartColor
  lift?: boolean
}

/** Card that lifts on hover and shows an accent radial glow following the cursor. */
export function SpotlightCard({
  className,
  glow = 'chart-1',
  lift = true,
  children,
  ...rest
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null)

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - r.left}px`)
    el.style.setProperty('--my', `${e.clientY - r.top}px`)
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      className={cn(
        'group relative overflow-hidden bg-card border border-border rounded-xl shadow-sm',
        'transition-[transform,box-shadow,border-color] duration-300 ease-out',
        lift && 'hover:-translate-y-0.5 hover:shadow-md hover:border-foreground/15',
        className,
      )}
      {...rest}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(240px circle at var(--mx,50%) var(--my,0%), color-mix(in oklch, var(--${glow}) 16%, transparent), transparent 60%)`,
        }}
      />
      <div className="relative">{children}</div>
    </div>
  )
}
