import { Play, Star } from 'lucide-react'
import { cn } from '~/lib/utils'
import { formatDuration, type Memory } from '~/lib/memories'

function Tile({ memory, onSelect }: { memory: Memory; onSelect: (m: Memory) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(memory)}
      className="group relative block w-full cursor-pointer overflow-hidden rounded-lg border border-border bg-muted/30"
      style={{ aspectRatio: memory.width && memory.height ? `${memory.width} / ${memory.height}` : '1 / 1' }}
    >
      {memory.thumbUrl ? (
        memory.kind === 'video' ? (
          // preload="metadata" gets the browser to paint the first frame as a
          // poster without downloading the whole file.
          <video
            src={`${memory.thumbUrl}#t=0.1`}
            preload="metadata"
            muted
            playsInline
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <img
            src={memory.thumbUrl}
            alt={memory.caption ?? ''}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        )
      ) : (
        <div className="grid h-full w-full place-items-center text-[11px] text-muted-foreground">
          Unavailable
        </div>
      )}

      {memory.kind === 'video' && (
        <span className="pointer-events-none absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 font-mono text-[10px] text-white">
          <Play size={9} fill="currentColor" />
          {formatDuration(memory.duration_seconds)}
        </span>
      )}

      {memory.favorite && (
        <span className="pointer-events-none absolute right-2 top-2 text-chart-1">
          <Star size={14} fill="currentColor" />
        </span>
      )}

      {memory.caption && (
        <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/75 to-transparent px-2.5 pb-2 pt-6 text-left text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100">
          {memory.caption}
        </span>
      )}
    </button>
  )
}

export function MemoryGrid({
  groups,
  onSelect,
}: {
  groups: { label: string; items: Memory[] }[]
  onSelect: (m: Memory) => void
}) {
  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.label}>
          <div className="mb-3 flex items-baseline gap-3">
            <h2 className="text-sm font-medium text-foreground">{group.label}</h2>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
              {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          <div
            className={cn(
              'grid gap-2',
              'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
            )}
          >
            {group.items.map((memory) => (
              <Tile key={memory.id} memory={memory} onSelect={onSelect} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
