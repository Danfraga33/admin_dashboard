import type { NormalizedMention } from "../types";

/**
 * Stack Exchange connector — official Search/Advanced API.
 * Questions are literal user problems; we pull recent ones by tag. A key is
 * optional (keyless = 300 req/day, key = 10k/day) via STACKEXCHANGE_KEY.
 *
 * `query` convention: "[site:]tag" — defaults to the stackoverflow site, or
 * prefix another site, e.g. "magento.stackexchange:magento2".
 * Docs: https://api.stackexchange.com/docs/advanced-search
 */

const API = "https://api.stackexchange.com/2.3/search/advanced";

/** No credentials required (key is optional, only raises quota). */
export function isStackExchangeConfigured(): boolean {
  return true;
}

export interface SeItem {
  question_id: number;
  title: string;
  body?: string;
  score?: number;
  answer_count?: number;
  creation_date?: number;
  link: string;
  owner?: { display_name?: string };
}

/** Crude HTML-to-text for question bodies (API returns escaped HTML). */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Split the "[site:]tag" query convention into {site, tag}. */
export function parseSeQuery(query: string): { site: string; tag: string } {
  const idx = query.indexOf(":");
  if (idx > -1) {
    const left = query.slice(0, idx);
    if (left.includes("stackexchange") || left.includes(".")) {
      return { site: left, tag: query.slice(idx + 1).trim() };
    }
  }
  return { site: "stackoverflow", tag: query.trim() };
}

/** Map one Stack Exchange question to the common shape. */
export function mapSeItem(item: SeItem, site: string): NormalizedMention {
  return {
    platform: "stackexchange",
    externalId: `se_${site}_${item.question_id}`,
    author: item.owner?.display_name ?? null,
    title: item.title ?? null,
    body: item.body ? stripHtml(item.body) : "",
    url: item.link,
    score: item.score ?? 0,
    numComments: item.answer_count ?? 0,
    createdUtc: new Date((item.creation_date ?? 0) * 1000).toISOString(),
  };
}

/** Fetch recent questions for a tag on a Stack Exchange site. */
export async function fetchStackExchange(
  query: string,
  opts: { limit?: number } = {},
): Promise<NormalizedMention[]> {
  const { site, tag } = parseSeQuery(query);
  if (!tag) throw new Error(`Stack Exchange query "${query}" has no tag`);
  const pagesize = Math.min(opts.limit ?? 50, 100);

  const params = new URLSearchParams({
    site,
    tagged: tag,
    sort: "creation",
    order: "desc",
    pagesize: String(pagesize),
    filter: "withbody",
  });
  if (process.env.STACKEXCHANGE_KEY) params.set("key", process.env.STACKEXCHANGE_KEY);

  const res = await fetch(`${API}?${params}`, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Stack Exchange fetch failed (${res.status}): ${txt.slice(0, 200)}`);
  }
  const json = (await res.json()) as { items?: SeItem[]; error_message?: string };
  if (json.error_message) throw new Error(`Stack Exchange error: ${json.error_message}`);

  return (json.items ?? []).map((it) => mapSeItem(it, site));
}
