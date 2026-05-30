declare global {
  interface Window {
    ENV: {
      SUPABASE_URL: string
      SUPABASE_ANON_KEY: string
    }
  }

  namespace NodeJS {
    interface ProcessEnv {
      SUPABASE_URL: string
      SUPABASE_ANON_KEY: string
      /** Service-role key — server-only, used by the sync job. Never expose to the client. */
      SUPABASE_SERVICE_ROLE_KEY: string

      // IBKR Client Portal Web API — individual self-access via the Gateway.
      /** Gateway base URL, e.g. https://localhost:5000 (default). The sync job calls this. */
      IBKR_GATEWAY_URL?: string
      /** Account id (e.g. U8770342). If unset, the first account from the gateway is used. */
      IBKR_ACCOUNT_ID?: string
      /** Set to '1' in dev to make the loader fetch live from the gateway (else reads Supabase). */
      IBKR_LIVE_IN_DEV?: string
      /** Sync a single user only; otherwise the runner syncs all auth users. */
      IBKR_SYNC_USER_ID?: string
    }
  }
}
export {}
