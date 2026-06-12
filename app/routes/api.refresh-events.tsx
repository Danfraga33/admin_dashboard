import type { LoaderFunctionArgs } from 'react-router'
import { refreshSaasEventsLive } from '~/lib/saas-events.server'

/** Vercel cron target. Vercel sends `Authorization: Bearer ${CRON_SECRET}`
 *  automatically when the CRON_SECRET env var is set on the project. */
export async function loader({ request }: LoaderFunctionArgs) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('Authorization') !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  try {
    const { events, fetchedAt } = await refreshSaasEventsLive()
    return Response.json({ ok: true, count: events.length, fetchedAt })
  } catch (err) {
    console.error('refresh-events cron failed:', err)
    const message = err instanceof Error ? err.message : String(err)
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}
