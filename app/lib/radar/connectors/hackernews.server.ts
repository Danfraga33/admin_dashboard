import type { NormalizedMention } from "../types";

/**
 * Hacker News connector — Algolia Search API (free, no auth, no key).
 * Searches both comments and stories for a phrase; comments carry most of the
 * operator gripes, stories surface "Ask HN" pain. ToS-clean public endpoint.
 * Docs: https://hn.algolia.com/api
 */

const SEARCH_URL = "https://hn.algolia.com/api/v1/search";

/** No credentials required. */
export function isHackerNewsConfigured(): boolean {
  return true;
}

export interface HnHit {
  objectID: string;
  author?: string | null;
  title?: string | null;
  story_title?: string | null;
  comment_text?: string | null;
  story_text?: string | null;
  points?: number | null;
  num_comments?: number | null;
  created_at_i?: number;
}

/** Map one Algolia hit (story or comment) to the common shape. */
export function mapHnHit(h: HnHit): NormalizedMention {
  return {
    platform: "hackernews",
    externalId: `hn_${h.objectID}`,
    author: h.author ?? null,
    title: h.title ?? h.story_title ?? null,
    body: (h.comment_text ?? h.story_text ?? "").trim(),
    url: `https://news.ycombinator.com/item?id=${h.objectID}`,
    score: h.points ?? 0,
    numComments: h.num_comments ?? 0,
    createdUtc: new Date((h.created_at_i ?? 0) * 1000).toISOString(),
  };
}

async function searchTag(query: string, tag: string, hits: number): Promise<HnHit[]> {
  const url = `${SEARCH_URL}?query=${encodeURIComponent(query)}&tags=${tag}&hitsPerPage=${hits}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HN fetch failed (${res.status}): ${txt.slice(0, 200)}`);
  }
  const json = (await res.json()) as { hits?: HnHit[] };
  return json.hits ?? [];
}

/** Search HN comments + stories for a phrase. */
export async function fetchHackerNews(
  query: string,
  opts: { limit?: number } = {},
): Promise<NormalizedMention[]> {
  const perTag = Math.min(opts.limit ?? 50, 100);
  const [comments, stories] = await Promise.all([
    searchTag(query, "comment", perTag),
    searchTag(query, "story", perTag),
  ]);
  return [...comments, ...stories]
    .map(mapHnHit)
    .filter((m) => m.body.length > 0 || m.title);
}
