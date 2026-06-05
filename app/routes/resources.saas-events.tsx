import { data } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { requireSession } from '~/lib/session.server'
import { getSaasEventsLive } from '~/lib/saas-events.server'

export async function loader({ request }: LoaderFunctionArgs) {
  const { responseHeaders } = await requireSession(request)
  const result = await getSaasEventsLive()
  return data(result, { headers: responseHeaders })
}
