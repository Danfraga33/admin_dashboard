import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Compact currency string for card metrics: 1284000 → "$1.28M", 940000 → "$940K". */
export function fmtCompact(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `$${Math.round(n / 1_000)}K`
  return `$${Math.round(n).toLocaleString('en-US')}`
}
