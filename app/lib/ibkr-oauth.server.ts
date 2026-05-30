/**
 * IBKR Client Portal Web API — OAuth 1.0a signer.
 *
 * Ported from the reference Python implementation (Voyz/ibind, oauth1a.py).
 * Handles the live-session-token (LST) handshake and request signing.
 *
 * Flow:
 *   1. getLiveSessionToken() — RSA-SHA256 signed POST /oauth/live_session_token
 *      with a Diffie-Hellman challenge. Returns a 24h LST.
 *   2. signedHeaders() — HMAC-SHA256 signed (key = LST) headers for every
 *      protected resource call.
 *
 * node:crypto only. No third-party crypto deps.
 */
import {
  constants,
  createHmac,
  createSign,
  privateDecrypt,
  randomBytes,
} from 'node:crypto'

const BASE_URL = 'https://api.ibkr.com/v1/api'
const LST_ENDPOINT = '/oauth/live_session_token'

export interface IbkrOAuthConfig {
  consumerKey: string
  accessToken: string
  accessTokenSecret: string
  /** PEM private key matching the public ENCRYPTION key uploaded to the portal. */
  encryptionKeyPem: string
  /** PEM private key matching the public SIGNATURE key uploaded to the portal. */
  signatureKeyPem: string
  /** Diffie-Hellman prime (hex) from the portal. */
  dhPrime: string
  /** DH generator — IBKR uses 2. */
  dhGenerator?: number
  /** 'limited_poa' for live, 'test_realm' for the TESTCONS consumer key. */
  realm?: string
}

export interface LiveSessionToken {
  /** base64 LST, used as the HMAC-SHA256 key for protected calls. */
  token: string
  /** epoch millis when the LST expires (~24h out). */
  expiresMs: number
}

// ---------- OAuth param encoding ----------

/** OAuth percent-encoding (RFC 3986 — unreserved chars only). Matches Python's quote_plus for these strings. */
function pctEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase(),
  )
}

function nonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const b = randomBytes(16)
  let out = ''
  for (let i = 0; i < 16; i++) out += chars[b[i] % chars.length]
  return out
}

function timestamp(): string {
  // Deterministic source forbidden in some sandboxes, but this is server runtime — Date is fine here.
  return Math.floor(Date.now() / 1000).toString()
}

/**
 * OAuth 1.0a signature base string:
 *   METHOD & pctEncode(url) & pctEncode(sorted "k=v" joined by "&")
 * For the LST request, `prepend` (decrypted access-token-secret hex) is prefixed.
 */
function baseString(
  method: string,
  url: string,
  params: Record<string, string>,
  prepend?: string,
): string {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&')
  const base = [method, pctEncode(url), pctEncode(sorted)].join('&')
  return prepend ? `${prepend}${base}` : base
}

/** `OAuth realm="...", k="v", ...` with keys sorted. */
function authHeader(params: Record<string, string>, realm: string): string {
  const pairs = Object.keys(params)
    .sort()
    .map((k) => `${k}="${params[k]}"`)
    .join(', ')
  return `OAuth realm="${realm}", ${pairs}`
}

// ---------- Diffie-Hellman ----------

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n
  base %= mod
  while (exp > 0n) {
    if (exp & 1n) result = (result * base) % mod
    exp >>= 1n
    base = (base * base) % mod
  }
  return result
}

/** Random positive 256-bit value as hex (no 0x). */
function dhRandomHex(): string {
  return BigInt('0x' + randomBytes(32).toString('hex')).toString(16)
}

/** g^random mod prime, hex (no 0x). Sent as the DH challenge. */
function dhChallenge(primeHex: string, randomHex: string, generator: number): string {
  const challenge = modPow(BigInt(generator), BigInt('0x' + randomHex), BigInt('0x' + primeHex))
  return challenge.toString(16)
}

/**
 * Port of ibind's to_byte_array: big-endian bytes of a non-negative bigint,
 * with a leading 0x00 prepended when the bit-length is a multiple of 8
 * (preserves the sign bit, exactly as the Python/Java reference does).
 * Getting this wrong is the #1 cause of LST signature mismatches.
 */
function toByteArray(x: bigint): Buffer {
  let hex = x.toString(16)
  if (hex.length % 2 !== 0) hex = '0' + hex
  const bitLen = x.toString(2).length
  const bytes = Buffer.from(hex, 'hex')
  if (bitLen % 8 === 0) return Buffer.concat([Buffer.from([0]), bytes])
  return bytes
}

/**
 * Decrypt the access-token-secret with the private ENCRYPTION key (RSA PKCS1v1.5),
 * return as hex. This is the OAuth "prepend" used both to sign the LST request and
 * as the HMAC message when computing the LST.
 */
function lstPrepend(accessTokenSecret: string, encryptionKeyPem: string): string {
  const decrypted = privateDecrypt(
    { key: encryptionKeyPem, padding: constants.RSA_PKCS1_PADDING },
    Buffer.from(accessTokenSecret, 'base64'),
  )
  return decrypted.toString('hex')
}

