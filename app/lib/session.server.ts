import { redirect } from 'react-router'
import type { User } from '@supabase/supabase-js'
import { createSupabaseServerClient } from './supabase.server'

type SupabaseServerClient = ReturnType<typeof createSupabaseServerClient>

/**
 * React Router runs the layout loader and every matched route loader in
 * PARALLEL on one navigation. Each calls getUser(), which refreshes the
 * session token when it is near expiry. Several parallel refreshes of the
 * SAME refresh token make Supabase return 409 "Too many concurrent token
 * refresh requests". We dedupe by the auth cookie: concurrent getUser calls
 * carrying the same cookie await a single in-flight request.
 */
const inflight = new Map<string, Promise<User | null>>()

/** The Supabase auth cookies identify the session; use them as the dedupe key. */
function sessionKey(request: Request): string {
  const cookie = request.headers.get('Cookie') ?? ''
  const auth = cookie
    .split(';')
    .map((c) => c.trim())
    .filter((c) => c.startsWith('sb-'))
    .sort()
    .join(';')
  return auth || 'anon'
}

async function getUserDeduped(request: Request, supabase: SupabaseServerClient): Promise<User | null> {
  const key = sessionKey(request)
  const existing = inflight.get(key)
  if (existing) return existing

  const p = supabase.auth
    .getUser()
    .then(({ data }) => data.user ?? null)
    .finally(() => {
      // clear on next tick so the whole parallel loader batch shares this result
      queueMicrotask(() => inflight.delete(key))
    })

  inflight.set(key, p)
  return p
}

export async function getSession(request: Request) {
  const responseHeaders = new Headers()
  const supabase = createSupabaseServerClient(request, responseHeaders)
  const user = await getUserDeduped(request, supabase)
  return { session: user ? { user } : null, supabase, responseHeaders }
}

export async function requireSession(request: Request) {
  const { session, supabase, responseHeaders } = await getSession(request)
  if (!session) throw redirect('/login', { headers: responseHeaders })
  return { session, supabase, responseHeaders }
}
