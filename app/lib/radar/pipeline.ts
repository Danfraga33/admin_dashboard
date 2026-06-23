import { TOPICS } from "./topics";
import type { NormalizedMention } from "./types";

/**
 * Pain pipeline (pure, deterministic, zero external cost):
 *   detectComplaint -> classifyTopic -> extractKeywords -> analyze
 *
 * Rule-based on purpose: it boots with no API key, is explainable, and gives a
 * clean seam to swap in an LLM clustering pass later without touching callers.
 */

interface Marker {
  re: RegExp;
  weight: number;
}

// Phrases operators use when they're hurting. Weight = intensity contribution.
const MARKERS: Marker[] = [
  { re: /\bi hate\b/i, weight: 0.45 },
  { re: /\bi wish\b/i, weight: 0.3 },
  { re: /\bwish there was\b/i, weight: 0.4 },
  { re: /\bcan'?t stand\b/i, weight: 0.4 },
  { re: /\bso frustrat/i, weight: 0.4 },
  { re: /\bfrustrat/i, weight: 0.3 },
  { re: /\bannoying\b/i, weight: 0.3 },
  { re: /\b(tired|sick|fed up) of\b/i, weight: 0.4 },
  { re: /\bstruggl/i, weight: 0.3 },
  { re: /\bwhy (do|is|isn'?t|can'?t|does)\b/i, weight: 0.25 },
  { re: /\bis there (a|any) way to\b/i, weight: 0.3 },
  { re: /\bno way to\b/i, weight: 0.35 },
  { re: /\bhow do i\b/i, weight: 0.2 },
  { re: /\b(impossible|painful) to\b/i, weight: 0.4 },
  { re: /\b(hard|difficult) to\b/i, weight: 0.25 },
  { re: /\bpain in the (ass|butt|neck)\b/i, weight: 0.45 },
  { re: /\bwaste of time\b/i, weight: 0.4 },
  { re: /\bby hand\b/i, weight: 0.35 },
  { re: /\bmanually\b/i, weight: 0.35 },
  { re: /\bspreadsheet/i, weight: 0.3 },
  { re: /\b(broke|broken|doesn'?t work|stopped working|keeps (failing|crashing))\b/i, weight: 0.35 },
  { re: /\bnightmare\b/i, weight: 0.45 },
  { re: /\bheadache\b/i, weight: 0.35 },
  { re: /\b(spend|spent|wasting|wasted) (hours|days)\b/i, weight: 0.4 },
  { re: /\b(drowning|buried) in\b/i, weight: 0.4 },
  { re: /\boverwhelmed\b/i, weight: 0.35 },
  { re: /\b(ridiculous|horrible|useless|terrible|garbage)\b/i, weight: 0.35 },
  { re: /\bevery (single )?time\b/i, weight: 0.25 },
  { re: /\bconstantly\b/i, weight: 0.25 },
];

const COMPLAINT_THRESHOLD = 0.35;

export interface ComplaintResult {
  isComplaint: boolean;
  intensity: number; // 0..1
  markers: string[];
}

export function detectComplaint(text: string): ComplaintResult {
  const markers: string[] = [];
  let raw = 0;
  for (const m of MARKERS) {
    const hit = text.match(m.re);
    if (hit) {
      raw += m.weight;
      markers.push(hit[0].toLowerCase());
    }
  }
  // Saturating curve so a few strong signals already reads as high intensity.
  const intensity = raw === 0 ? 0 : Math.min(1, 0.15 + raw);
  return { isComplaint: intensity >= COMPLAINT_THRESHOLD, intensity, markers };
}

export interface TopicResult {
  topic: string;
  matched: string[];
}

export function classifyTopic(text: string): TopicResult {
  const lower = text.toLowerCase();
  let best = { key: "uncategorized", matched: [] as string[], hits: 0 };
  for (const topic of TOPICS) {
    const matched: string[] = [];
    for (const kw of topic.keywords) {
      if (lower.includes(kw)) matched.push(kw);
    }
    if (matched.length > best.hits) {
      best = { key: topic.key, matched, hits: matched.length };
    }
  }
  return { topic: best.key, matched: best.matched };
}

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "if", "of", "to", "in", "on", "for",
  "with", "is", "are", "was", "were", "be", "been", "being", "it", "its", "this",
  "that", "these", "those", "i", "im", "my", "me", "we", "you", "your", "they",
  "them", "he", "she", "his", "her", "our", "us", "so", "do", "does", "did",
  "have", "has", "had", "not", "no", "yes", "can", "cant", "will", "would",
  "should", "could", "just", "really", "very", "get", "got", "like", "about",
  "as", "at", "by", "from", "up", "out", "what", "when", "how", "why", "who",
  "all", "any", "some", "more", "most", "than", "then", "there", "here", "one",
  "use", "using", "im", "ive", "dont", "doesnt", "im", "thats", "im",
]);

/** Top distinct content words from text, for display/emergent grouping. */
export function extractKeywords(text: string, limit = 6): string[] {
  const words = text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w) && !/^\d+$/.test(w));

  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([w]) => w);
}

export interface Analysis {
  isComplaint: boolean;
  intensity: number;
  topic: string;
  keywords: string;
}

export function analyze(m: NormalizedMention): Analysis {
  const text = `${m.title ?? ""}\n${m.body}`.trim();
  const complaint = detectComplaint(text);
  const topic = classifyTopic(text);
  // Prefer matched topic keywords; fall back to extracted content words.
  const kws =
    topic.matched.length > 0
      ? topic.matched.slice(0, 6)
      : extractKeywords(text);
  return {
    isComplaint: complaint.isComplaint,
    intensity: Number(complaint.intensity.toFixed(3)),
    topic: topic.topic,
    keywords: kws.join(", "),
  };
}
