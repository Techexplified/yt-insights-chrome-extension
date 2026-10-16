// Talks to the YT Insights backend through the background service worker
// (the worker has host permission for the backend, so no CORS issues from youtube.com).

import type { AudienceRequest, ExtensionMessage } from "../types";

export type AudienceDepth = AudienceRequest["depth"];

export interface AudienceAnalytics {
  commentsAnalyzed: number;
  sentiment: { positive: number; neutral: number; negative: number; total: number };
  themes: { label: string; pct: number }[];
  questions: { text: string; mentions: number }[];
  painPoints: { label: string; pct: number }[];
  volume: { counts: number[]; start: string; end: string } | null;
  takeaway: string;
  // Detailed report only
  summary?: string | null;
  contentIdeas?: string[];
}

export type AudienceResult =
  | { status: "ready"; analytics: AudienceAnalytics; analyzedAt: string; stale: boolean }
  | { status: "comments_disabled" }
  | { status: "insufficient_comments" }
  | { status: "error"; message: string };

// Finished results are remembered for this session so switching tabs doesn't re-request.
const memo = new Map<string, AudienceResult>();

export const fetchAudience = async (
  videoId: string,
  depth: AudienceDepth,
): Promise<AudienceResult> => {
  const key = `${videoId}:${depth}`;
  const hit = memo.get(key);
  if (hit) return hit;

  const message: ExtensionMessage = { type: "FETCH_AUDIENCE", payload: { videoId, depth } };
  let result: AudienceResult;
  try {
    const reply = await chrome.runtime.sendMessage(message);
    if (!reply?.ok) {
      result = { status: "error", message: reply?.error ?? "Something went wrong" };
    } else if (reply.data.status === "ready") {
      result = {
        status: "ready",
        analytics: reply.data.analytics,
        analyzedAt: reply.data.analyzedAt,
        stale: Boolean(reply.data.stale),
      };
    } else if (
      reply.data.status === "comments_disabled" ||
      reply.data.status === "insufficient_comments"
    ) {
      result = { status: reply.data.status };
    } else {
      result = { status: "error", message: "Unexpected response from the server" };
    }
  } catch {
    result = { status: "error", message: "The extension could not reach its background worker" };
  }

  if (result.status !== "error") memo.set(key, result);
  return result;
};
