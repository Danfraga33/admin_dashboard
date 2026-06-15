import type { Portfolio } from './atlas-data'
import type { ValuePoint } from './sharesight.server'
import { createSupabaseAdminClient } from './supabase.admin'

const MODEL = 'gemini-2.5-flash'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`
const TTL_MS = 7 * 24 * 60 * 60 * 1000 // weekly
const CALL_TIMEOUT_MS = 20_000

export interface ScoutDeps {
  now: () => Date
  fetch: typeof fetch
  apiKey: string | undefined
}

/** Persistent cache: Scout's note lives on the per-user sharesight_portfolio row. */
export interface ScoutStore {
  read(): Promise<{ note: string; generatedAt: string } | null>
  write(note: string, generatedAt: string): Promise<void>
}

export interface ScoutFacts {
  total: number
  weeklyAbs: number
  weeklyPct: number
  ytdPct: number
  topMover: { sym: string; pct: number } | null
  bottomMover: { sym: string; pct: number } | null
  topTheme: { label: string; pct: number } | null
  cashPct: number
}

/** Derive the numbers Scout reasons over. Pure — all inputs explicit. */
export function computeScoutFacts(portfolio: Portfolio, valueSeries: ValuePoint[]): ScoutFacts {
  const total = portfolio.total
  const cashPct = total > 0 ? (portfolio.cash / total) * 100 : 0

  // Week-over-week from the value history: latest vs the last point >= 7 days back.
  let weeklyAbs = 0
  let weeklyPct = 0
  if (valueSeries.length >= 2) {
    const latest = valueSeries[valueSeries.length - 1]
    const cutoff = Date.parse(latest.date) - 7 * 24 * 60 * 60 * 1000
    const baseline =
      [...valueSeries].reverse().find((p) => Date.parse(p.date) <= cutoff) ?? valueSeries[0]
    weeklyAbs = latest.total - baseline.total
    weeklyPct = baseline.total > 0 ? (weeklyAbs / baseline.total) * 100 : 0
  }

  const byPct = [...portfolio.holdings].sort((a, b) => b.pct - a.pct)
  const topMover = byPct.length ? { sym: byPct[0].sym, pct: byPct[0].pct } : null
  const bottomMover = byPct.length ? { sym: byPct[byPct.length - 1].sym, pct: byPct[byPct.length - 1].pct } : null

  const theme = portfolio.allocation.find((a) => a.label !== 'Cash') ?? portfolio.allocation[0] ?? null
  const topTheme = theme ? { label: theme.label, pct: theme.pct } : null

  return { total, weeklyAbs, weeklyPct, ytdPct: portfolio.ytdPct, topMover, bottomMover, topTheme, cashPct }
}

function signed(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}`
}
function money(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${n < 0 ? '-' : ''}$${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${n < 0 ? '-' : ''}$${(abs / 1_000).toFixed(1)}K`
  return `${n < 0 ? '-' : ''}$${abs.toFixed(0)}`
}

/** Plain factual line used when the AI is unavailable — page never breaks. */
export function fallbackNote(f: ScoutFacts): string {
  const parts = [`Portfolio at ${money(f.total)}, ${signed(f.ytdPct)}% YTD`]
  if (f.weeklyPct !== 0) parts.push(`${signed(f.weeklyPct)}% on the week`)
  if (f.topTheme) parts.push(`${f.topTheme.label} leads at ${f.topTheme.pct}%`)
  parts.push(`cash at ${f.cashPct.toFixed(0)}%`)
  return parts.join(' · ') + '.'
}

export function buildScoutPrompt(f: ScoutFacts): string {
  const lines = [
    `Total value: ${money(f.total)}`,
    `Week-over-week: ${signed(f.weeklyPct)}% (${money(f.weeklyAbs)})`,
    `Year-to-date: ${signed(f.ytdPct)}%`,
    f.topMover ? `Top mover: ${f.topMover.sym} ${signed(f.topMover.pct)}% (total return)` : null,
    f.bottomMover ? `Weakest: ${f.bottomMover.sym} ${signed(f.bottomMover.pct)}%` : null,
    f.topTheme ? `Largest theme: ${f.topTheme.label} at ${f.topTheme.pct}% of the book` : null,
    `Cash: ${f.cashPct.toFixed(0)}% of portfolio`,
  ].filter(Boolean)

  return `You are Scout, a sharp portfolio analyst writing this week's read on the owner's investment book (figures in AUD).

This week's numbers:
${lines.join('\n')}

Write a 2-3 sentence weekly update. Lead with the week's move and YTD, then one sentence of interpretation about what's driving the book (themes, movers, cash posture). Be concise and concrete, use the real numbers. No financial advice, no recommendations to buy/sell, no markdown, no headings — plain prose only.`
}

async function callGemini(deps: ScoutDeps, prompt: string): Promise<string> {
  const res = await deps.fetch(ENDPOINT, {
    method: 'POST',
    signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': deps.apiKey! },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 256,
        temperature: 0.6,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  })
  if (!res.ok) throw new Error(`gemini ${res.status}`)
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim() ?? ''
  if (!text) throw new Error('gemini returned empty text')
  return text
}

/** Dedupe concurrent regenerations per store within one process. */
const inflight = new WeakMap<ScoutStore, Promise<string>>()

async function regenerate(deps: ScoutDeps, store: ScoutStore, facts: ScoutFacts): Promise<string> {
  const existing = inflight.get(store)
  if (existing) return existing
  const p = (async () => {
    const note = await callGemini(deps, buildScoutPrompt(facts))
    await store.write(note, deps.now().toISOString())
    return note
  })().finally(() => inflight.delete(store))
  inflight.set(store, p)
  return p
}

/**
 * Scout's weekly note: serve the cached note, regenerate when older than a week.
 * Fresh → cached. Stale-with-cache → serve stale now, refresh in background.
 * First-ever → generate synchronously. No key / error → computed fallback line.
 * Never throws.
 */
export async function getScoutNote(deps: ScoutDeps, store: ScoutStore, facts: ScoutFacts): Promise<string> {
  const row = await store.read().catch(() => null)
  const fresh = row?.note && deps.now().getTime() - Date.parse(row.generatedAt) < TTL_MS
  if (fresh) return row!.note

  if (!deps.apiKey) return row?.note ?? fallbackNote(facts)

  // Stale but present: serve immediately, refresh in the background.
  if (row?.note) {
    void regenerate(deps, store, facts).catch(() => {})
    return row.note
  }

  // No note yet: generate once, fall back on failure.
  try {
    return await regenerate(deps, store, facts)
  } catch {
    return fallbackNote(facts)
  }
}

function supabaseStore(userId: string): ScoutStore {
  const admin = createSupabaseAdminClient()
  return {
    async read() {
      const { data } = await admin
        .from('sharesight_portfolio')
        .select('scout_note, scout_note_at')
        .eq('user_id', userId)
        .maybeSingle()
      if (!data?.scout_note || !data.scout_note_at) return null
      return { note: data.scout_note, generatedAt: data.scout_note_at }
    },
    async write(note, generatedAt) {
      await admin
        .from('sharesight_portfolio')
        .update({ scout_note: note, scout_note_at: generatedAt })
        .eq('user_id', userId)
    },
  }
}

/** Production wrapper: builds facts, uses real clock/fetch/env key + Supabase store. */
export function getScoutNoteLive(userId: string, portfolio: Portfolio, valueSeries: ValuePoint[]): Promise<string> {
  const facts = computeScoutFacts(portfolio, valueSeries)
  const deps: ScoutDeps = { now: () => new Date(), fetch, apiKey: process.env.GEMINI_API_KEY }
  return getScoutNote(deps, supabaseStore(userId), facts).catch(() => fallbackNote(facts))
}
