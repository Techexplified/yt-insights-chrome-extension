import { parseWatchHtml } from "../../shared/watchPage";
import { fetchChannelBaseline } from "../../shared/channelFeed";
import type { ChannelBaseline } from "../../shared/channelFeed";

export interface YouTubeVideoData {
  videoId: string;
  title: string;
  channelName: string;
  views: string;
  subscribers: string;
  thumbnailUrl: string;
  date: string;
  likes: string;
  comments: string; // '' = unknown
  baseline?: ChannelBaseline | null; // channel medians from the RSS feed (null = not enough data)
}

export const getVideoData = (): YouTubeVideoData | null => {
  try {
    // Try to get data from URL first to ensure we are on a video
    const params = new URLSearchParams(window.location.search);
    const videoId = params.get("v");

    if (!videoId) return null;

    // scrape DOM
    const titleElement = document.querySelector(
      "ytd-watch-metadata h1 yt-formatted-string",
    ) as HTMLElement;
    const channelElement = document.querySelector(
      "ytd-video-owner-renderer ytd-channel-name a",
    ) as HTMLElement;
    const viewsElement =
      document.querySelector(
        "ytd-video-view-count-renderer span.view-count-style",
      ) ||
      (document.querySelector(
        "ytd-video-view-count-renderer span.short-view-count",
      ) as HTMLElement);
    const subsElement = document.querySelector(
      "ytd-video-owner-renderer #owner-sub-count",
    ) as HTMLElement;

    // Likes Selector (Deep Search)
    // 1. New Segmented Button (2024)
    // 2. Classic formatted string
    // 3. Fallback to parsing aria-label of the like button itself
    const likeButton =
      document.querySelector(
        "like-button-view-model span.yt-core-attributed-string",
      ) ||
      document.querySelector(
        "ytd-toggle-button-renderer#segments-like-button yt-formatted-string",
      ) ||
      document.querySelector(
        "#top-level-buttons-computed > ytd-toggle-button-renderer:first-child #text",
      );

    let likes = (likeButton as HTMLElement)?.innerText || "";

    // Fallback: Check aria-label of the button container if text is empty
    if (!likes || likes === "0" || likes.trim() === "") {
      // Try to find the button container
      const likeBtnContainer =
        document.querySelector("like-button-view-model button") ||
        document.querySelector(
          "ytd-toggle-button-renderer#segments-like-button button",
        ) ||
        document.querySelector(
          "#top-level-buttons-computed > ytd-toggle-button-renderer:first-child a",
        ); // Old youtube

      const aria = likeBtnContainer?.getAttribute("aria-label");

      if (aria) {
        // Extract digits (including K/M/B or 1,234)
        // "12K likes" or "1,234 likes" or just "1.2M"
        // Regex: Match number + suffix
        const match = aria.match(/([0-9.,]+[K|M|B]?)/i);
        if (match) {
          likes = match[1];
        }
      }
    }

    likes = likes.trim() || "0";

    // Comment count. The comments section loads lazily, so this DOM read is only a fallback
    // for the fresh page fetch below ('' means unknown, '0' means comments are turned off).
    let comments = "";
    const commentsHeader =
      document.querySelector(
        "ytd-comments-header-renderer #count .count-text",
      ) ||
      document.querySelector("ytd-comments-header-renderer #count") ||
      document.querySelector("ytd-comments-entry-point-header-renderer #count");
    const commentsMatch =
      commentsHeader?.textContent?.match(/([\d.,]+[KMB]?)/i);
    if (commentsMatch) {
      comments = commentsMatch[1];
    } else if (
      /turned off/i.test(
        document.querySelector("ytd-comments#comments ytd-message-renderer")
          ?.textContent || "",
      )
    ) {
      comments = "0";
    }

    // Meta tags are NOT refreshed on YouTube's SPA navigation, so only trust them
    // when the page's own URL tags point at the current video.
    const pageUrl =
      document
        .querySelector('meta[property="og:url"]')
        ?.getAttribute("content") ||
      document.querySelector('link[rel="canonical"]')?.getAttribute("href") ||
      "";
    const metaFresh = pageUrl.includes(videoId);
    const dateMeta = metaFresh
      ? document.querySelector('meta[itemprop="uploadDate"]')
      : null;
    const countMeta = metaFresh
      ? document.querySelector('meta[itemprop="interactionCount"]')
      : null;

    const title =
      titleElement?.innerText ||
      (metaFresh
        ? document.querySelector('meta[name="title"]')?.getAttribute("content")
        : "") ||
      "";
    const channelName = channelElement?.innerText || "";

    // Views fallback
    const views =
      viewsElement?.textContent ||
      countMeta?.getAttribute("content") ||
      "0 views";
    let subscribers = subsElement?.innerText || "0 subscribers";

    const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    // Date scraping fallbacks
    let date = dateMeta?.getAttribute("content") || "";
    if (!date) {
      // Try visible text (e.g., "Oct 20, 2024")
      const dateTextElement =
        document.querySelector("#info-strings yt-formatted-string") ||
        document.querySelector("#description-inner #tooltip");
      if (dateTextElement) {
        // Heuristic: Just take the text. The UI will try to parse it.
        date = (dateTextElement as HTMLElement).innerText;
      }
    }

    // ---------------------------------------------------------
    // ROBUST FALLBACK: Scrape from script tag (ytInitialData)
    // ---------------------------------------------------------

    if (
      likes === "0" ||
      views === "0 views" ||
      !date ||
      subscribers === "0 subscribers"
    ) {
      try {
        const scripts = document.querySelectorAll("script");
        let initialData = null;

        for (let i = 0; i < scripts.length; i++) {
          if (scripts[i].textContent?.includes("ytInitialData")) {
            const content = scripts[i].textContent || "";
            const match = content.match(/var ytInitialData = ({.*?});/);
            if (match && match[1]) {
              initialData = JSON.parse(match[1]);
              break;
            }
          }
        }

        const str = initialData ? JSON.stringify(initialData) : "";
        const initialId = str.match(
          /"currentVideoEndpoint":[\s\S]{0,600}?"watchEndpoint":\{"videoId":"([\w-]{11})"/,
        )?.[1];
        if (initialData && initialId === videoId) {
          if (likes === "0") {
            const likeMatch = str.match(
              /"accessibilityData":{"label":"([\d,.]+[KMB]?)\s+likes"/,
            );
            if (likeMatch) likes = likeMatch[1];
          }
          if (!date) {
            const dateMatch = str.match(/"dateText":{"simpleText":"(.*?)"}/);
            if (dateMatch) date = dateMatch[1];
          }
          if (subscribers === "0 subscribers") {
            const subMatch = str.match(
              /"subscriberCountText":\{"accessibility":\{"accessibilityData":\{"label":"([\d,.]+[KMB]?)\s+subscribers"/,
            );
            if (subMatch) subscribers = subMatch[1];
          }
        }
      } catch (err) {
        console.log("ViewStack: Error parsing ytInitialData", err);
      }
    }

    return {
      videoId,
      title,
      channelName,
      views,
      subscribers,
      thumbnailUrl,
      date,
      likes: likes || "0",
      comments,
    };
  } catch (e) {
    console.error("Error scraping YouTube data:", e);
    return null;
  }
};

// ---------------------------------------------------------
// Fresh data: fetches this video's watch page so date/views/likes/subscribers are always
// for the video in the URL (DOM + meta tags can lag behind after in-app navigation).
// ---------------------------------------------------------
type Remote = ReturnType<typeof parseWatchHtml>;
const remoteCache = new Map<string, { at: number; data: Remote }>();
const CACHE_MS = 2 * 60 * 1000;

const currentVideoId = () =>
  new URLSearchParams(window.location.search).get("v");

export const getFreshVideoData = async (): Promise<YouTubeVideoData | null> => {
  const dom = getVideoData();
  if (!dom) return null;
  const id = dom.videoId;

  let remote: Remote | undefined;
  const hit = remoteCache.get(id);
  if (hit && Date.now() - hit.at < CACHE_MS) {
    remote = hit.data;
  } else {
    try {
      const res = await fetch(`/watch?v=${encodeURIComponent(id)}`, {
        credentials: "same-origin",
      });
      if (res.ok) {
        remote = parseWatchHtml(await res.text());
        remoteCache.set(id, { at: Date.now(), data: remote });
      }
    } catch (err) {
      console.log("ViewStack: fresh fetch failed, using page data", err);
    }
  }

  // User navigated to another video while we were fetching: start over for the new one.
  if (currentVideoId() !== id) return getFreshVideoData();
  if (!remote) return dom;

  const good = (v: string) => !!v && v !== "0";
  const comments = remote.comments || dom.comments;
  if (!comments)
    console.log(
      "ViewStack: comment count not found, engagement rate will show N/A",
    );
  const baseline = remote.channelId
    ? await fetchChannelBaseline(remote.channelId, id)
    : null;
  if (!baseline)
    console.log(
      "ViewStack: no channel baseline (feed unavailable or fewer than 3 older videos)",
    );
  // The user may have navigated while the feed was loading.
  if (currentVideoId() !== id) return getFreshVideoData();

  return {
    ...dom,
    title: remote.title || dom.title,
    channelName: remote.channelName || dom.channelName,
    views: good(remote.views) ? remote.views : dom.views,
    likes: good(remote.likes) ? remote.likes : dom.likes,
    subscribers: good(remote.subscribers)
      ? remote.subscribers
      : dom.subscribers,
    date: remote.date || dom.date,
    comments,
    baseline,
  };
};
