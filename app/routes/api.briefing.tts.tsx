import type { Route } from './+types/api.briefing.tts'
import { getBriefingLive } from '~/lib/briefing.server'

/**
 * Localhost-only briefing feed for the Jarvis clap sidecar.
 *
 * The sidecar (sidecar/jarvis.py) GETs this on a double clap and speaks the
 * result via ElevenLabs. It is NOT session-authenticated — the sidecar runs on
 * your machine, not in a browser — so it is gated by a shared bearer secret and
 * serves the single app user's briefing. Set SIDECAR_TTS_SECRET in .env.local
 * and mirror it as ATLAS_BRIEFING_SECRET in sidecar/.env.
 */

/** The only app user (owner of all RLS-scoped rows). */
const APP_USER_ID = '58d6a41d-4eaf-479a-855e-d426229c66eb'

export async function loader({ request }: Route.LoaderArgs) {
  const secret = process.env.SIDECAR_TTS_SECRET?.trim()
  if (!secret) {
    return Response.json({ error: 'SIDECAR_TTS_SECRET not configured' }, { status: 503 })
  }
  const auth = request.headers.get('Authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  if (token !== secret) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const briefing = await getBriefingLive(APP_USER_ID)
  // What the voice actually reads: greeting + summary, in one pass.
  const spoken = `${briefing.greeting} ${briefing.summary}`.trim()

  return Response.json({
    spoken,
    greeting: briefing.greeting,
    summary: briefing.summary,
    date: briefing.date,
  })
}
