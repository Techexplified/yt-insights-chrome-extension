import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import Overlay from "../components/Overlay";
import { getFreshVideoData } from "./scraper";
import type { YouTubeVideoData } from "./scraper";
// @ts-ignore
import overlayStyles from "../../shared/insights.css?inline";

const InjectorApp: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [data, setData] = useState<YouTubeVideoData | null>(null);

  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  // Always fetch fresh data; ignore responses that were superseded by a newer request.
  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    const fresh = await getFreshVideoData();
    if (id !== requestId.current) return;
    if (!fresh) console.warn("ViewStack: Could not scrape video data");
    setData(fresh);
    setLoading(false);
  }, []);

  const handleAnalyze = () => {
    setData(null); // never show the previous video while loading
    setVisible(true);
    void load();
  };

  // YouTube is a SPA: when the user opens another video, drop old data (and reload if the panel is open).
  useEffect(() => {
    const onNavigate = () => {
      setData(null);
      if (visible) {
        void load();
      } else {
        requestId.current++;
        setLoading(false);
      }
    };
    window.addEventListener("yt-navigate-finish", onNavigate);
    return () => window.removeEventListener("yt-navigate-finish", onNavigate);
  }, [visible, load]);

  return (
    <div
      style={{ position: "relative", display: "flex", alignItems: "center" }}
    >
      <button
        onClick={handleAnalyze}
        style={{
          backgroundColor: "#23b5b5",
          color: "white",
          border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: "18px",
          padding: "0 16px",
          height: "36px",
          fontSize: "14px",
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          fontFamily: "Roboto, Arial, sans-serif",
          boxShadow: "0 0 10px rgba(35, 181, 181, 0.4)",
          marginLeft: "8px",
          marginRight: "8px",
        }}
      >
        Analyze
      </button>

      {visible && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 9999,
            filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.5))",
          }}
        >
          <Overlay
            data={data}
            loading={loading}
            onClose={() => setVisible(false)}
          />
        </div>
      )}
    </div>
  );
};

export const initYouTubeOverlay = () => {
  const tryInject = () => {
    if (!window.location.pathname.includes("/watch")) return;

    // Try to inject into the Actions bar (Like, Share, etc.) first
    // If that fails, fallback to next to Subscriber button, but CAREFULLY
    const targets = [
      document.querySelector("#top-level-buttons-computed"), // Old UI
      document.querySelector("ytd-watch-metadata #actions"), // New UI (often contains the menu)
      document.querySelector("ytd-menu-renderer"), // Generic menu
      document.querySelector("#owner #subscribe-button"), // Fallback
    ];

    const target = targets.find((t) => t !== null && t.clientWidth > 0);

    if (target && !document.getElementById("viewstack-injector")) {
      console.log(
        "ViewStack: Injecting Analyze button into",
        target.tagName,
        target.className,
      );

      const host = document.createElement("div");
      host.id = "viewstack-injector";
      host.style.display = "inline-flex";
      host.style.alignItems = "center";

      // If injection is in the subscribe area, add margin
      if (target.id === "subscribe-button") {
        host.style.marginLeft = "12px";
      }

      // Append at the start or end?
      // For actions bar, usually better at the end or valid slot.
      // ytd-menu-renderer usually puts things in a flex row.
      target.appendChild(host);

      const shadow = host.attachShadow({ mode: "open" });

      const style = document.createElement("style");
      style.textContent = overlayStyles;
      shadow.appendChild(style);

      const root = createRoot(shadow);
      root.render(<InjectorApp />);
    }
  };

  // Check frequently
  setInterval(tryInject, 1000);

  // Clear interval if needed? strictly speaking we want to keep checking in case of SPA navs clearing DOM
  // But we have the event listener below.

  window.addEventListener("yt-navigate-finish", () => {
    setTimeout(tryInject, 500);
  });
};
