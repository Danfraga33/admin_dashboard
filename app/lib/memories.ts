export const MEMORIES_BUCKET = 'memories'

/** Supabase free tier: 1GB total storage, 50MB per object. */
export const MAX_FILE_BYTES = 50 * 1024 * 1024
export const STORAGE_QUOTA_BYTES = 1024 * 1024 * 1024

export interface MemoryRow {
  id: string
  user_id: string
  storage_path: string
  kind: 'image' | 'video'
  mime_type: string
  size_bytes: number | null
  width: number | null
  height: number | null
  duration_seconds: number | null
  caption: string | null
  taken_at: string
  tags: string[]
  favorite: boolean
  created_at: string
}

export interface Memory extends MemoryRow {
  url: string | null
  thumbUrl: string | null
}

/** Every distinct tag in use, with counts, for the filter bar. */
export function collectTags(rows: Pick<MemoryRow, 'tags'>[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const row of rows) {
    for (const tag of row.tags ?? []) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}

export function parseTags(input: string): string[] {
  return [
    ...new Set(
      input
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    ),
  ]
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export function formatDuration(seconds: number | null): string {
  if (!seconds || !Number.isFinite(seconds)) return ''
  const total = Math.round(seconds)
  const mins = Math.floor(total / 60)
  const secs = total % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

/** Groups memories into month buckets, newest first, for the timeline headers. */
export function groupByMonth<T extends { taken_at: string }>(items: T[]): { label: string; items: T[] }[] {
  const groups = new Map<string, { label: string; items: T[] }>()
  for (const item of items) {
    const date = new Date(item.taken_at)
    const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`
    let group = groups.get(key)
    if (!group) {
      group = {
        label: date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
        items: [],
      }
      groups.set(key, group)
    }
    group.items.push(item)
  }
  return [...groups.values()]
}
