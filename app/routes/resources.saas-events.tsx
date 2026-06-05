import { data } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { requireSession } from '~/lib/session.server'
import { getSaasEventsLive } from '~/lib/saas-events.server'

// Awaits the full grounded Gemini search (~25-40s); needs the same raised wall
// as /events or the default 10s serverless limit kills it. See _protected.events.
export const config = { maxDuration: 60 }

export async function loader({ request }: LoaderFunctionArgs) {
  const { responseHeaders } = await requireSession(request)
  const result = await getSaasEventsLive()
  return data(result, { headers: responseHeaders })
}
