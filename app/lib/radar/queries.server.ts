import { ensureSchema, getSql, isDbConfigured } from "./db.server";
import { topicLabel } from "./topics";
import type {
  AlertRow,
  FetchRunRow,
  MentionRow,
  Platform,
  SourceRow,
  ThemeAggregate,
} from "./types";

export interface Overview {
  totalMentions: number;
  totalComplaints: number;
  activeTopics: number;
  openAlerts: number;
  lastRun: string | null;
}

export interface SourceWithStats extends SourceRow {
  mentions: number;
  complaints: number;
}

export interface PlatformStat {
  platform: Platform;
  mentions: number;
  complaints: number;
}

async function ready() {
  await ensureSchema();
  return getSql();
}

export { isDbConfigured };

export async function getOverview(): Promise<Overview> {
  const sql = await ready();
  const rows = (await sql`
    SELECT
      (SELECT count(*)::int FROM mentions) AS total_mentions,
      (SELECT count(*)::int FROM mentions WHERE is_complaint) AS total_complaints,
      (SELECT count(DISTINCT topic)::int FROM mentions
         WHERE is_complaint AND topic <> 'uncategorized') AS active_topics,
      (SELECT count(*)::int FROM alerts WHERE acknowledged = false) AS open_alerts,
      (SELECT max(finished_at) FROM fetch_runs WHERE status = 'ok') AS last_run
  `) as Array<{
    total_mentions: number;
    total_complaints: number;
    active_topics: number;
    open_alerts: number;
    last_run: string | null;
  }>;
  const r = rows[0]!;
  return {
    totalMentions: r.total_mentions,
    totalComplaints: r.total_complaints,
    activeTopics: r.active_topics,
    openAlerts: r.open_alerts,
    lastRun: r.last_run,
  };
}

export async function getThemes(): Promise<ThemeAggregate[]> {
  const sql = await ready();
  const rows = (await sql`
    SELECT topic,
      count(*)::int AS mentions,
      count(*) FILTER (WHERE is_complaint)::int AS complaints,
      coalesce(avg(intensity) FILTER (WHERE is_complaint), 0)::float AS avg_intensity,
      max(created_utc) AS last_seen,
      count(*) FILTER (
        WHERE is_complaint AND created_utc >= now() - interval '7 days'
      )::int AS last7,
      count(*) FILTER (
        WHERE is_complaint AND created_utc < now() - interval '7 days'
          AND created_utc >= now() - interval '14 days'
      )::int AS prev7
    FROM mentions
    GROUP BY topic
    HAVING count(*) FILTER (WHERE is_complaint) > 0
  `) as Array<{
    topic: string;
    mentions: number;
    complaints: number;
    avg_intensity: number;
    last_seen: string | null;
    last7: number;
    prev7: number;
  }>;

  return rows
    .map((r) => ({
      topic: r.topic,
      label: topicLabel(r.topic),
      mentions: r.mentions,
      complaints: r.complaints,
      avgIntensity: r.avg_intensity,
      score: r.complaints * (0.5 + r.avg_intensity),
      last7: r.last7,
      prev7: r.prev7,
      lastSeen: r.last_seen,
    }))
    .sort((a, b) => b.score - a.score);
}

export async function getTheme(topic: string): Promise<{
  theme: ThemeAggregate | null;
  mentions: MentionRow[];
}> {
  const themes = await getThemes();
  const theme = themes.find((t) => t.topic === topic) ?? null;
  const sql = getSql();
  const mentions = (await sql`
    SELECT * FROM mentions
    WHERE topic = ${topic} AND is_complaint = true
    ORDER BY intensity DESC, score DESC, created_utc DESC
    LIMIT 100
  `) as MentionRow[];
  return { theme, mentions };
}

export async function getTopComplaints(limit = 8): Promise<MentionRow[]> {
  const sql = await ready();
  return (await sql`
    SELECT * FROM mentions
    WHERE is_complaint = true
    ORDER BY intensity DESC, score DESC, created_utc DESC
    LIMIT ${limit}
  `) as MentionRow[];
}

export async function getSourcesWithStats(): Promise<SourceWithStats[]> {
  const sql = await ready();
  const rows = (await sql`
    SELECT s.*,
      count(m.id)::int AS mentions,
      count(m.id) FILTER (WHERE m.is_complaint)::int AS complaints
    FROM sources s
    LEFT JOIN mentions m ON m.source_id = s.id
    GROUP BY s.id
    ORDER BY s.type, s.id
  `) as SourceWithStats[];
  return rows;
}

export async function getComplaintsBySource(): Promise<PlatformStat[]> {
  const sql = await ready();
  const rows = (await sql`
    SELECT platform,
      count(*)::int AS mentions,
      count(*) FILTER (WHERE is_complaint)::int AS complaints
    FROM mentions
    GROUP BY platform
    ORDER BY complaints DESC, mentions DESC
  `) as Array<{ platform: Platform; mentions: number; complaints: number }>;
  return rows.map((r) => ({
    platform: r.platform,
    mentions: r.mentions,
    complaints: r.complaints,
  }));
}

export async function getPlatformComplaints(platform: Platform): Promise<{
  stat: PlatformStat | null;
  mentions: MentionRow[];
}> {
  const sql = await ready();
  const statRows = (await sql`
    SELECT platform,
      count(*)::int AS mentions,
      count(*) FILTER (WHERE is_complaint)::int AS complaints
    FROM mentions
    WHERE platform = ${platform}
    GROUP BY platform
  `) as Array<{ platform: Platform; mentions: number; complaints: number }>;
  const mentions = (await sql`
    SELECT * FROM mentions
    WHERE platform = ${platform} AND is_complaint = true
    ORDER BY intensity DESC, score DESC, created_utc DESC
    LIMIT 200
  `) as MentionRow[];
  const row = statRows[0];
  const stat = row
    ? { platform: row.platform, mentions: row.mentions, complaints: row.complaints }
    : null;
  return { stat, mentions };
}

export async function getAlerts(): Promise<AlertRow[]> {
  const sql = await ready();
  return (await sql`
    SELECT * FROM alerts
    ORDER BY acknowledged ASC, created_at DESC
    LIMIT 100
  `) as AlertRow[];
}

export async function getRuns(): Promise<FetchRunRow[]> {
  const sql = await ready();
  return (await sql`
    SELECT * FROM fetch_runs
    ORDER BY started_at DESC
    LIMIT 50
  `) as FetchRunRow[];
}

// --- mutations ---

export async function addSource(
  type: Platform,
  query: string,
  label: string,
): Promise<void> {
  const sql = await ready();
  await sql`
    INSERT INTO sources (type, query, label)
    VALUES (${type}, ${query}, ${label})
    ON CONFLICT (type, query) DO NOTHING`;
}

export async function toggleSource(id: number): Promise<void> {
  const sql = await ready();
  await sql`UPDATE sources SET enabled = NOT enabled WHERE id = ${id}`;
}

export async function deleteSource(id: number): Promise<void> {
  const sql = await ready();
  await sql`DELETE FROM sources WHERE id = ${id}`;
}
