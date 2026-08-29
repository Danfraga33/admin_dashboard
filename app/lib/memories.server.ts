import type { SupabaseClient } from '@supabase/supabase-js'
import { MEMORIES_BUCKET, type Memory, type MemoryRow } from './memories'

/** Signed URLs are short-lived; the grid refetches on every navigation anyway. */
const SIGNED_URL_TTL_SECONDS = 60 * 60

/**
 * The bucket is private, so every file needs a signed URL — one batch call for
 * the whole page. Supabase's on-the-fly image transforms are a paid feature, so
 * there are no server-side thumbnails: images are downscaled in the browser
 * before upload instead, which keeps both the grid and the 1GB quota cheap.
 */
export async function signMemories(
  supabase: SupabaseClient,
  rows: MemoryRow[],
): Promise<Memory[]> {
  if (rows.length === 0) return []

  const paths = rows.map((r) => r.storage_path)
  const { data: signed, error } = await supabase.storage
    .from(MEMORIES_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)

  if (error) console.error('sign-memories error:', error)

  const byPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]))

  return rows.map((row) => {
    const url = byPath.get(row.storage_path) ?? null
    return { ...row, url, thumbUrl: url }
  })
}
