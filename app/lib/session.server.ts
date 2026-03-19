import { redirect } from 'react-router'
import { createSupabaseServerClient } from './supabase.server'

export async function getSession(request: Request) {
  const responseHeaders = new Headers()
  const supabase = createSupabaseServerClient(request, responseHeaders)
  const { data: { session } } = await supabase.auth.getSession()
  return { session, supabase, responseHeaders }
}

export async function requireSession(request: Request) {
  const { session, supabase, responseHeaders } = await getSession(request)
  if (!session) throw redirect('/login', { headers: responseHeaders })
  return { session, supabase, responseHeaders }
}
