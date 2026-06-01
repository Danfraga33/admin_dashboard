import { describe, it, expect, vi } from 'vitest'
import { getToken } from './sharesight.server'

const TOKEN_RESPONSE = { access_token: 'fresh-token', expires_in: 1800 }

function makeDeps(stored: { access_token: string; expires_at: string } | null, nowMs: number) {
  return {
    now: () => new Date(nowMs),
    fetch: vi.fn(async () => new Response(JSON.stringify(TOKEN_RESPONSE), { status: 200 })),
    oauthGet: vi.fn(async () => stored),
    oauthSet: vi.fn(async () => {}),
  }
}

describe('getToken', () => {
  it('reuses a cached token before expiry', async () => {
    const now = 1_000_000
    const deps = makeDeps(
      { access_token: 'cached', expires_at: new Date(now + 600_000).toISOString() },
      now
    )
    const token = await getToken(deps)
    expect(token).toBe('cached')
    expect(deps.fetch).not.toHaveBeenCalled()
  })

  it('fetches a new token when cache missing', async () => {
    const deps = makeDeps(null, 1_000_000)
    const token = await getToken(deps)
    expect(token).toBe('fresh-token')
    expect(deps.fetch).toHaveBeenCalledOnce()
    expect(deps.oauthSet).toHaveBeenCalledOnce()
  })

  it('fetches a new token when cached token expired', async () => {
    const now = 2_000_000
    const deps = makeDeps(
      { access_token: 'old', expires_at: new Date(now - 1000).toISOString() },
      now
    )
    const token = await getToken(deps)
    expect(token).toBe('fresh-token')
    expect(deps.fetch).toHaveBeenCalledOnce()
  })
})
