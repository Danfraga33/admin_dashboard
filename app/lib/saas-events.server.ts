import { REGIONS_FILTER, DOMAINS_FILTER, type Region, type Domain, type SaasEvent, type SaasEventsResult } from './saas-events'
import { createSupabaseAdminClient } from './supabase.admin'
import type { Json } from './database.types'

export { REGIONS_FILTER, DOMAINS_FILTER }
export type { Region, Domain, SaasEvent, SaasEventsResult }

function classifyDomain(domain: unknown): Domain {
  const d = typeof domain === 'string' ? domain.trim().toLowerCase() : ''
  if (d.includes('ecom') || d.includes('commerce')) return 'Ecommerce'
  if (d.includes('ai') || d.includes('coding') || d.includes('agent') || d.includes('llm')) return 'AI Coding'
  return 'SaaS'
}

export interface EventsDeps {
  now: () => Date
  fetch: typeof fetch
  apiKey: string | undefined
}

/** Persistent cache row. DB-backed in production so the cache survives
 *  serverless cold starts and dev restarts — each of which used to refire
 *  4 grounded Gemini calls and exhaust the daily search-grounding quota. */
export interface EventsStore {
  read(): Promise<{ events: SaasEvent[]; fetchedAt: string } | null>
  write(events: SaasEvent[], fetchedAt: string): Promise<void>
}

const CACHE_TTL_MS = 72 * 60 * 60 * 1000
const MODEL = 'gemini-2.5-flash'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

/** Per-region fetch ceiling. Grounded search is slow; abort a hung call rather than
 *  letting it run into the serverless function wall (which severs the stream). */
const REGION_TIMEOUT_MS = 45_000

const THEMES = [
  // SaaS
  'SaaS conference',
  'SaaS growth and marketing summit',
  'product management conference',
  'SaaS founder event',
  'B2B SaaS expo',
  'SaaS webinar series',
  'developer tools conference',
  // Ecommerce
  'ecommerce conference',
  'DTC / direct-to-consumer or retail summit',
  'Shopify or commerce-platform event',
  'online marketplace / seller conference',
  // AI Coding
  'AI coding or AI dev-tools conference',
  'LLM / AI engineering summit',
  'AI agent builder event',
  'vibe coding event',
  'Claude / Anthropic coding event',
]

/** One focused fetch per region → far better coverage than a single multi-region call. */
const SEARCH_REGIONS: { label: string; region: Region }[] = [
  { label: 'the United States', region: 'USA' },
  { label: 'Canada', region: 'Canada' },
  { label: 'Australia', region: 'Australia' },
  { label: 'Europe (UK, Germany, France, Spain, Netherlands, Nordics, etc.)', region: 'Europe' },
]

/** Dedupe concurrent refreshes within one process (page loader + resource route). */
let inflightRefresh: Promise<SaasEvent[]> | null = null

/** Reset in-flight refresh dedupe. Test-only. */
export function __resetCache() {
  inflightRefresh = null
}

function buildPrompt(now: Date, regionLabel: string, regionValue: Region): string {
  const start = now.toISOString().slice(0, 10)
  const end = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString().slice(0, 10)
  const angles = THEMES.map((t) => `- ${t}`).join('\n')
  return `You are building a calendar of real learning events for builders in three domains — SaaS, Ecommerce, and AI Coding — in ${regionLabel}, happening between ${start} and ${end}.

Search the web thoroughly for each of these angles, focused on ${regionLabel}:
${angles}

Find as many real, distinct events as you can — aim for 25-50 across all the angles above. Do not stop at one or two per angle. Output a single JSON array only — no prose, no markdown fences, no trailing commentary. Each object has exactly these keys:
- name: event name
- date: start date as ISO "YYYY-MM-DD"
- location: city + country, or "Online"
- region: "${regionValue}"
- format: one of "in-person", "virtual", "hybrid"
- domain: one of exactly "SaaS", "Ecommerce", "AI Coding" — which of the three this event belongs to
- category: a short facet within the domain (e.g. SaaS → "Growth"/"Product"/"Founder"; Ecommerce → "DTC"/"Retail"/"Marketplace"; AI Coding → "DevTools"/"Agents"/"LLM")
- url: the official event page URL
- desc: one sentence on what it covers

Rules:
- Only events located in ${regionLabel}.
- Only include events with a real, verifiable official source URL.
- Date must be a real announced date in ISO format. NEVER invent a date.
- If you are unsure an event is real or its date, omit it entirely.
- Only events within ${start} to ${end}.
- Only real industry events for founders, operators, marketers, product, and engineering teams in SaaS, ecommerce, or AI coding.
- EXCLUDE generic academic and research conferences (e.g. anything titled "International Conference on Economy/Management/Marketing/Administrative Sciences", ICEMM, ICEAAS, ICMAMS, or similar paper-submission events).`
}

