export interface CalendarDay {
  date: string // ISO YYYY-MM-DD
  day: number // day of month
  inMonth: boolean
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Zero-padded ISO date from y/m/d (m is 0-indexed). */
export function isoDate(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

export function monthLabel(year: number, month: number): string {
  return `${MONTHS[month]} ${year}`
}

/** Step a {year, month} by delta months, wrapping the year. */
export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const total = year * 12 + month + delta
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 }
}

/**
 * Build a 6-row (42-cell) calendar grid for the given month, padded with
 * leading/trailing days from adjacent months so every week is full.
 */
export function buildMonthGrid(year: number, month: number): CalendarDay[] {
  const firstWeekday = new Date(year, month, 1).getDay() // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: CalendarDay[] = []

  // leading days from previous month
  const prev = addMonths(year, month, -1)
  const daysInPrev = new Date(prev.year, prev.month + 1, 0).getDate()
  for (let i = firstWeekday - 1; i >= 0; i--) {
    const day = daysInPrev - i
    cells.push({ date: isoDate(prev.year, prev.month, day), day, inMonth: false })
  }

  // current month
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ date: isoDate(year, month, day), day, inMonth: true })
  }

  // trailing days to fill 42 cells
  const next = addMonths(year, month, 1)
  let day = 1
  while (cells.length < 42) {
    cells.push({ date: isoDate(next.year, next.month, day), day, inMonth: false })
    day++
  }

  return cells
}
