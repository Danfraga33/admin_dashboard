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

      // IBKR Client Portal Web API — OAuth 1.0a (self-service portal)
      IBKR_CONSUMER_KEY: string
      IBKR_ACCESS_TOKEN: string
      IBKR_ACCESS_TOKEN_SECRET: string
      /** Private ENCRYPTION key (PEM or base64 PEM) — matches public_encryption.pem uploaded to portal. */
      IBKR_ENCRYPTION_KEY: string
      /** Private SIGNATURE key (PEM or base64 PEM) — matches public_signature.pem uploaded to portal. */
      IBKR_SIGNATURE_KEY: string
      /** Diffie-Hellman prime (hex) from the portal's dhparam. */
      IBKR_DH_PRIME: string
      IBKR_DH_GENERATOR?: string
      IBKR_ACCOUNT_ID?: string
      /** 'limited_poa' (live) or 'test_realm' (TESTCONS sandbox key). */
      IBKR_REALM?: string
      /** Sync a single user only; otherwise the runner syncs all auth users. */
      IBKR_SYNC_USER_ID?: string
    }
  }
}
export {}
