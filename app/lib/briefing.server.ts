import type { Briefing, Portfolio, Signal } from './atlas-data'
import { PROJECTS } from './atlas-data'
import type { Json } from './database.types'
import { readPortfolio } from './sharesight.server'
import { createSupabaseAdminClient } from './supabase.admin'

const TZ = 'Australia/Sydney'
/** Briefing freezes for 24h: re-open within the window shows the same text. */
const TTL_MS = 24 * 60 * 60 * 1000

function signed(p: number): string {
  return `${p >= 0 ? '+' : ''}${p}%`
}

/** The summary + signals, the persisted part of a Briefing (date/greeting are derived per render). */
export interface BriefingCore {
  summary: string
  signals: Signal[]
}

export interface BriefingDeps {
  now: () => Date
}

/** Persistent cache: the briefing lives on the per-user sharesight_portfolio row. */
export interface BriefingStore {
  read(): Promise<{ core: BriefingCore; generatedAt: string } | null>
  write(core: BriefingCore, generatedAt: string): Promise<void>
}

/**
 * Build the briefing text + signals from live portfolio data and the (hardcoded)
 * project list. Pure — all inputs explicit, no I/O or clock reads beyond `now`.
 */
export function buildBriefing(portfolio: Portfolio, now: Date): BriefingCore {
  const top = portfolio.holdings
    .filter((h) => h.sym !== 'CASH')
    .sort((a, b) => b.alloc - a.alloc)[0]
  const ytd = `YTD ${signed(portfolio.ytdPct)}`

  const active = PROJECTS.items.filter((p) => p.status !== 'Paused')
  const ranked = [...active].sort((a, b) => b.progress - a.progress)
  const lead = ranked[0]

  const cashPct = portfolio.total > 0 ? Math.round((portfolio.cash / portfolio.total) * 100) : 0
  const dir = portfolio.dayPct >= 0 ? 'up' : 'down'

  const summary = [
    `Portfolio ${dir} ${Math.abs(portfolio.dayPct)}% today, ${ytd.toLowerCase()}`,
    top
      ? ` — ${top.sym} leads at ${top.alloc}%, cash ${cashPct}% dry powder.`
      : `, cash ${cashPct}% dry powder.`,
    ` ${lead.name} tops ${active.length} builds at ${lead.progress}%.`,
    ` Highest-leverage move: ship ${lead.name}'s last ${100 - lead.progress}%.`,
  ].join('')

  const signals: Signal[] = [
    ...(top
      ? [
          {
            agent: 'scout',
            tone: (top.pct > 0 ? 'up' : top.pct < 0 ? 'down' : 'flat') as Signal['tone'],
            text: `${top.sym} ${signed(top.pct)} today — ${top.alloc}% of the book`,
          },
        ]
      : []),
    { agent: 'scout', tone: 'up', text: `${lead.name} at ${lead.progress}% — ${lead.activity}` },
    { agent: 'scout', tone: 'flat', text: `Cash at ${cashPct}% of portfolio — dry powder for acquisitions` },
    { agent: 'scout', tone: 'flat', text: 'Fraga Ventures in construction — ABN→Pty structure playbook drafted' },
  ]

  return { summary, signals }
}

/** Date/greeting line, derived fresh on every render — not part of the frozen cache. */
function decorate(core: BriefingCore, now: Date): Briefing {
  const hour = Number(
    new Intl.DateTimeFormat('en-AU', { hour: 'numeric', hour12: false, timeZone: TZ }).format(now)
  )
  const part = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
  return {
    date: new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: TZ }).format(now),
    greeting: `Good ${part}, Daniel.`,
    synthLabel: 'Synthesized from Sharesight + active builds',
    summary: core.summary,
    signals: core.signals,
  }
}

/**
 * Serve the cached briefing, regenerate when older than 24h.
 * Fresh (<24h) → cached, no work. Stale/missing → caller has already supplied
 * fresh portfolio data; rebuild, persist, return. Never throws on the cache path.
 */
export async function getBriefing(
  deps: BriefingDeps,
  store: BriefingStore,
  rebuild: () => Promise<BriefingCore>
): Promise<Briefing> {
  const row = await store.read().catch(() => null)
  const now = deps.now()
  const fresh = row && now.getTime() - Date.parse(row.generatedAt) < TTL_MS
  if (fresh) return decorate(row!.core, now)

  const core = await rebuild()
  const generatedAt = now.toISOString()
  await store.write(core, generatedAt).catch(() => {})
  return decorate(core, now)
}

function supabaseStore(userId: string): BriefingStore {
  const admin = createSupabaseAdminClient()
  return {
    async read() {
      const { data } = await admin
        .from('sharesight_portfolio')
        .select('briefing_text, briefing_signals, briefing_at')
        .eq('user_id', userId)
        .maybeSingle()
      if (!data?.briefing_text || !data.briefing_at) return null
      return {
        core: { summary: data.briefing_text, signals: (data.briefing_signals ?? []) as unknown as Signal[] },
        generatedAt: data.briefing_at,
      }
    },
    async write(core, generatedAt) {
      await admin
        .from('sharesight_portfolio')
        .update({ briefing_text: core.summary, briefing_signals: core.signals as unknown as Json, briefing_at: generatedAt })
        .eq('user_id', userId)
    },
  }
}

/**
 * Production wrapper. Returns the briefing for the home dashboard.
 * On a cache miss / stale (>24h), synchronously syncs Sharesight (block-on-load,
 * since serverless kills background work) before rebuilding so the numbers are fresh.
 */
export async function getBriefingLive(userId: string): Promise<Briefing> {
  const admin = createSupabaseAdminClient()
  const deps: BriefingDeps = { now: () => new Date() }
  return getBriefing(deps, supabaseStore(userId), async () => {
    const { portfolio } = await readPortfolio(admin, userId, { maxAgeMs: TTL_MS })
    return buildBriefing(portfolio, deps.now())
  })
}
