/**
 * One-off: fill gaps in sharesight_value_history.
 *
 * The daily sync only appends a point on the days the dashboard is opened, so
 * the series had month-wide holes and the chart looked frozen. This walks back
 * `--days` calendar days at `--step` spacing and upserts every date Sharesight
 * can value. Idempotent — re-running only rewrites the same rows.
 *
 *   npx tsx --env-file=.env.local scripts/backfill-value-history.ts [--days 260] [--step 1]
 */
import { createSupabaseAdminClient } from '../app/lib/supabase.admin'
import { backfillValueHistory } from '../app/lib/sharesight.server'

/** The only app user (owner of all RLS-scoped rows). */
const APP_USER_ID = '58d6a41d-4eaf-479a-855e-d426229c66eb'

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`)
  if (i === -1) return fallback
  const n = Number(process.argv[i + 1])
  return Number.isFinite(n) ? n : fallback
}

async function main() {
  const days = arg('days', 260)
  const stepDays = arg('step', 1)
  const points = Math.ceil(days / stepDays)

  console.log(`Backfilling ${points} points, every ${stepDays}d, back ${days}d...`)
  const admin = createSupabaseAdminClient()
  const written = await backfillValueHistory(admin, APP_USER_ID, { points, stepDays })
  console.log(`Upserted ${written} rows.`)

  const { count } = await admin
    .from('sharesight_value_history')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', APP_USER_ID)
  console.log(`History now holds ${count} rows.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
