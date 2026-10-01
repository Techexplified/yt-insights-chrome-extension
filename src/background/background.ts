import type { ExtensionMessage, ExtensionState, AnyEvent } from "../types";
import { parseWatchHtml } from "../shared/watchPage";

let state: ExtensionState = {
  isActive: true,
  eventCount: 0,
};

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
    } else if (message.type === "GET_STATS") {
      sendResponse(state);
    } else if (message.type === "TOGGLE_TRACKING") {
      state.isActive = !state.isActive;
      console.log("🔄 Tracking Toggled:", state.isActive ? "Active" : "Paused");
      sendResponse(state);
    } else if (message.type === "FETCH_VIDEO_DATA") {
      const url = message.payload as string;
      fetch(url)
        .then((res) => res.text())
        .then((html) => {
          try {
            const d = parseWatchHtml(html);
            const idMatch = url.match(
              /[?&]v=([\w-]{11})|youtu\.be\/([\w-]{11})/,
            );
            const videoId = idMatch ? idMatch[1] || idMatch[2] : "";

            sendResponse({
              success: true,
              data: {
                views: d.views || "0",
                likes: d.likes || "0",
                subscribers: d.subscribers || "0",
                title: d.title || "Unknown Video",
                date: d.date,
                thumbnailUrl: videoId
                  ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
                  : "",
                channelName: d.channelName,
                videoId,
              },
            });
          } catch (e) {
            console.error("Parse Error", e);
            sendResponse({
              success: false,
              error: "Failed to parse video data",
            });
          }
        })
        .catch((err) => {
          console.error("Fetch Error", err);
          sendResponse({ success: false, error: "Failed to fetch video" });
        });

      return true; // Async response
    }

    // Return true to indicate we wish to send a response asynchronously (even though we're sync here, it's good practice)
    return true;
  },
);

console.log("Background Service Worker Running");
