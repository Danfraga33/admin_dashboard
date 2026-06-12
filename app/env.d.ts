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
      SHARESIGHT_CLIENT_ID: string
      SHARESIGHT_CLIENT_SECRET: string
      SHARESIGHT_API_BASE: string
      SHARESIGHT_OAUTH_BASE: string
      /** Set on Vercel; sent as Bearer token on cron requests. */
      CRON_SECRET: string
    }
  }
}
export {}
