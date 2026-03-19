import { createServerClient } from '@supabase/ssr'

export function createSupabaseServerClient(request: Request, responseHeaders: Headers) {
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(request.headers.get('Cookie') ?? '')
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            responseHeaders.append(
              'Set-Cookie',
              serializeCookieHeader(name, value, options)
            )
          })
        },
      },
    }
  )
}

function parseCookieHeader(header: string) {
  return header.split(';').filter(Boolean).map((cookie) => {
    const [name, ...rest] = cookie.trim().split('=')
    return { name: name.trim(), value: rest.join('=').trim() }
  })
}

function serializeCookieHeader(name: string, value: string, options: Record<string, unknown> = {}) {
  let cookie = `${name}=${value}`
  if (options.maxAge) cookie += `; Max-Age=${options.maxAge}`
  if (options.path) cookie += `; Path=${options.path}`
  if (options.httpOnly) cookie += `; HttpOnly`
  if (options.secure) cookie += `; Secure`
  if (options.sameSite) cookie += `; SameSite=${options.sameSite}`
  return cookie
}
