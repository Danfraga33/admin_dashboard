import { ensureSchema, getSql } from "./db.server";
import { fetchSubreddit } from "./connectors/reddit.server";
import { fetchYouTube } from "./connectors/youtube.server";
import { fetchHackerNews } from "./connectors/hackernews.server";
import { fetchStackExchange } from "./connectors/stackexchange.server";
import { fetchGitHub } from "./connectors/github.server";
import { fetchShopifyCommunity } from "./connectors/shopifycommunity.server";
import { analyze } from "./pipeline";
import { topicLabel } from "./topics";
import type { NormalizedMention, SourceRow } from "./types";

export interface SourceRunResult {
  sourceId: number;
  label: string;
  status: "ok" | "error";
  scanned: number;
  added: number;
  complaints: number;
  error?: string;
}

export interface IngestResult {
  runs: SourceRunResult[];
  mentionsAdded: number;
  complaintsAdded: number;
  alertsCreated: number;
  error?: string;
}

async function loadSources(sourceId?: number): Promise<SourceRow[]> {
  const sql = getSql();
  const rows = sourceId
    ? await sql`SELECT * FROM sources WHERE id = ${sourceId}`
    : await sql`SELECT * FROM sources WHERE enabled = true ORDER BY id`;
  return rows as SourceRow[];
}

async function fetchForSource(source: SourceRow): Promise<NormalizedMention[]> {
  switch (source.type) {
    case "reddit":
      return fetchSubreddit(source.query, { t: "month", limit: 75 });
    case "youtube":
      return fetchYouTube(source.query, { maxVideos: 5, commentsPerVideo: 60 });
    case "hackernews":
      return fetchHackerNews(source.query, { limit: 50 });
    case "stackexchange":
      return fetchStackExchange(source.query, { limit: 50 });
    case "github":
      return fetchGitHub(source.query, { limit: 50 });
    case "shopifycommunity":
      return fetchShopifyCommunity(source.query, { limit: 50 });
    default:
      return [];
  }
}

async function upsertMention(
  sourceId: number,
  m: NormalizedMention,
): Promise<{ inserted: boolean; isComplaint: boolean }> {
  const sql = getSql();
  const a = analyze(m);
  const rows = await sql`
    INSERT INTO mentions (
      source_id, platform, external_id, author, title, body, url,
      score, num_comments, created_utc, is_complaint, intensity, topic, keywords
    ) VALUES (
      ${sourceId}, ${m.platform}, ${m.externalId}, ${m.author}, ${m.title},
      ${m.body}, ${m.url}, ${m.score}, ${m.numComments}, ${m.createdUtc},
      ${a.isComplaint}, ${a.intensity}, ${a.topic}, ${a.keywords}
    )
    ON CONFLICT (platform, external_id) DO UPDATE
      SET score = EXCLUDED.score,
          num_comments = EXCLUDED.num_comments,
          fetched_at = now()
    RETURNING (xmax = 0) AS inserted`;
  return { inserted: Boolean(rows[0]?.inserted), isComplaint: a.isComplaint };
}

/** Run one source end-to-end, recording a fetch_run row. */
async function runSource(source: SourceRow): Promise<SourceRunResult> {
  const sql = getSql();
  const runRows = await sql`
    INSERT INTO fetch_runs (source_id, source_label, status)
    VALUES (${source.id}, ${source.label}, 'running')
    RETURNING id`;
  const runId = runRows[0]!.id as number;

  try {
    const mentions = await fetchForSource(source);
    let added = 0;
    let complaints = 0;
    for (const m of mentions) {
      const r = await upsertMention(source.id, m);
      if (r.inserted) {
        added++;
        if (r.isComplaint) complaints++;
      }
    }
    await sql`
      UPDATE fetch_runs
      SET finished_at = now(), status = 'ok',
          mentions_scanned = ${mentions.length},
          mentions_added = ${added},
          complaints_added = ${complaints}
      WHERE id = ${runId}`;
    return {
      sourceId: source.id,
      label: source.label,
      status: "ok",
      scanned: mentions.length,
      added,
      complaints,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await sql`
      UPDATE fetch_runs
      SET finished_at = now(), status = 'error', error = ${message}
      WHERE id = ${runId}`;
    return {
      sourceId: source.id,
      label: source.label,
      status: "error",
      scanned: 0,
      added: 0,
      complaints: 0,
      error: message,
    };
  }
}

/** Compare last-7d vs prior-7d complaint volume per topic; raise spike alerts. */
async function detectSpikes(): Promise<number> {
  const sql = getSql();
  const rows = (await sql`
    SELECT topic,
      count(*) FILTER (
        WHERE created_utc >= now() - interval '7 days'
      )::int AS last7,
      count(*) FILTER (
        WHERE created_utc < now() - interval '7 days'
          AND created_utc >= now() - interval '14 days'
      )::int AS prev7
    FROM mentions
    WHERE is_complaint = true AND topic <> 'uncategorized'
    GROUP BY topic`) as Array<{ topic: string; last7: number; prev7: number }>;

  let created = 0;
  for (const r of rows) {
    const spike =
      (r.prev7 >= 3 && r.last7 > r.prev7 * 1.5) ||
      (r.prev7 === 0 && r.last7 >= 5);
    if (!spike) continue;

    const recent = await sql`
      SELECT 1 FROM alerts
      WHERE topic = ${r.topic} AND kind = 'spike'
        AND created_at > now() - interval '3 days'
      LIMIT 1`;
    if (recent.length > 0) continue;

    const mult = r.prev7 === 0 ? r.last7 : (r.last7 / r.prev7).toFixed(1);
    const message = `${topicLabel(r.topic)}: ${r.last7} complaints in the last 7d vs ${r.prev7} the week before (${mult}x).`;
    await sql`
      INSERT INTO alerts (topic, kind, message, baseline, current)
      VALUES (${r.topic}, 'spike', ${message}, ${r.prev7}, ${r.last7})`;
    created++;
  }
  return created;
}

/** Main entry: ingest all enabled sources (or one), then detect spikes. */
export async function runIngest(sourceId?: number): Promise<IngestResult> {
  await ensureSchema();
  const sources = await loadSources(sourceId);

  const runs: SourceRunResult[] = [];
  for (const source of sources) {
    runs.push(await runSource(source));
  }

  const alertsCreated = await detectSpikes();

  return {
    runs,
    mentionsAdded: runs.reduce((n, r) => n + r.added, 0),
    complaintsAdded: runs.reduce((n, r) => n + r.complaints, 0),
    alertsCreated,
  };
}
