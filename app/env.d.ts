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
    }
  }
}
export {}
