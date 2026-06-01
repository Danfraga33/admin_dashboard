import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

/**
 * Service-role Supabase client. Server-only — bypasses RLS.
 * Used by the Sharesight sync job and OAuth token cache (service-role-only tables).
 * NEVER import into client code.
 */
export function createSupabaseAdminClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