/** Extract first JSON array from model text, tolerating code fences and surrounding prose. */
export function extractJsonArray(text: string): unknown[] {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const body = fenced ? fenced[1] : text
  const start = body.indexOf('[')
  const end = body.lastIndexOf(']')
  if (start === -1 || end === -1 || end < start) return []
  try {
    const parsed = JSON.parse(body.slice(start, end + 1))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const EUROPE_HINTS = /\b(UK|U\.K\.|England|Scotland|Wales|Ireland|United Kingdom|Germany|France|Spain|Italy|Netherlands|Portugal|Belgium|Sweden|Denmark|Norway|Finland|Poland|Austria|Switzerland|Czech|Greece|Hungary|Romania|Europe|EU|London|Paris|Berlin|Madrid|Amsterdam|Lisbon|Dublin|Barcelona|Munich|Stockholm|Copenhagen|Helsinki|Vienna|Zurich|Prague|Milan|Rome)\b/i

/** Bucket an event into one of the 4 filter regions, or Online / Other. */
function classifyRegion(region: unknown, location: string, format: string): Region {
  const raw = typeof region === 'string' ? region.trim() : ''
  const hay = `${raw} ${location}`
  if (/virtual|online/i.test(format) || /\bonline\b/i.test(hay)) {
    if (!location || /online/i.test(location)) return 'Online'
  }
  if (/\b(USA|U\.S\.|United States|America)\b/i.test(hay)) return 'USA'
  if (/\bCanada\b/i.test(hay)) return 'Canada'
  if (/\bAustralia\b/i.test(hay)) return 'Australia'
  if (EUROPE_HINTS.test(hay)) return 'Europe'
  if (/^online$/i.test(raw)) return 'Online'
  return 'Other'
}

function stableId(url: string, date: string): string {
  let h = 5381
  const s = `${url}|${date}`
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

/** Validate raw model objects into SaasEvents within the 12-month window. */
export function validateEvents(raw: unknown[], now: Date): SaasEvent[] {
  const startMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const endMs = Date.UTC(now.getUTCFullYear() + 1, now.getUTCMonth(), now.getUTCDate())
  const seen = new Set<string>()
  const out: SaasEvent[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const url = typeof o.url === 'string' ? o.url.trim() : ''
    const date = typeof o.date === 'string' ? o.date.trim() : ''
    const name = typeof o.name === 'string' ? o.name.trim() : ''
    if (!url || !/^https?:\/\//.test(url)) continue
    if (!ISO_DATE.test(date)) continue
    if (!name) continue
    const t = Date.parse(date)
    if (Number.isNaN(t) || t < startMs || t > endMs) continue
    const id = stableId(url, date)
    if (seen.has(id)) continue
    seen.add(id)
    const location = typeof o.location === 'string' ? o.location : ''
    const format = typeof o.format === 'string' ? o.format : ''
    out.push({
      id,
      name,
      date,
      location,
      region: classifyRegion(o.region, location, format),
      domain: classifyDomain(o.domain),
      format,
      url,
      category: typeof o.category === 'string' && o.category ? o.category : 'General',
      desc: typeof o.desc === 'string' ? o.desc : '',
    })
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

async function callGeminiForRegion(deps: EventsDeps, label: string, region: Region): Promise<unknown[]> {
  const res = await deps.fetch(ENDPOINT, {
    method: 'POST',
    signal: AbortSignal.timeout(REGION_TIMEOUT_MS),
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': deps.apiKey! },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(deps.now(), label, region) }] }],
      tools: [{ google_search: {} }],
      generationConfig: {
        maxOutputTokens: 16384,
        temperature: 0.3,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  })
  if (!res.ok) throw new Error(`gemini ${res.status} (${region})`)
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[]
  }
  const candidate = json.candidates?.[0]
  if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
    console.warn(`getSaasEvents: gemini finishReason=${candidate.finishReason} for ${region} (response may be truncated)`)
  }
  const text = candidate?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
  return extractJsonArray(text)
}

/** Fetch every region in parallel, merge raw objects, then validate + dedup once. */
async function fetchAllRegions(deps: EventsDeps): Promise<SaasEvent[]> {
  const results = await Promise.allSettled(
    SEARCH_REGIONS.map((r) => callGeminiForRegion(deps, r.label, r.region)),
  )
  const raw: unknown[] = []
  let anySuccess = false
  for (const r of results) {
    if (r.status === 'fulfilled') {
      anySuccess = true
      raw.push(...r.value)
    } else {
      console.error('getSaasEvents region error:', r.reason)
    }
  }
  if (!anySuccess) throw new Error('all region fetches failed')
  return validateEvents(raw, deps.now())
}

/** Fetch from Gemini and persist; concurrent callers share one in-flight refresh. */
async function refreshIntoStore(deps: EventsDeps, store: EventsStore): Promise<SaasEvent[]> {
  if (inflightRefresh) return inflightRefresh
  inflightRefresh = (async () => {
    const events = await fetchAllRegions(deps)
    await store.write(events, deps.now().toISOString())
    return events
  })().finally(() => {
    inflightRefresh = null
  })
  return inflightRefresh
}

/** Read the cache; refresh from Gemini only when the row is missing or past TTL.
 *  On refresh failure, serve the stale row rather than nothing. */
export async function getSaasEvents(deps: EventsDeps, store: EventsStore): Promise<SaasEventsResult> {
  const row = await store.read().catch((err) => {
    console.error('getSaasEvents store read error:', err)
    return null
  })
  const fresh = row && deps.now().getTime() - Date.parse(row.fetchedAt) < CACHE_TTL_MS
  if (row && fresh) return { events: row.events, fetchedAt: row.fetchedAt, stale: false }

  if (!deps.apiKey) {
    if (row) return { events: row.events, fetchedAt: row.fetchedAt, stale: true }
    return { events: [], fetchedAt: deps.now().toISOString(), stale: true }
  }

  try {
    const events = await refreshIntoStore(deps, store)
    return { events, fetchedAt: deps.now().toISOString(), stale: false }
  } catch (err) {
    console.error('getSaasEvents error:', err)
    if (row) return { events: row.events, fetchedAt: row.fetchedAt, stale: true }
    return { events: [], fetchedAt: deps.now().toISOString(), stale: true }
  }
}

/** Force a refresh regardless of TTL. Cron-only — keeps the cache warm so
 *  page loads never wait on the slow grounded search. */
export async function refreshSaasEvents(deps: EventsDeps, store: EventsStore): Promise<SaasEventsResult> {
  if (!deps.apiKey) throw new Error('GEMINI_API_KEY not set')
  const events = await refreshIntoStore(deps, store)
  return { events, fetchedAt: deps.now().toISOString(), stale: false }
}

function supabaseStore(): EventsStore {
  const admin = createSupabaseAdminClient()
  return {
    async read() {
      const { data, error } = await admin
        .from('saas_events_cache')
        .select('events, fetched_at')
        .eq('id', 1)
        .maybeSingle()
      if (error) throw new Error(`saas_events_cache read: ${error.message}`)
      if (!data) return null
      const events = Array.isArray(data.events) ? (data.events as unknown as SaasEvent[]) : []
      return { events, fetchedAt: data.fetched_at }
    },
    async write(events, fetchedAt) {
      const { error } = await admin
        .from('saas_events_cache')
        .upsert({ id: 1, events: events as unknown as Json, fetched_at: fetchedAt })
      if (error) throw new Error(`saas_events_cache write: ${error.message}`)
    },
  }
}

function liveDeps(): EventsDeps {
  return { now: () => new Date(), fetch, apiKey: process.env.GEMINI_API_KEY }
}

/** Production wrapper using real clock, fetch, env key and the Supabase-backed store.
 *  Never rejects: a thrown promise here severs the React Router stream and surfaces
 *  the opaque "Unexpected Server Error" on the client. Resolve stale instead. */
export function getSaasEventsLive(): Promise<SaasEventsResult> {
  return getSaasEvents(liveDeps(), supabaseStore()).catch((err) => {
    console.error('getSaasEventsLive fatal:', err)
    return { events: [], fetchedAt: new Date().toISOString(), stale: true }
  })
}

/** Cron entry point. Rejects on failure so the cron run reports an error. */
export function refreshSaasEventsLive(): Promise<SaasEventsResult> {
  return refreshSaasEvents(liveDeps(), supabaseStore())
}
