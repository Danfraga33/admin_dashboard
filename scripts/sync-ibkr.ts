/**
 * IBKR sync runner — invoked by cron (GitHub Actions / host scheduler).
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... IBKR_*=... npx tsx scripts/sync-ibkr.ts
 *
 * Syncs every user that has an auth account. Single-tenant today, but kept
 * user-scoped so it matches the RLS tables. Run on a schedule during market
 * hours (e.g. every 10 min). Exits non-zero if any user's sync failed so the
 * cron surfaces the failure.
 */
import { createClient } from '@supabase/supabase-js'
import { syncIbkr } from '../app/lib/ibkr.server'

async function main() {
  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  // Optional single-user override; otherwise sync all auth users.
  const only = process.env.IBKR_SYNC_USER_ID
  let userIds: string[]
  if (only) {
    userIds = [only]
  } else {
    const { data, error } = await admin.auth.admin.listUsers()
    if (error) {
      console.error('Failed to list users:', error.message)
      process.exit(1)
    }
    userIds = data.users.map((u) => u.id)
  }

  let failures = 0
  for (const userId of userIds) {
    const res = await syncIbkr(userId)
    if (res.ok) {
      console.log(`[ibkr] ${userId} synced`)
    } else {
      failures++
      console.error(`[ibkr] ${userId} FAILED: ${res.error}`)
    }
  }

  console.log(`[ibkr] done — ${userIds.length - failures}/${userIds.length} ok`)
  process.exit(failures ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
