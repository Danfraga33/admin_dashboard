import { PassThrough } from 'node:stream'
import { createElement } from 'react'
import { createReadableStreamFromReadable } from '@react-router/node'
import { isbot } from 'isbot'
import { renderToPipeableStream } from 'react-dom/server'
import { ServerRouter, type EntryContext } from 'react-router'

/**
 * How long the server keeps the SSR stream open for pending deferred data
 * before aborting. The /events route streams a grounded Gemini search that can
 * run up to REGION_TIMEOUT_MS (45s) per region — the stock Vercel preset value
 * (5s) aborts that boundary long before it resolves ("The render was aborted by
 * the server without a reason"). Keep this under the route maxDuration (60s).
 */
export const streamTimeout = 52_000

const vercelDeploymentId = process.env.VERCEL_DEPLOYMENT_ID
const vercelSkewProtectionEnabled = process.env.VERCEL_SKEW_PROTECTION_ENABLED === '1'

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  _loadContext: unknown,
  options?: { nonce?: string },
) {
  return new Promise<Response>((resolve, reject) => {
    let shellRendered = false
    const userAgent = request.headers.get('user-agent')
    // Bots and SPA-mode renders wait for all content before responding.
    const readyOption =
      (userAgent && isbot(userAgent)) || routerContext.isSpaMode ? 'onAllReady' : 'onShellReady'

    const { pipe, abort } = renderToPipeableStream(
      createElement(ServerRouter, { context: routerContext, url: request.url, nonce: options?.nonce }),
      {
        ...options,
        [readyOption]() {
          shellRendered = true
          const body = new PassThrough()
          const stream = createReadableStreamFromReadable(body)
          responseHeaders.set('Content-Type', 'text/html')
          if (vercelSkewProtectionEnabled && vercelDeploymentId) {
            responseHeaders.append('Set-Cookie', `__vdpl=${vercelDeploymentId}; HttpOnly`)
          }
          resolve(new Response(stream, { headers: responseHeaders, status: responseStatusCode }))
          pipe(body)
        },
        onShellError(error: unknown) {
          reject(error)
        },
        onError(error: unknown) {
          responseStatusCode = 500
          if (shellRendered) console.error(error)
        },
      },
    )

    // Give the stream time to flush rejected boundaries after the timeout.
    setTimeout(abort, streamTimeout + 1000)
  })
}
