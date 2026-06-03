import { describe, it, expect } from 'vitest'
import { isoDate, monthLabel, addMonths, buildMonthGrid } from './calendar'

describe('isoDate', () => {
  it('zero-pads month and day', () => {
    expect(isoDate(2026, 0, 5)).toBe('2026-01-05')
    expect(isoDate(2026, 11, 31)).toBe('2026-12-31')
  })
})

describe('monthLabel', () => {
  it('names the month', () => {
    expect(monthLabel(2026, 5)).toBe('June 2026')
  })
})

describe('addMonths', () => {
  it('steps forward within a year', () => {
    expect(addMonths(2026, 5, 1)).toEqual({ year: 2026, month: 6 })
  })
  it('wraps the year forward', () => {
    expect(addMonths(2026, 11, 1)).toEqual({ year: 2027, month: 0 })
  })
  it('wraps the year backward', () => {
    expect(addMonths(2026, 0, -1)).toEqual({ year: 2025, month: 11 })
  })
})

describe('buildMonthGrid', () => {
  it('always returns 42 cells', () => {
    expect(buildMonthGrid(2026, 5)).toHaveLength(42)
    expect(buildMonthGrid(2026, 1)).toHaveLength(42) // Feb
  })

  it('marks in-month days correctly for June 2026 (30 days)', () => {
    const grid = buildMonthGrid(2026, 5)
    expect(grid.filter((c) => c.inMonth)).toHaveLength(30)
  })

  it('first in-month day is the 1st and lands on correct weekday', () => {
    // June 1 2026 is a Monday → index 1
    const grid = buildMonthGrid(2026, 5)
    const firstIdx = grid.findIndex((c) => c.inMonth)
    expect(grid[firstIdx].day).toBe(1)
    expect(firstIdx).toBe(1)
  })

  it('handles leap-year February (29 days, 2028)', () => {
    const grid = buildMonthGrid(2028, 1)
    expect(grid.filter((c) => c.inMonth)).toHaveLength(29)
    expect(grid.find((c) => c.inMonth && c.day === 29)?.date).toBe('2028-02-29')
  })

  it('leading cells belong to previous month, trailing to next', () => {
    const grid = buildMonthGrid(2026, 5)
    expect(grid[0].date.startsWith('2026-05')).toBe(true) // May
    expect(grid[41].date.startsWith('2026-07')).toBe(true) // July
  })
})
