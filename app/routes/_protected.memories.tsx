import { useMemo, useState } from 'react'
import { data, useLoaderData } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { Star, Image as ImageIcon, Film } from 'lucide-react'
import { requireSession } from '~/lib/session.server'
import {
  MEMORIES_BUCKET,
  STORAGE_QUOTA_BYTES,
  collectTags,
  formatBytes,
  groupByMonth,
  parseTags,
  type Memory,
  type MemoryRow,
} from '~/lib/memories'
import { signMemories } from '~/lib/memories.server'
import { Uploader } from '~/components/memories/uploader'
import { MemoryGrid } from '~/components/memories/grid'
import { Lightbox } from '~/components/memories/lightbox'
import { cn } from '~/lib/utils'

type KindFilter = 'all' | 'image' | 'video'

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, supabase, responseHeaders } = await requireSession(request)

  const { data: rows, error } = await supabase
    .from('memories')
    .select('*')
    .order('taken_at', { ascending: false })

  if (error) console.error('load-memories error:', error)

  // `kind` comes back as a plain string from the generated types; the column's
  // check constraint is what actually narrows it.
  const memoryRows = (rows ?? []) as unknown as MemoryRow[]
  const memories = await signMemories(supabase, memoryRows)
  const usedBytes = memoryRows.reduce((sum, r) => sum + (r.size_bytes ?? 0), 0)

  return data(
    {
      memories,
      tags: collectTags(memoryRows),
      usedBytes,
      userId: session.user.id,
    },
    { headers: responseHeaders },
  )
}

export async function action({ request }: ActionFunctionArgs) {
  const { session, supabase, responseHeaders } = await requireSession(request)
  const formData = await request.formData()
  const intent = String(formData.get('intent') ?? '')

  if (intent === 'create') {
    const num = (key: string) => {
      const raw = formData.get(key)
      return raw ? Number(raw) : null
    }
    const { error } = await supabase.from('memories').insert({
      user_id: session.user.id,
      storage_path: String(formData.get('storage_path')),
      kind: String(formData.get('kind')),
      mime_type: String(formData.get('mime_type')),
      size_bytes: num('size_bytes'),
      width: num('width'),
      height: num('height'),
      duration_seconds: num('duration_seconds'),
      taken_at: String(formData.get('taken_at') || new Date().toISOString()),
    })
    if (error) {
      console.error('create-memory error:', error)
      // The file is already in the bucket; drop it so a failed insert does not
      // leave an orphan eating the storage quota.
      await supabase.storage.from(MEMORIES_BUCKET).remove([String(formData.get('storage_path'))])
      return data({ ok: false, intent, message: 'Could not save the memory.' }, { status: 500, headers: responseHeaders })
    }
    return data({ ok: true, intent }, { headers: responseHeaders })
  }

  if (intent === 'update') {
    const { error } = await supabase
      .from('memories')
      .update({
        caption: String(formData.get('caption') || '') || null,
        tags: parseTags(String(formData.get('tags') || '')),
      })
      .eq('id', String(formData.get('id')))
    if (error) console.error('update-memory error:', error)
  }

  if (intent === 'favorite') {
    const { error } = await supabase
      .from('memories')
      .update({ favorite: formData.get('favorite') === 'true' })
      .eq('id', String(formData.get('id')))
    if (error) console.error('favorite-memory error:', error)
  }

  if (intent === 'delete') {
    const storagePath = String(formData.get('storage_path'))
    const { error } = await supabase.from('memories').delete().eq('id', String(formData.get('id')))
    if (error) {
      console.error('delete-memory error:', error)
    } else {
      // Only reclaim the file once the row is gone, so a failed row delete
      // never orphans the record from its media.
      const { error: storageError } = await supabase.storage.from(MEMORIES_BUCKET).remove([storagePath])
      if (storageError) console.error('delete-memory-file error:', storageError)
    }
  }

  return data({ ok: true, intent }, { headers: responseHeaders })
}

export const meta = () => [{ title: 'Atlas · Memories' }]

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border-chart-1/40 bg-chart-1/15 text-foreground'
          : 'border-border bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

export default function Memories() {
  const { memories, tags, usedBytes, userId } = useLoaderData<typeof loader>()

  const [activeTags, setActiveTags] = useState<string[]>([])
  const [kind, setKind] = useState<KindFilter>('all')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [year, setYear] = useState<number | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const years = useMemo(() => {
    const set = new Set((memories as Memory[]).map((m) => new Date(m.taken_at).getFullYear()))
    return [...set].sort((a, b) => b - a)
  }, [memories])

  const filtered = useMemo(() => {
    return (memories as Memory[]).filter((m) => {
      if (kind !== 'all' && m.kind !== kind) return false
      if (favoritesOnly && !m.favorite) return false
      if (year !== null && new Date(m.taken_at).getFullYear() !== year) return false
      // Multiple tags narrow the set: a memory must carry all of them.
      if (activeTags.length > 0 && !activeTags.every((t) => m.tags.includes(t))) return false
      return true
    })
  }, [memories, kind, favoritesOnly, year, activeTags])

  const groups = useMemo(() => groupByMonth(filtered), [filtered])
  const quotaPct = Math.min(100, (usedBytes / STORAGE_QUOTA_BYTES) * 100)

  function toggleTag(tag: string) {
    setActiveTags((current) =>
      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag],
    )
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Memories</h1>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {formatBytes(usedBytes)} / 1 GB
          </span>
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full rounded-full', quotaPct > 85 ? 'bg-destructive' : 'bg-chart-1')}
              style={{ width: `${quotaPct}%` }}
            />
          </div>
        </div>
      </div>

      <Uploader userId={userId} />

      <div className="mb-6 flex flex-wrap items-center gap-1.5">
        <FilterChip active={kind === 'all'} onClick={() => setKind('all')}>
          All
        </FilterChip>
        <FilterChip active={kind === 'image'} onClick={() => setKind('image')}>
          <ImageIcon size={12} /> Photos
        </FilterChip>
        <FilterChip active={kind === 'video'} onClick={() => setKind('video')}>
          <Film size={12} /> Videos
        </FilterChip>
        <FilterChip active={favoritesOnly} onClick={() => setFavoritesOnly((f) => !f)}>
          <Star size={12} fill={favoritesOnly ? 'currentColor' : 'none'} /> Starred
        </FilterChip>

        {years.length > 0 && <span className="mx-1 h-4 w-px bg-border" />}
        {years.map((y) => (
          <FilterChip key={y} active={year === y} onClick={() => setYear(year === y ? null : y)}>
            {y}
          </FilterChip>
        ))}

        {tags.length > 0 && <span className="mx-1 h-4 w-px bg-border" />}
        {tags.map(({ tag, count }) => (
          <FilterChip key={tag} active={activeTags.includes(tag)} onClick={() => toggleTag(tag)}>
            {tag}
            <span className="font-mono text-[10px] text-muted-foreground">{count}</span>
          </FilterChip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-card px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {memories.length === 0 ? 'No memories yet. Drop something above.' : 'Nothing matches those filters.'}
          </p>
        </div>
      ) : (
        <MemoryGrid
          groups={groups}
          onSelect={(m) => setLightboxIndex(filtered.findIndex((f) => f.id === m.id))}
        />
      )}

      {lightboxIndex !== null && filtered[lightboxIndex] && (
        <Lightbox
          memories={filtered}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  )
}
