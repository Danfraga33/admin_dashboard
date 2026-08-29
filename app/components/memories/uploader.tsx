import { useRef, useState } from 'react'
import { useRevalidator } from 'react-router'
import { Upload, X, AlertCircle } from 'lucide-react'
import { getSupabaseBrowserClient } from '~/lib/supabase.client'
import { cn } from '~/lib/utils'

const MAX_FILE_BYTES = 50 * 1024 * 1024
const MEMORIES_BUCKET = 'memories'

interface PendingUpload {
  id: string
  name: string
  status: 'uploading' | 'error' | 'done'
  error?: string
}

interface Probe {
  width: number | null
  height: number | null
  duration: number | null
}

/**
 * Reads intrinsic dimensions (and duration, for video) in the browser so the
 * grid can lay out at the right aspect ratio without downloading the file.
 * Failures are non-fatal — the row is stored without dimensions.
 */
function probeMedia(file: File, kind: 'image' | 'video'): Promise<Probe> {
  return new Promise((resolve) => {
    const empty: Probe = { width: null, height: null, duration: null }
    const url = URL.createObjectURL(file)
    const done = (result: Probe) => {
      URL.revokeObjectURL(url)
      resolve(result)
    }
    const timeout = window.setTimeout(() => done(empty), 10_000)

    if (kind === 'image') {
      const img = new Image()
      img.onload = () => {
        window.clearTimeout(timeout)
        done({ width: img.naturalWidth, height: img.naturalHeight, duration: null })
      }
      img.onerror = () => {
        window.clearTimeout(timeout)
        done(empty)
      }
      img.src = url
      return
    }

    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      window.clearTimeout(timeout)
      done({
        width: video.videoWidth || null,
        height: video.videoHeight || null,
        duration: Number.isFinite(video.duration) ? video.duration : null,
      })
    }
    video.onerror = () => {
      window.clearTimeout(timeout)
      done(empty)
    }
    video.src = url
  })
}

/** Anything wider or taller than this is downscaled before upload. */
const MAX_IMAGE_EDGE = 2560

/**
 * Supabase's image transform API is a paid feature, so the grid always loads
 * the stored file. Downscaling oversized photos here keeps that cheap and
 * stretches the 1GB free-tier quota — a 12MP phone photo drops from ~5MB to
 * a few hundred KB. Videos and small images are uploaded untouched, and any
 * failure falls back to the original file.
 */
async function downscaleImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  // GIFs would lose their animation and HEIC is not canvas-decodable.
  if (file.type === 'image/gif' || file.type === 'image/heic') return file

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height))
    if (scale === 1) {
      bitmap.close()
      return file
    }

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close()
      return file
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85),
    )
    if (!blob || blob.size >= file.size) return file

    return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
      type: 'image/jpeg',
      lastModified: file.lastModified,
    })
  } catch (err) {
    console.error('downscale failed, uploading original:', err)
    return file
  }
}

function extensionFor(file: File): string {
  const fromName = file.name.split('.').pop()
  if (fromName && fromName.length <= 5 && fromName !== file.name) return fromName.toLowerCase()
  return file.type.split('/')[1] ?? 'bin'
}

export function Uploader({ userId }: { userId: string }) {
  const [pending, setPending] = useState<PendingUpload[]>([])
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const revalidator = useRevalidator()

  async function uploadOne(original: File) {
    const localId = `${original.name}-${original.size}-${performance.now()}`
    const kind: 'image' | 'video' = original.type.startsWith('video/') ? 'video' : 'image'

    setPending((p) => [...p, { id: localId, name: original.name, status: 'uploading' }])

    try {
      // Probe first: dimensions come from the source, not the downscaled copy,
      // only in as far as aspect ratio is what the grid needs — both match.
      const probe = await probeMedia(original, kind)
      const file = await downscaleImage(original)

      // Videos can still blow the cap; images almost never do after downscaling.
      if (file.size > MAX_FILE_BYTES) {
        setPending((p) =>
          p.map((u) =>
            u.id === localId ? { ...u, status: 'error', error: 'Over the 50MB limit' } : u,
          ),
        )
        return
      }

      const supabase = getSupabaseBrowserClient()
      const memoryId = crypto.randomUUID()
      // Path shape must stay {user_id}/... — the storage RLS policy reads the
      // first segment as the owner id.
      const storagePath = `${userId}/${memoryId}.${extensionFor(file)}`

      const { error: uploadError } = await supabase.storage
        .from(MEMORIES_BUCKET)
        .upload(storagePath, file, { contentType: file.type, upsert: false })

      if (uploadError) throw uploadError

      // The DB row is written by the route action so it goes through the
      // server's RLS-scoped client rather than trusting the browser.
      const form = new FormData()
      form.set('intent', 'create')
      form.set('storage_path', storagePath)
      form.set('kind', kind)
      form.set('mime_type', file.type)
      form.set('size_bytes', String(file.size))
      if (probe.width) form.set('width', String(probe.width))
      if (probe.height) form.set('height', String(probe.height))
      if (probe.duration) form.set('duration_seconds', String(probe.duration))
      // File.lastModified is the closest thing to a capture date available
      // without parsing EXIF; falls back to now for files that lack it.
      form.set('taken_at', new Date(file.lastModified || Date.now()).toISOString())

      const res = await fetch('/memories', { method: 'POST', body: form })
      if (!res.ok) throw new Error('Could not save the memory record')

      setPending((p) => p.map((u) => (u.id === localId ? { ...u, status: 'done' } : u)))
      revalidator.revalidate()
      window.setTimeout(() => setPending((p) => p.filter((u) => u.id !== localId)), 1200)
    } catch (err) {
      console.error('upload error:', err)
      setPending((p) =>
        p.map((u) =>
          u.id === localId
            ? { ...u, status: 'error', error: err instanceof Error ? err.message : 'Upload failed' }
            : u,
        ),
      )
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files) return
    for (const file of Array.from(files)) void uploadOne(file)
  }

  const uploading = pending.filter((p) => p.status === 'uploading').length

  return (
    <div className="mb-6">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center transition-colors',
          dragging ? 'border-chart-1 bg-chart-1/5' : 'border-border bg-card hover:bg-muted/20',
        )}
      >
        <Upload size={20} className="text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">
          {uploading > 0 ? `Uploading ${uploading}…` : 'Drop photos or videos here'}
        </p>
        <p className="text-[11px] text-muted-foreground">
          JPEG · PNG · WebP · HEIC · MP4 · MOV · WebM — 50MB max per file
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          hidden
          onChange={(e) => {
            handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {pending.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {pending.map((p) => (
            <li
              key={p.id}
              className={cn(
                'flex items-center gap-2 rounded-md border px-3 py-2 text-xs',
                p.status === 'error'
                  ? 'border-destructive/40 bg-destructive/10 text-destructive-foreground'
                  : 'border-border bg-card text-muted-foreground',
              )}
            >
              {p.status === 'error' ? (
                <AlertCircle size={13} className="shrink-0" />
              ) : (
                <span
                  className={cn(
                    'h-1.5 w-1.5 shrink-0 rounded-full',
                    p.status === 'done' ? 'bg-chart-2' : 'animate-pulse bg-chart-1',
                  )}
                />
              )}
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              <span className="shrink-0 font-mono text-[10px]">
                {p.status === 'error' ? p.error : p.status === 'done' ? 'saved' : 'uploading'}
              </span>
              {p.status === 'error' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setPending((list) => list.filter((u) => u.id !== p.id))
                  }}
                  className="shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
                >
                  <X size={12} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