/** RSA-SHA256 signature of the base string, base64 then percent-encoded. (LST request only.) */
function rsaSha256(baseStr: string, signatureKeyPem: string): string {
  const signer = createSign('RSA-SHA256')
  signer.update(baseStr, 'utf8')
  return pctEncode(signer.sign(signatureKeyPem, 'base64'))
}

/** HMAC-SHA256 keyed by the LST bytes, base64 then percent-encoded. (Protected resources.) */
function hmacSha256(baseStr: string, lstBase64: string): string {
  const mac = createHmac('sha256', Buffer.from(lstBase64, 'base64'))
  mac.update(baseStr, 'utf8')
  return pctEncode(mac.digest('base64'))
}

/**
 * Compute the LST from the DH exchange:
 *   K = dhResponse^dhRandom mod prime
 *   LST = base64( HMAC-SHA1( key = toByteArray(K), msg = prependBytes ) )
 */
function computeLst(
  primeHex: string,
  randomHex: string,
  dhResponseHex: string,
  prependHex: string,
): string {
  const shared = modPow(
    BigInt('0x' + dhResponseHex),
    BigInt('0x' + randomHex),
    BigInt('0x' + primeHex),
  )
  const mac = createHmac('sha1', toByteArray(shared))
  mac.update(Buffer.from(prependHex, 'hex'))
  return mac.digest('base64')
}

/** Verify the computed LST against IBKR's returned signature. */
function validateLst(lstBase64: string, lstSignature: string, consumerKey: string): boolean {
  const mac = createHmac('sha1', Buffer.from(lstBase64, 'base64'))
  mac.update(Buffer.from(consumerKey, 'utf8'))
  return mac.digest('hex') === lstSignature
}

// ---------- Public API ----------

export const ibkrBaseUrl = BASE_URL

/**
 * Run the OAuth 1.0a handshake and return a 24h live session token.
 * Throws if IBKR rejects the request or the LST fails validation.
 */
export async function getLiveSessionToken(
  cfg: IbkrOAuthConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<LiveSessionToken> {
  const generator = cfg.dhGenerator ?? 2
  const realm = cfg.realm ?? 'limited_poa'

  const dhRandom = dhRandomHex()
  const challenge = dhChallenge(cfg.dhPrime, dhRandom, generator)
  const prepend = lstPrepend(cfg.accessTokenSecret, cfg.encryptionKeyPem)

  const url = `${BASE_URL}${LST_ENDPOINT}`
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: cfg.consumerKey,
    oauth_nonce: nonce(),
    oauth_signature_method: 'RSA-SHA256',
    oauth_timestamp: timestamp(),
    oauth_token: cfg.accessToken,
    diffie_hellman_challenge: challenge,
  }

  const base = baseString('POST', url, oauthParams, prepend)
  oauthParams.oauth_signature = rsaSha256(base, cfg.signatureKeyPem)

  const res = await fetchImpl(url, {
    method: 'POST',
    headers: {
      Authorization: authHeader(oauthParams, realm),
      Accept: '*/*',
      'User-Agent': 'atlas-dashboard',
      Host: 'api.ibkr.com',
    },
  })
  if (!res.ok) {
    throw new Error(`IBKR LST request failed: ${res.status} ${await res.text()}`)
  }
  const data = (await res.json()) as {
    diffie_hellman_response: string
    live_session_token_signature: string
    live_session_token_expiration: number
  }

  const lst = computeLst(cfg.dhPrime, dhRandom, data.diffie_hellman_response, prepend)
  if (!validateLst(lst, data.live_session_token_signature, cfg.consumerKey)) {
    throw new Error('IBKR LST validation failed — computed token does not match signature')
  }
  return { token: lst, expiresMs: data.live_session_token_expiration }
}

/**
 * Build signed headers for a protected-resource request.
 * `params` are query params that must be folded into the signature base string.
 */
export function signedHeaders(
  cfg: IbkrOAuthConfig,
  lst: string,
  method: string,
  url: string,
  params: Record<string, string> = {},
): Record<string, string> {
  const realm = cfg.realm ?? 'limited_poa'
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: cfg.consumerKey,
    oauth_nonce: nonce(),
    oauth_signature_method: 'HMAC-SHA256',
    oauth_timestamp: timestamp(),
    oauth_token: cfg.accessToken,
    ...params,
  }
  const base = baseString(method, url, oauthParams, undefined)
  oauthParams.oauth_signature = hmacSha256(base, lst)

  // Query params are NOT part of the Authorization header — strip them back out.
  for (const k of Object.keys(params)) delete oauthParams[k]

  return {
    Authorization: authHeader(oauthParams, realm),
    Accept: '*/*',
    'User-Agent': 'atlas-dashboard',
    Host: 'api.ibkr.com',
  }
}
