import type { NormalizedMention } from "../types";

/**
 * GitHub connector — Issues Search API.
 * Open/closed issues in e-commerce tool repos are concrete pain: bug reports and
 * feature requests. A token is optional (unauth 60/hr, token 5000/hr) via
 * GITHUB_TOKEN. Uses the REST API directly (the GitHub MCP isn't available at
 * app runtime).
 *
 * `query` = a GitHub issue-search expression, e.g. "repo:woocommerce/woocommerce
 * is:issue". `is:issue` is appended automatically if absent (excludes PRs).
 * Docs: https://docs.github.com/rest/search/search#search-issues-and-pull-requests
 */

const SEARCH_URL = "https://api.github.com/search/issues";

/** No credentials required (token is optional, only raises rate limit). */
export function isGitHubConfigured(): boolean {
  return true;
}

export interface GhIssue {
  id: number;
  title: string;
  body?: string | null;
  html_url: string;
  comments?: number;
  created_at: string;
  user?: { login?: string };
  reactions?: { total_count?: number };
}

/** Map one GitHub issue to the common shape. */
export function mapGhIssue(it: GhIssue): NormalizedMention {
  return {
    platform: "github",
    externalId: `gh_${it.id}`,
    author: it.user?.login ?? null,
    title: it.title ?? null,
    body: it.body ?? "",
    url: it.html_url,
    score: it.reactions?.total_count ?? 0,
    numComments: it.comments ?? 0,
    createdUtc: new Date(it.created_at).toISOString(),
  };
}

/** Search GitHub issues for a query expression. */
export async function fetchGitHub(
  query: string,
  opts: { limit?: number } = {},
): Promise<NormalizedMention[]> {
  const perPage = Math.min(opts.limit ?? 50, 100);
  const q = /\bis:issue\b/.test(query) ? query : `${query} is:issue`;
  const url = `${SEARCH_URL}?q=${encodeURIComponent(q)}&per_page=${perPage}&sort=created&order=desc`;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "pain-radar",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`GitHub fetch failed (${res.status}): ${txt.slice(0, 200)}`);
  }
  const json = (await res.json()) as { items?: GhIssue[] };
  return (json.items ?? []).map(mapGhIssue);
}
