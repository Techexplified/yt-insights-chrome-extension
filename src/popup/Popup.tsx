import { useEffect, useState } from "react";
import InsightsPanel from "../shared/InsightsPanel";
import type { VideoData } from "../shared/metrics";
import type { YouTubeStats } from "../types";

const Popup = () => {
  const [ytStats, setYtStats] = useState<YouTubeStats | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Ask the active YouTube tab's content script for the current video's stats.
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) {
        setLoaded(true);
        return;
      }
      chrome.tabs.sendMessage(
        tabId,
        { type: "GET_YOUTUBE_STATS" },
        (response) => {
          void chrome.runtime.lastError; // no content script on non-YouTube tabs
          if (response) setYtStats(response as YouTubeStats);
          setLoaded(true);
        },
      );
    });
  }, []);

  const data: VideoData | null = ytStats && ytStats.isOnVideo ? ytStats : null;
  return <InsightsPanel data={data} loading={!loaded} variant="popup" />;
};

export default Popup;
