import type {
  ExtensionMessage,
  ExtensionState,
  AnyEvent,
  AudienceRequest,
} from "../types";

let state: ExtensionState = {
  isActive: true,
  eventCount: 0,
};

// ---------- Audience analytics (backend) ----------
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000"
).replace(/\/$/, "");

// The detailed report can take 15-40s. Chrome may stop an idle MV3 service worker while a
// fetch() is still waiting for its response, so we poke an extension API while a request runs.
const withKeepAlive = async <T>(work: () => Promise<T>): Promise<T> => {
  const timer = setInterval(() => void chrome.runtime.getPlatformInfo(), 20_000);
  try {
    return await work();
  } finally {
    clearInterval(timer);
  }
};

const fetchAudience = ({ videoId, depth }: AudienceRequest) =>
  withKeepAlive(async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/videos/${encodeURIComponent(videoId)}/audience?depth=${depth}`,
        { signal: AbortSignal.timeout(depth === "detailed" ? 180_000 : 90_000) },
      );
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        return {
          ok: false,
          error: body?.message ?? `Request failed (${res.status})`,
        };
      }
      return { ok: true, data: body };
    } catch {
      return {
        ok: false,
        error: "Could not reach the analysis server. Please try again.",
      };
    }
  });

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log("ViewStack Analytics Extension Installed");
  // Initialize state or load from storage if we were persisting (not for this MVP)
});

// Listen for messages
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    if (message.type === "ANALYTICS_EVENT") {
      if (state.isActive) {
        const event = message.payload as AnyEvent;
        console.log("📈 [Analytics Received]:", event);
        state.eventCount++;

        // confirm receipt
        sendResponse({ received: true });
      } else {
        console.log("⏸️ [Analytics Ignored] (Paused):", message.payload);
        sendResponse({ received: false, reason: "paused" });
      }
    } else if (message.type === "FETCH_AUDIENCE") {
      void fetchAudience(message.payload as AudienceRequest).then(sendResponse);
    } else if (message.type === "GET_STATS") {
      sendResponse(state);
    } else if (message.type === "TOGGLE_TRACKING") {
      state.isActive = !state.isActive;
      console.log("🔄 Tracking Toggled:", state.isActive ? "Active" : "Paused");
      sendResponse(state);
    }

    // Return true to indicate we wish to send a response asynchronously (even though we're sync here, it's good practice)
    return true;
  },
);

console.log("Background Service Worker Running");
