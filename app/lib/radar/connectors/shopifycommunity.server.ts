import type { NormalizedMention } from "../types";

/**
 * Shopify Community connector — Discourse public JSON (no auth).
 * community.shopify.com runs on Discourse; every category page has a `.json`
 * twin returning topic lists with an `excerpt` (the pain snippet). This is
 * operator-native pain: merchants discussing real store problems.
 *
 * We read category endpoints (/c/<slug>/<id>.json) rather than /search, which
 * robots.txt disallows. The complaint pipeline filters pain from the feed.
 *
 * `query` convention: "<slug>/<id>", e.g. "payments-shipping-fulfilment/217".
 * Docs: https://docs.discourse.org (Category, Topic List)
 */

const BASE = "https://community.shopify.com";

/** No credentials required. */
export function isShopifyCommunityConfigured(): boolean {
  return true;
}

function userAgent(): string {
  return process.env.SHOPIFY_COMMUNITY_USER_AGENT || "pain-radar/0.1 (operator pain research)";
}

/** Decode the HTML entities Discourse leaves in excerpts. */
export function decodeExcerpt(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&hellip;/g, "…")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+…/g, "…")
    .trim();
}

export interface DiscourseTopic {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  posts_count?: number;
  reply_count?: number;
  like_count?: number;
  views?: number;
  created_at: string;
  last_poster_username?: string;
}

/** Map one Discourse topic to the common shape. */
export function mapShopifyTopic(t: DiscourseTopic): NormalizedMention {
  return {
    platform: "shopifycommunity",
    externalId: `shopify_t_${t.id}`,
    author: t.last_poster_username ?? null,
    title: t.title ?? null,
    body: t.excerpt ? decodeExcerpt(t.excerpt) : "",
    url: `${BASE}/t/${t.slug}/${t.id}`,
    score: t.like_count ?? 0,
    numComments: t.reply_count ?? Math.max(0, (t.posts_count ?? 1) - 1),
    createdUtc: new Date(t.created_at).toISOString(),
  };
}

/** Fetch recent topics from a Shopify Community (Discourse) category. */
export async function fetchShopifyCommunity(
  query: string,
  opts: { limit?: number } = {},
): Promise<NormalizedMention[]> {
  const limit = Math.min(opts.limit ?? 50, 100);
  const path = `/c/${query.replace(/^\/+|\/+$/g, "")}.json`;

  const res = await fetch(`${BASE}${path}`, {
    headers: { "User-Agent": userAgent(), Accept: "application/json" },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Shopify Community fetch failed (${res.status}): ${txt.slice(0, 200)}`);
  }

  const json = (await res.json()) as { topic_list?: { topics?: DiscourseTopic[] } };
  const topics = json.topic_list?.topics ?? [];
  return topics
    .slice(0, limit)
    .map(mapShopifyTopic)
    .filter((m) => Boolean(m.title) || m.body.length > 0);
}
