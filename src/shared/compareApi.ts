// AI-generated comparison copy, routed through the extension background worker.
import type { CompareContext, CompareRequest, ExtensionMessage } from "../types";

export interface CompareTakeaway {
  text: string;
  tone: "positive" | "neutral" | "negative";
}

export interface CompareSummary {
  summary: string;
  takeaways: CompareTakeaway[];
}

export type CompareResult =
  | { ok: true; data: CompareSummary | { explanation: string } }
  | { ok: false; error: string };

const cache = new Map<string, CompareSummary | { explanation: string }>();
const pending = new Map<string, Promise<CompareResult>>();

const requestKey = (
  videoId: string,
  context: CompareContext,
  depth: "summary" | "detailed",
) => `${videoId}:${depth}:${JSON.stringify(context)}`;

export const fetchCompare = async (
  videoId: string,
  context: CompareContext,
  depth: "summary" | "detailed",
): Promise<CompareResult> => {
  const key = requestKey(videoId, context, depth);
  const cached = cache.get(key);
  if (cached) return { ok: true, data: cached };

  const running = pending.get(key);
  if (running) return running;

  const work = (async (): Promise<CompareResult> => {
    const payload: CompareRequest = { videoId, depth, context };
    const message: ExtensionMessage = { type: "FETCH_COMPARE", payload };

    try {
      const reply = await chrome.runtime.sendMessage(message);
      if (!reply?.ok || !reply.data) {
        return {
          ok: false,
          error: reply?.error ?? "Could not generate the AI comparison. Please try again.",
        };
      }

      if (depth === "summary") {
        const summary = reply.data.summary;
        const takeaways = reply.data.takeaways;
        if (typeof summary !== "string" || !Array.isArray(takeaways)) {
          return { ok: false, error: "The AI comparison returned an unexpected response." };
        }

        const data: CompareSummary = {
          summary,
          takeaways: takeaways.filter(
            (item: any) =>
              item &&
              typeof item.text === "string" &&
              ["positive", "neutral", "negative"].includes(item.tone),
          ),
        };
        if (!data.takeaways.length) {
          return { ok: false, error: "The AI comparison did not include any key takeaways." };
        }
        cache.set(key, data);
        return { ok: true, data };
      }

      const explanation = reply.data.explanation;
      if (typeof explanation !== "string" || !explanation.trim()) {
        return { ok: false, error: "The detailed comparison returned an unexpected response." };
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
