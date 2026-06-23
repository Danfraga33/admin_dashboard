export type Platform =
  | "reddit"
  | "youtube"
  | "hackernews"
  | "stackexchange"
  | "github"
  | "shopifycommunity";

/** A raw item pulled from a connector, normalized to a common shape. */
export interface NormalizedMention {
  platform: Platform;
  externalId: string;
  author: string | null;
  title: string | null;
  body: string;
  url: string;
  score: number;
  numComments: number;
  createdUtc: string; // ISO timestamp
}

export interface SourceRow {
  id: number;
  type: Platform;
  query: string;
  label: string;
  enabled: boolean;
  created_at: string;
}

export interface MentionRow {
  id: number;
  source_id: number | null;
  platform: Platform;
  external_id: string;
  author: string | null;
  title: string | null;
  body: string;
  url: string;
  score: number;
  num_comments: number;
  created_utc: string;
  fetched_at: string;
  is_complaint: boolean;
  intensity: number;
  topic: string;
  keywords: string;
}

export interface FetchRunRow {
  id: number;
  source_id: number | null;
  source_label: string | null;
  started_at: string;
  finished_at: string | null;
  mentions_scanned: number;
  mentions_added: number;
  complaints_added: number;
  status: "running" | "ok" | "error";
  error: string | null;
}

export interface AlertRow {
  id: number;
  topic: string;
  kind: string;
  message: string;
  baseline: number;
  current: number;
  created_at: string;
  acknowledged: boolean;
}

/** Aggregated pain theme, derived from complaint mentions grouped by topic. */
export interface ThemeAggregate {
  topic: string;
  label: string;
  mentions: number;
  complaints: number;
  avgIntensity: number;
  score: number;
  last7: number;
  prev7: number;
  lastSeen: string | null;
}
