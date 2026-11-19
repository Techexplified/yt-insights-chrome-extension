// AI-generated overview copy, routed through the extension background worker.
import type { ExtensionMessage, OverviewContext, OverviewRequest } from "../types";

export interface OverviewTakeaway {
  text: string;
  tone: "positive" | "neutral" | "negative";
}

export interface OverviewSummary {
  summary: string;
  takeaways: OverviewTakeaway[];
}

export type OverviewResult =
  | { ok: true; data: OverviewSummary | { explanation: string } }
  | { ok: false; error: string };

const cache = new Map<string, OverviewSummary | { explanation: string }>();
const pending = new Map<string, Promise<OverviewResult>>();

const requestKey = (videoId: string, context: OverviewContext, depth: "summary" | "detailed") =>
  `${videoId}:${depth}:${JSON.stringify(context)}`;

export const fetchOverview = async (
  videoId: string,
  context: OverviewContext,
  depth: "summary" | "detailed",
): Promise<OverviewResult> => {
  const key = requestKey(videoId, context, depth);
  const cached = cache.get(key);
  if (cached) return { ok: true, data: cached };

  const running = pending.get(key);
  if (running) return running;

  const work = (async (): Promise<OverviewResult> => {
    const payload: OverviewRequest = { videoId, depth, context };
    const message: ExtensionMessage = { type: "FETCH_OVERVIEW", payload };

    try {
      const reply = await chrome.runtime.sendMessage(message);
      if (!reply?.ok || !reply.data) {
        return {
          ok: false,
          error: reply?.error ?? "Could not generate the AI overview. Please try again.",
        };
      }

      if (depth === "summary") {
        const summary = reply.data.summary;
        const takeaways = reply.data.takeaways;
        if (typeof summary !== "string" || !Array.isArray(takeaways)) {
          return { ok: false, error: "The AI overview returned an unexpected response." };
        }
        const data: OverviewSummary = {
          summary,
          takeaways: takeaways.filter(
            (item: any) =>
              item &&
              typeof item.text === "string" &&
              ["positive", "neutral", "negative"].includes(item.tone),
          ),
        };
        if (!data.takeaways.length) {
          return { ok: false, error: "The AI overview did not include any key takeaways." };
        }
        cache.set(key, data);
        return { ok: true, data };
      }

      const explanation = reply.data.explanation;
      if (typeof explanation !== "string" || !explanation.trim()) {
        return { ok: false, error: "The detailed explanation returned an unexpected response." };
      }
      const data = { explanation };
      cache.set(key, data);
      return { ok: true, data };
    } catch {
      return {
        ok: false,
        error: "The extension could not reach the analysis server. Please try again.",
      };
    }
  })();

  pending.set(key, work);
  try {
    return await work;
  } finally {
    pending.delete(key);
  }
};
