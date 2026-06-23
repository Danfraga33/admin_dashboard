import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { Platform } from "./types";

let _sql: NeonQueryFunction<false, false> | null = null;

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** Lazily create the Neon client. Throws a friendly error if unconfigured. */
export function getSql(): NeonQueryFunction<false, false> {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and add your Neon connection string.",
    );
  }
  if (!_sql) {
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

// Reddit sources seed disabled: Reddit closed self-service API access (Nov 2025
// Responsible Builder Policy). Enable them once a Data API request is approved
// and CLIENT_ID/SECRET are set in .env — the connector slots in with no changes.
const DEFAULT_SOURCES: Array<{
  type: Platform;
  query: string;
  label: string;
  enabled?: boolean;
}> = [
  { type: "reddit", query: "ecommerce", label: "r/ecommerce", enabled: false },
  { type: "reddit", query: "shopify", label: "r/shopify", enabled: false },
  { type: "reddit", query: "FulfillmentByAmazon", label: "r/FulfillmentByAmazon", enabled: false },
  { type: "reddit", query: "dropship", label: "r/dropship", enabled: false },
  { type: "youtube", query: "shopify store problems", label: "YT: shopify store problems" },
  { type: "youtube", query: "amazon fba mistakes", label: "YT: amazon fba mistakes" },
  { type: "hackernews", query: "shopify", label: "HN: shopify" },
  { type: "hackernews", query: "ecommerce", label: "HN: ecommerce" },
  { type: "hackernews", query: "amazon fba", label: "HN: amazon fba" },
  { type: "stackexchange", query: "shopify", label: "SO: shopify" },
  { type: "stackexchange", query: "woocommerce", label: "SO: woocommerce" },
  { type: "github", query: "repo:woocommerce/woocommerce is:issue", label: "GH: woocommerce" },
  { type: "github", query: "repo:medusajs/medusa is:issue", label: "GH: medusa" },
  // Shopify Community (Discourse) — operator-native: merchants discussing real
  // store problems. query = "<category-slug>/<id>".
  { type: "shopifycommunity", query: "payments-shipping-fulfilment/217", label: "SC: Shipping & Fulfilment" },
  { type: "shopifycommunity", query: "shopify-discussion/95", label: "SC: Discussion" },
  { type: "shopifycommunity", query: "shopify-apps/186", label: "SC: Apps & Integrations" },
  { type: "shopifycommunity", query: "accounting-taxes/223", label: "SC: Accounting & Tax" },
];

let schemaReady: Promise<void> | null = null;

/** Idempotent: creates tables + seeds default sources. Runs once per process. */
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = runMigrations().catch((err) => {
      schemaReady = null; // allow retry on next request
      throw err;
    });
  }
  return schemaReady;
}

async function runMigrations(): Promise<void> {
  const sql = getSql();

  await sql`
    CREATE TABLE IF NOT EXISTS sources (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('reddit','youtube','hackernews','stackexchange','github','shopifycommunity')),
      query TEXT NOT NULL,
      label TEXT NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (type, query)
    )`;

  // Widen the type CHECK on databases created before the extra connectors landed.
  // Literal list (not a bind param) — Postgres CHECK expressions can't be parameterized.
  await sql`ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_type_check`;
  await sql`ALTER TABLE sources ADD CONSTRAINT sources_type_check
    CHECK (type IN ('reddit','youtube','hackernews','stackexchange','github','shopifycommunity'))`;

  await sql`
    CREATE TABLE IF NOT EXISTS mentions (
      id BIGSERIAL PRIMARY KEY,
      source_id INTEGER REFERENCES sources(id) ON DELETE CASCADE,
      platform TEXT NOT NULL,
      external_id TEXT NOT NULL,
      author TEXT,
      title TEXT,
      body TEXT NOT NULL,
      url TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      num_comments INTEGER NOT NULL DEFAULT 0,
      created_utc TIMESTAMPTZ NOT NULL,
      fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      is_complaint BOOLEAN NOT NULL DEFAULT false,
      intensity REAL NOT NULL DEFAULT 0,
      topic TEXT NOT NULL DEFAULT 'uncategorized',
      keywords TEXT NOT NULL DEFAULT '',
      UNIQUE (platform, external_id)
    )`;

  await sql`CREATE INDEX IF NOT EXISTS mentions_topic_idx ON mentions(topic)`;
  await sql`CREATE INDEX IF NOT EXISTS mentions_created_idx ON mentions(created_utc)`;
  await sql`CREATE INDEX IF NOT EXISTS mentions_complaint_idx ON mentions(is_complaint)`;

  await sql`
    CREATE TABLE IF NOT EXISTS fetch_runs (
      id BIGSERIAL PRIMARY KEY,
      source_id INTEGER REFERENCES sources(id) ON DELETE SET NULL,
      source_label TEXT,
      started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      finished_at TIMESTAMPTZ,
      mentions_scanned INTEGER NOT NULL DEFAULT 0,
      mentions_added INTEGER NOT NULL DEFAULT 0,
      complaints_added INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'running',
      error TEXT
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS alerts (
      id BIGSERIAL PRIMARY KEY,
      topic TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'spike',
      message TEXT NOT NULL,
      baseline REAL NOT NULL DEFAULT 0,
      current REAL NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      acknowledged BOOLEAN NOT NULL DEFAULT false
    )`;

  // Additive seed: insert any default sources not already present. ON CONFLICT
  // keeps existing rows (and their enabled state) untouched, so new default
  // sources land on the next boot without disturbing user edits. A default the
  // user deletes will reappear on restart — acceptable for a curated seed list.
  for (const s of DEFAULT_SOURCES) {
    await sql`
      INSERT INTO sources (type, query, label, enabled)
      VALUES (${s.type}, ${s.query}, ${s.label}, ${s.enabled ?? true})
      ON CONFLICT (type, query) DO NOTHING`;
  }
}
