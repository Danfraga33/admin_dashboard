import type { NormalizedMention } from "../types";

/**
 * YouTube connector — official Data API v3.
 * Searches videos by query, then pulls top-level comments. Free, ToS-compliant.
 * Quota note: search.list costs 100 units, commentThreads.list 1 unit each;
 * default daily quota is 10,000 units. We cap videos to stay cheap.
 * Docs: https://developers.google.com/youtube/v3
 */

const API_BASE = "https://www.googleapis.com/youtube/v3";

export function isYouTubeConfigured(): boolean {
  return Boolean(process.env.YOUTUBE_API_KEY);
}

interface SearchItem {
  id: { videoId: string };
  snippet: { title: string };
}

interface CommentThreadItem {
  snippet: {
    topLevelComment: {
      id: string;
      snippet: {
        textOriginal: string;
        authorDisplayName: string;
        likeCount: number;
        publishedAt: string;
      };
    };
    totalReplyCount: number;
  };
}

/** Search videos for a query and collect top-level comments across them. */
export async function fetchYouTube(
  query: string,
  opts: { maxVideos?: number; commentsPerVideo?: number } = {},
): Promise<NormalizedMention[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    throw new Error("YouTube not configured. Set YOUTUBE_API_KEY in .env.");
  }

  const maxVideos = Math.min(opts.maxVideos ?? 5, 10);
  const commentsPerVideo = Math.min(opts.commentsPerVideo ?? 50, 100);

  const searchUrl =
    `${API_BASE}/search?part=snippet&type=video&order=relevance` +
    `&relevanceLanguage=en&maxResults=${maxVideos}` +
    `&q=${encodeURIComponent(query)}&key=${key}`;

  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) {
    const txt = await searchRes.text();
    throw new Error(
      `YouTube search failed (${searchRes.status}): ${txt.slice(0, 200)}`,
    );
  }
  const searchJson = (await searchRes.json()) as { items?: SearchItem[] };
  const videos = (searchJson.items ?? []).filter((v) => v.id?.videoId);

  const out: NormalizedMention[] = [];

  for (const v of videos) {
    const videoId = v.id.videoId;
    const title = v.snippet?.title ?? null;
    const commentsUrl =
      `${API_BASE}/commentThreads?part=snippet&videoId=${videoId}` +
      `&order=relevance&maxResults=${commentsPerVideo}&textFormat=plainText&key=${key}`;

    const cRes = await fetch(commentsUrl);
    if (!cRes.ok) {
      // Comments disabled (403) or other per-video error — skip this video.
      continue;
    }
    const cJson = (await cRes.json()) as { items?: CommentThreadItem[] };
    for (const item of cJson.items ?? []) {
      const top = item.snippet?.topLevelComment;
      if (!top) continue;
      const s = top.snippet;
      out.push({
        platform: "youtube",
        externalId: top.id,
        author: s.authorDisplayName ?? null,
        title,
        body: s.textOriginal ?? "",
        url: `https://www.youtube.com/watch?v=${videoId}&lc=${top.id}`,
        score: s.likeCount ?? 0,
        numComments: item.snippet.totalReplyCount ?? 0,
        createdUtc: s.publishedAt ?? new Date(0).toISOString(),
      });
    }
  }

  return out;
}
