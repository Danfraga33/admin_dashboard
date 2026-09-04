import type { LoaderFunctionArgs } from 'react-router'
import { createSupabaseAdminClient } from '~/lib/supabase.admin'
import { syncSharesight } from '~/lib/sharesight.server'

/**
 * Daily Sharesight sync. Without this the portfolio only refreshes when the
 * dashboard is opened, so `sharesight_value_history` grew month-wide gaps and
 * the value chart looked frozen.
 *
 * Vercel cron target — Vercel sends `Authorization: Bearer ${CRON_SECRET}`
 * automatically when the CRON_SECRET env var is set on the project.
 */

/** The only app user (owner of all RLS-scoped rows). */
const APP_USER_ID = '58d6a41d-4eaf-479a-855e-d426229c66eb'

export async function loader({ request }: LoaderFunctionArgs) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('Authorization') !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  try {
    const admin = createSupabaseAdminClient()
    await syncSharesight(admin, APP_USER_ID)
    return Response.json({ ok: true, syncedAt: new Date().toISOString() })
  } catch (err) {
    console.error('sharesight sync cron failed:', err)
    const message = err instanceof Error ? err.message : String(err)
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}
