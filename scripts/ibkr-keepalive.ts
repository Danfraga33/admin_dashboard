/**
 * IBKR gateway keep-alive. Pings /tickle on an interval so the session doesn't
 * idle out (the gateway drops an idle session in ~5 min). Run it alongside the
 * gateway and leave it running:
 *
 *   npm run ibkr:keepalive
 *
 * It does NOT solve the ~24h hard session cap — that needs a manual browser
 * re-login (or IBeam). When the session lapses, this logs a clear warning so you
 * know to re-authenticate.
 */
import { tickle } from '../app/lib/ibkr.server'

const INTERVAL_MS = Number(process.env.IBKR_TICKLE_INTERVAL_MS ?? 60_000)

function ts(): string {
  return new Date().toISOString().slice(11, 19)
}

async function ping() {
  try {
    const { authenticated } = await tickle()
    if (authenticated) {
      console.log(`[${ts()}] tickle ok — session live`)
    } else {
      console.warn(`[${ts()}] ⚠ session NOT authenticated — re-login at the gateway URL (browser + 2FA)`)
    }
  } catch (e) {
    console.error(`[${ts()}] ✗ gateway unreachable: ${e instanceof Error ? e.message : e}`)
  }
}

console.log(`IBKR keep-alive started — tickle every ${INTERVAL_MS / 1000}s. Ctrl+C to stop.`)
await ping()
setInterval(ping, INTERVAL_MS)
