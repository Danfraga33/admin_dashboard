import { useEffect, useState } from 'react'
import { useFetcher } from 'react-router'
import { ChevronLeft, ChevronRight, Star, X, Trash2, Download } from 'lucide-react'
import { cn } from '~/lib/utils'
import { formatDuration, type Memory } from '~/lib/memories'

interface LightboxProps {
  memories: Memory[]
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
}

export function Lightbox({ memories, index, onIndexChange, onClose }: LightboxProps) {
  const memory = memories[index]
  const metaFetcher = useFetcher()
  const deleteFetcher = useFetcher()

  const [caption, setCaption] = useState(memory?.caption ?? '')
  const [tagInput, setTagInput] = useState((memory?.tags ?? []).join(', '))

  // Re-seed the editable fields whenever a different memory comes into view.
  useEffect(() => {
    setCaption(memory?.caption ?? '')
    setTagInput((memory?.tags ?? []).join(', '))
  }, [memory?.id])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        if (e.key === 'Escape') target.blur()
        return
      }
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' && index < memories.length - 1) onIndexChange(index + 1)
      if (e.key === 'ArrowLeft' && index > 0) onIndexChange(index - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, memories.length, onClose, onIndexChange])

  if (!memory) return null

  const dirty =
    caption !== (memory.caption ?? '') || tagInput !== (memory.tags ?? []).join(', ')

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-5 py-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {memory.caption || 'Untitled'}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {new Date(memory.taken_at).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
            {memory.kind === 'video' && memory.duration_seconds
              ? ` · ${formatDuration(memory.duration_seconds)}`
              : ''}
            {` · ${index + 1}/${memories.length}`}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <metaFetcher.Form method="post">
            <input type="hidden" name="intent" value="favorite" />
            <input type="hidden" name="id" value={memory.id} />
            <input type="hidden" name="favorite" value={String(!memory.favorite)} />
            <button
              type="submit"
              title={memory.favorite ? 'Unstar' : 'Star'}
              className={cn(
                'grid h-8 w-8 cursor-pointer place-items-center rounded-md transition-colors hover:bg-muted',
                memory.favorite ? 'text-chart-1' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Star size={16} fill={memory.favorite ? 'currentColor' : 'none'} />
            </button>
          </metaFetcher.Form>

          {memory.url && (
            <a
              href={memory.url}
              target="_blank"
              rel="noopener noreferrer"
              title="Open original"
              className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Download size={16} />
            </a>
          )}

          <deleteFetcher.Form method="post">
            <input type="hidden" name="intent" value="delete" />
            <input type="hidden" name="id" value={memory.id} />
            <input type="hidden" name="storage_path" value={memory.storage_path} />
            <button
              type="submit"
              title="Delete"
              onClick={(e) => {
                if (!window.confirm('Delete this memory? This cannot be undone.')) {
                  e.preventDefault()
                  return
                }
                onClose()
              }}
              className="grid h-8 w-8 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-destructive-foreground"
            >
              <Trash2 size={16} />
            </button>
          </deleteFetcher.Form>

          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 py-4">
        {index > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onIndexChange(index - 1)
            }}
            className="absolute left-3 z-10 grid h-10 w-10 cursor-pointer place-items-center rounded-full border border-border bg-card/90 text-foreground transition-colors hover:bg-muted"
          >
            <ChevronLeft size={18} />
          </button>
        )}

        <div onClick={(e) => e.stopPropagation()} className="flex h-full items-center justify-center">
          {memory.kind === 'video' ? (
            <video
              key={memory.id}
              src={memory.url ?? undefined}
              controls
              autoPlay
              playsInline
              className="max-h-full max-w-full rounded-lg"
            />
          ) : (
            <img
              key={memory.id}
              src={memory.url ?? undefined}
              alt={memory.caption ?? ''}
              className="max-h-full max-w-full rounded-lg object-contain"
            />
          )}
        </div>

        {index < memories.length - 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onIndexChange(index + 1)
            }}
            className="absolute right-3 z-10 grid h-10 w-10 cursor-pointer place-items-center rounded-full border border-border bg-card/90 text-foreground transition-colors hover:bg-muted"
          >
            <ChevronRight size={18} />
          </button>
        )}
      </div>

      <metaFetcher.Form
        method="post"
        onClick={(e) => e.stopPropagation()}
        className="flex shrink-0 flex-col gap-2 border-t border-border px-5 py-3 sm:flex-row sm:items-center"
      >
        <input type="hidden" name="intent" value="update" />
        <input type="hidden" name="id" value={memory.id} />
        <input
          name="caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Caption"
          className="flex-1 rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          name="tags"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          placeholder="Tags, comma separated"
          className="rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring sm:w-64"
        />
        <button
          type="submit"
          disabled={!dirty || metaFetcher.state !== 'idle'}
          className="shrink-0 cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Save
        </button>
      </metaFetcher.Form>
    </div>
  )
}
