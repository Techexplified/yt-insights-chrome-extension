// Content-opportunities data from the backend, fetched through the background service worker.

import type { ExtensionMessage } from "../types";

export type Demand = "high" | "medium" | "low";

export interface OpportunityTopic {
  label: string;
  category: string;
  requests: number;
  demand: Demand;
  // true = the channel's recent videos already cover it, null = we couldn't check
  covered: boolean | null;
}

export interface OpportunityQuestion {
  text: string;
  category: string;
  mentions: number;
}

export interface OpportunityAnalytics {
  commentsAnalyzed: number;
  channelVideosChecked: number;
  coverageChecked: boolean;
  categories: string[];
  topics: OpportunityTopic[];
  questions: OpportunityQuestion[];
}

export type OpportunitiesResult =
  | { status: "ready"; analytics: OpportunityAnalytics; analyzedAt: string; stale: boolean }
  | { status: "not_cached" }
  | { status: "comments_disabled" }
  | { status: "insufficient_comments" }
  | { status: "error"; message: string };

// Finished results are remembered for this session so switching tabs doesn't re-request.
const memo = new Map<string, OpportunitiesResult>();

/**
 * cacheOnly = true  -> only asks whether a fresh result already exists (fast, free).
 * cacheOnly = false -> generates one if needed (15-40 seconds).
 */
export const fetchOpportunities = async (
  videoId: string,
  cacheOnly: boolean,
): Promise<OpportunitiesResult> => {
  const hit = memo.get(videoId);
  if (hit) return hit;

  const message: ExtensionMessage = {
    type: "FETCH_OPPORTUNITIES",
    payload: { videoId, cacheOnly },
  };

  let result: OpportunitiesResult;
  try {
    const reply = await chrome.runtime.sendMessage(message);
    if (!reply?.ok) {
      result = { status: "error", message: reply?.error ?? "Something went wrong" };
    } else {
      const d = reply.data;
      if (d.status === "ready") {
        result = {
          status: "ready",
          analytics: d.analytics,
          analyzedAt: d.analyzedAt,
          stale: Boolean(d.stale),
        };
      } else if (
        d.status === "not_cached" ||
        d.status === "comments_disabled" ||
        d.status === "insufficient_comments"
      ) {
        result = { status: d.status };
      } else {
        result = { status: "error", message: "Unexpected response from the server" };
      }
    }
  } catch {
    result = { status: "error", message: "The extension could not reach its background worker" };
  }

  if (result.status === "ready") memo.set(videoId, result);
  return result;
};
