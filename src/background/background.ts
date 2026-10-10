import type { ExtensionMessage, ExtensionState, AnyEvent } from "../types";

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
    }

    // Return true to indicate we wish to send a response asynchronously (even though we're sync here, it's good practice)
    return true;
  },
);

console.log("Background Service Worker Running");
