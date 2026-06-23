import type { NormalizedMention } from "../types";

/**
 * Reddit connector — OAuth primary, public-JSON fallback.
 *
 * Reddit hard-blocks the public `.json` endpoints (403) from many IPs, so OAuth
 * is the reliable path. We use it whenever a client_id is configured:
 *   - script app  (id + secret + username + password) -> password grant
 *   - confidential app-only (id + secret)             -> client_credentials grant
 * When no client_id is set we fall back to the public `.json` endpoints, which
 * still work from clean IPs (e.g. some deploy hosts) but may 403 elsewhere.
 *
 * Create an app at https://www.reddit.com/prefs/apps ("script" type).
 * Docs: https://www.reddit.com/dev/api
 */

const TOKEN_URL = "https://www.reddit.com/api/v1/access_token";
const OAUTH_BASE = "https://oauth.reddit.com";
const PUBLIC_BASE = "https://www.reddit.com";

function userAgent(): string {
  return process.env.REDDIT_USER_AGENT || "pain-radar/0.1 (by /u/fragrance33)";
}

function hasOAuth(): boolean {
  return Boolean(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET);
}

/**
 * "Configured" if OAuth creds exist OR we can attempt the public fallback.
 * Always true — the connector always has a path to try.
 */
export function isRedditConfigured(): boolean {
  return true;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface RedditChild {
  data: {
    id: string;
    name: string;
    author: string;
    title: string;
    selftext: string;
    permalink: string;
    ups: number;
    num_comments: number;
    created_utc: number;
  };
}

type Listing = { data?: { children?: RedditChild[] } };

// --- OAuth -----------------------------------------------------------------

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 30_000) {
    return cachedToken.token;
  }

  const basic = Buffer.from(
    `${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`,
  ).toString("base64");

  // Script app (user creds present) -> password grant; else app-only.
  const hasUser = Boolean(process.env.REDDIT_USERNAME && process.env.REDDIT_PASSWORD);
  const body = hasUser
    ? new URLSearchParams({
        grant_type: "password",
        username: process.env.REDDIT_USERNAME!,
        password: process.env.REDDIT_PASSWORD!,
      })
    : new URLSearchParams({ grant_type: "client_credentials" });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": userAgent(),
    },
    body,
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Reddit auth failed (${res.status}): ${txt.slice(0, 200)}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: json.access_token, expiresAt: now + json.expires_in * 1000 };
  return cachedToken.token;
}

async function fetchOAuth(path: string): Promise<Listing> {
  const token = await getToken();
  const res = await fetch(`${OAUTH_BASE}${path}`, {
    headers: { Authorization: `bearer ${token}`, "User-Agent": userAgent() },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Reddit OAuth fetch failed (${res.status}): ${txt.slice(0, 200)}`);
  }
  return res.json() as Promise<Listing>;
}

// --- Public JSON fallback --------------------------------------------------

async function fetchPublic(path: string): Promise<Listing> {
  const url = `${PUBLIC_BASE}${path}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, {
      headers: { "User-Agent": userAgent(), Accept: "application/json" },
    });
    if (res.status === 429 && attempt === 0) {
      const retryAfter = Number(res.headers.get("retry-after")) || 2;
      await sleep(Math.min(retryAfter, 10) * 1000);
      continue;
    }
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Reddit public fetch failed (${res.status}): ${txt.slice(0, 200)}`);
    }
    return res.json() as Promise<Listing>;
  }
  throw new Error("Reddit public fetch failed: rate limited (429) after retry");
}

// --- Public API ------------------------------------------------------------

/** Fetch top posts from a subreddit over the given window. */
export async function fetchSubreddit(
  subreddit: string,
  opts: { t?: "day" | "week" | "month" | "year"; limit?: number } = {},
): Promise<NormalizedMention[]> {
  const t = opts.t ?? "month";
  const limit = Math.min(opts.limit ?? 50, 100);
  const sub = encodeURIComponent(subreddit.replace(/^r\//, ""));

  let json: Listing;
  if (hasOAuth()) {
    json = await fetchOAuth(`/r/${sub}/top?t=${t}&limit=${limit}&raw_json=1`);
  } else {
    json = await fetchPublic(`/r/${sub}/top.json?t=${t}&limit=${limit}&raw_json=1`);
  }

  const children = json.data?.children ?? [];
  return children.map((c) => {
    const d = c.data;
    return {
      platform: "reddit" as const,
      externalId: d.name || `t3_${d.id}`,
      author: d.author ?? null,
      title: d.title ?? null,
      body: d.selftext ?? "",
      url: `https://www.reddit.com${d.permalink}`,
      score: d.ups ?? 0,
      numComments: d.num_comments ?? 0,
      createdUtc: new Date((d.created_utc ?? 0) * 1000).toISOString(),
    };
  });
}
