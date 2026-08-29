import { describe, it, expect } from 'vitest'
import { collectTags, parseTags, formatBytes, groupByMonth } from './memories'

describe('parseTags', () => {
  it('splits, trims, lowercases and dedupes', () => {
    expect(parseTags(' Japan, family ,JAPAN,  ')).toEqual(['japan', 'family'])
  })

  it('returns an empty array for blank input', () => {
    expect(parseTags('   ')).toEqual([])
  })
})

describe('collectTags', () => {
  it('counts tags and sorts by frequency then name', () => {
    const rows = [
      { tags: ['japan', 'family'] },
      { tags: ['japan'] },
      { tags: ['beach'] },
    ]
    expect(collectTags(rows)).toEqual([
      { tag: 'japan', count: 2 },
      { tag: 'beach', count: 1 },
      { tag: 'family', count: 1 },
    ])
  })

  it('tolerates rows with no tags', () => {
    expect(collectTags([{ tags: [] }])).toEqual([])
  })
})

describe('formatBytes', () => {
  it('scales units', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2 KB')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB')
    expect(formatBytes(2 * 1024 * 1024 * 1024)).toBe('2.00 GB')
  })
})

describe('groupByMonth', () => {
  it('buckets by calendar month preserving input order', () => {
    const groups = groupByMonth([
      { taken_at: '2026-08-20T10:00:00Z' },
      { taken_at: '2026-08-02T10:00:00Z' },
      { taken_at: '2026-07-30T10:00:00Z' },
    ])
    expect(groups).toHaveLength(2)
    expect(groups[0].items).toHaveLength(2)
    expect(groups[1].items).toHaveLength(1)
  })

  it('keeps same-month-different-year apart', () => {
    const groups = groupByMonth([
      { taken_at: '2026-08-20T10:00:00Z' },
      { taken_at: '2025-08-20T10:00:00Z' },
    ])
    expect(groups).toHaveLength(2)
  })
})
