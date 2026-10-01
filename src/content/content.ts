import type { PageViewEvent, ClickEvent } from "../types";
import { initYouTubeOverlay } from "./youtube/injector";
import { getFreshVideoData } from "./youtube/scraper";

// Helper to send events
const sendEvent = (event: PageViewEvent | ClickEvent) => {
  try {
    chrome.runtime.sendMessage({ type: "ANALYTICS_EVENT", payload: event });
  } catch (error) {
    // If extension is reloaded/invalidated, this might fail
    console.error("Failed to send analytics event:", error);
  }
};

// --- Page View Tracking ---

const trackPageView = () => {
  const event: PageViewEvent = {
    type: "page_view",
    timestamp: Date.now(),
    url: window.location.href,
    path: window.location.pathname,
    title: document.title,
  };
  console.log("Tracking Page View:", event.path);
  sendEvent(event);
};

// Hook into History API for SPA support
const hookHistory = () => {
  const pushState = history.pushState;
  const replaceState = history.replaceState;

  history.pushState = function (...args) {
    pushState.apply(history, args);
    window.dispatchEvent(new Event("locationchange"));
  };

  history.replaceState = function (...args) {
    replaceState.apply(history, args);
    window.dispatchEvent(new Event("locationchange"));
  };

  window.addEventListener("popstate", () => {
    window.dispatchEvent(new Event("locationchange"));
  });

  window.addEventListener("locationchange", () => {
    // Small delay to allow title to update if handled by framework
    setTimeout(trackPageView, 100);
  });
};

// --- Click Tracking ---

const trackClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement;

  // ⚠️ PRIVACY: Do not track inputs or form fields
  const tagName = target.tagName.toLowerCase();
  if (tagName === "input" || tagName === "textarea" || tagName === "select") {
    return;
  }

  // Get text content (truncate to 50 chars)
  let text = target.innerText || target.textContent || "";
  text = text.trim().substring(0, 50);

  const event: ClickEvent = {
    type: "click",
    timestamp: Date.now(),
    url: window.location.href,
    tagName: target.tagName,
    text: text ? text : undefined, // only send if has text
  };

  sendEvent(event);
};

// --- Initialization ---

const init = () => {
  // Track initial page load
  console.log("ViewStack: Content Script Initialized (v2 - Prod Fix)");
  trackPageView();

  // Initialize SPA hooks
  hookHistory();

  // Listen for clicks
  document.addEventListener("click", trackClick, true); // Capture phase to ensure we catch it

  // Init YouTube specific features
  initYouTubeOverlay();

  // Listen for requests from Popup
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "GET_YOUTUBE_STATS") {
      getFreshVideoData().then((data) => {
        sendResponse({
          isOnVideo: !!data,
          ...data,
        });
      });
      return true; // keep the channel open for the async response
    }
  });
};

// Run
init();
