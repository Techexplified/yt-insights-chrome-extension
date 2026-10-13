// Channel baseline from YouTube's public RSS feed:
//   https://www.youtube.com/feeds/videos.xml?channel_id=UC...
// The feed lists the channel's latest ~15 uploads with exact publish dates and view counts, so no API key
// or backend is needed. Regex parsing (not DOMParser) so this also runs inside the background service worker.

export interface ChannelBaseline {
  medianViews: number; // median total views of the channel's recent videos
  medianViewsPerDay: number; // median views/day of those videos
  sampleSize: number; // how many videos the medians are based on
}

export interface FeedVideo {
  videoId: string;
  published: number;
  views: number;
}

const DAY_MS = 86400000;
const MIN_AGE_DAYS = 3; // skip very new uploads: their view counts are still ramping up
const MIN_SAMPLE = 3; // fewer videos than this is not a meaningful baseline

export const parseChannelFeed = (xml: string): FeedVideo[] => {
  const out: FeedVideo[] = [];
  for (const entry of xml.split(/<entry[\s>]/).slice(1)) {
    const videoId =
      entry.match(/<yt:videoId>([\w-]{11})<\/yt:videoId>/)?.[1] ??
      entry.match(/<id>yt:video:([\w-]{11})<\/id>/)?.[1];
    const published = entry.match(/<published>([^<]+)<\/published>/)?.[1];
    const views = entry.match(
      /<media:statistics[^>]*\sviews=["'](\d+)["']/,
    )?.[1];
    const t = published ? Date.parse(published) : NaN;
    if (videoId && views !== undefined && !isNaN(t))
      out.push({ videoId, published: t, views: +views });
  }
  return out;
};

const median = (nums: number[]): number => {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const eligibleVideos = (
  videos: FeedVideo[],
  excludeVideoId: string,
  now: number,
) =>
  videos.filter(
    (v) =>
      v.videoId !== excludeVideoId &&
      now - v.published >= MIN_AGE_DAYS * DAY_MS,
  );

// Median, not average, so one viral hit doesn't skew the baseline.
export const computeBaseline = (
  videos: FeedVideo[],
  excludeVideoId: string,
  now = Date.now(),
): ChannelBaseline | null => {
  const eligible = eligibleVideos(videos, excludeVideoId, now);
  if (eligible.length < MIN_SAMPLE) return null;
  return {
    medianViews: median(eligible.map((v) => v.views)),
    medianViewsPerDay: median(
      eligible.map((v) => v.views / Math.max(1, (now - v.published) / DAY_MS)),
    ),
    sampleSize: eligible.length,
  };
};

// ---------------------------------------------------------------------------------------------
// Fallback source: the channel's "Videos" page. YouTube's RSS feed returns 404/500 for some channels, so when it
// fails we read the same ~30 latest uploads from the page itself. It only shows rounded views ("1.4M views") and
// relative dates ("3 months ago"), so the numbers are approximate, but the median is still meaningful.
// Shorts live in a different tab, so they are not included here.
// ---------------------------------------------------------------------------------------------
const UNIT_DAYS: Record<string, number> = {
  second: 1 / 86400,
  minute: 1 / 1440,
  hour: 1 / 24,
  day: 1,
  week: 7,
  month: 30,
  year: 365,
};

// "3 months ago" / "Streamed 2 days ago" -> days (approximate)
export const relativeAgeDays = (text: string): number | null => {
  const m = text.match(
    /(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/i,
  );
  return m ? +m[1] * UNIT_DAYS[m[2].toLowerCase()] : null;
};

// "1.4M views" / "534 views" / "1,234 views" / "No views" -> number
export const parseViewsText = (text: string): number | null => {
  if (/^\s*no views/i.test(text)) return 0;
  const m = text.match(/([\d,.]+)\s*([KMB])?\s+views?/i);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/,/g, ""));
  if (isNaN(n)) return null;
  const mult: Record<string, number> = { K: 1e3, M: 1e6, B: 1e9 };
  return Math.round(n * (mult[(m[2] || "").toUpperCase()] ?? 1));
};

// Handles both layouts YouTube uses for video cards: classic "videoRenderer" and newer "lockupViewModel".
export const parseChannelVideosPage = (
  html: string,
  now = Date.now(),
): FeedVideo[] => {
  const out: FeedVideo[] = [];
  const seen = new Set<string>();
  const starts = [
    ...html.matchAll(/"(?:videoRenderer|lockupViewModel)":\{/g),
  ].map((m) => m.index as number);
  starts.forEach((start, i) => {
    const seg = html.slice(
      start,
      Math.min(starts[i + 1] ?? Infinity, start + 8000),
    );
    const videoId = seg.match(/"(?:videoId|contentId)":"([\w-]{11})"/)?.[1];
    const viewsText =
      seg.match(/"viewCountText":\{"simpleText":"([^"]+)"/)?.[1] ??
      seg.match(/"content":"([^"]*\bviews?)"/i)?.[1] ??
      (/"content":"No views"/i.test(seg) ? "No views" : undefined);
    const ageText =
      seg.match(/"publishedTimeText":\{"simpleText":"([^"]+)"/)?.[1] ??
      seg.match(/"content":"([^"]*\bago)"/i)?.[1];
    if (!videoId || !viewsText || !ageText || seen.has(videoId)) return;
    const views = parseViewsText(viewsText);
    const days = relativeAgeDays(ageText);
    if (views === null || days === null) return;
    seen.add(videoId);
    out.push({ videoId, published: now - days * DAY_MS, views });
  });
  return out.slice(0, 30);
};

// ---------------------------------------------------------------------------------------------
// Fetching + caching. The feed is remembered in chrome.storage.local (a few KB per channel) so we
// don't hit YouTube on every page load, and an older copy is used if a later fetch fails.
// ---------------------------------------------------------------------------------------------
const CACHE_KEY = "viewstat_feed_cache";
const FRESH_MS = 6 * 60 * 60 * 1000; // reuse a saved feed for 6 hours
const STALE_OK_MS = 14 * 24 * 60 * 60 * 1000; // if YouTube is failing, a copy up to 14 days old is still useful
const MAX_CHANNELS = 40;

type CacheEntry = { at: number; videos: FeedVideo[] };
type Cache = Record<string, CacheEntry>;

const readCache = (): Promise<Cache> =>
  new Promise((resolve) => {
    try {
      chrome.storage.local.get(CACHE_KEY, (res) => {
        void chrome.runtime.lastError;
        resolve((res && res[CACHE_KEY]) || {});
      });
    } catch {
      resolve({});
    }
  });

const writeCache = (cache: Cache): Promise<void> =>
  new Promise((resolve) => {
    try {
      // keep only the most recently fetched channels
      const keys = Object.keys(cache);
      if (keys.length > MAX_CHANNELS) {
        keys
          .sort((a, b) => cache[a].at - cache[b].at)
          .slice(0, keys.length - MAX_CHANNELS)
          .forEach((k) => delete cache[k]);
      }
      chrome.storage.local.set({ [CACHE_KEY]: cache }, () => {
        void chrome.runtime.lastError;
        resolve();
      });
    } catch {
      resolve();
    }
  });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type FetchResult = {
  videos?: FeedVideo[];
  reason?: string;
  transient?: boolean;
};

const fetchFeedOnce = async (channelId: string): Promise<FetchResult> => {
  try {
    const res = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`,
    );
    if (!res.ok)
      return { reason: `HTTP ${res.status}`, transient: res.status >= 500 };
    const videos = parseChannelFeed(await res.text());
    return videos.length
      ? { videos }
      : { reason: "the feed contained no readable videos" };
  } catch {
    return { reason: "network error", transient: true };
  }
};

const fetchChannelPageOnce = async (
  channelId: string,
): Promise<FetchResult> => {
  try {
    const res = await fetch(
      `https://www.youtube.com/channel/${encodeURIComponent(channelId)}/videos`,
      { credentials: "same-origin" },
    );
    if (!res.ok) return { reason: `HTTP ${res.status}` };
    const videos = parseChannelVideosPage(await res.text());
    return videos.length
      ? { videos }
      : { reason: "no videos could be read from the page" };
  } catch {
    return { reason: "network error" };
  }
};

export const fetchChannelBaseline = async (
  channelId: string,
  excludeVideoId: string,
): Promise<ChannelBaseline | null> => {
  const cache = await readCache();
  const saved = cache[channelId];
  let videos: FeedVideo[] | null = null;

  if (saved && Date.now() - saved.at < FRESH_MS) {
    videos = saved.videos;
  } else {
    let result = await fetchFeedOnce(channelId);
    if (!result.videos && result.transient) {
      await sleep(600);
      result = await fetchFeedOnce(channelId);
    } // one retry for 5xx / network errors
    if (!result.videos) {
      // YouTube's RSS feed is unreliable for some channels: read the channel's Videos page instead.
      const page = await fetchChannelPageOnce(channelId);
      if (page.videos) {
        console.log(
          `ViewStack: channel feed failed (${result.reason}); used the channel's Videos page instead`,
        );
        result = page;
      } else {
        result = {
          reason: `feed: ${result.reason}; channel page: ${page.reason}`,
        };
      }
    }
    if (result.videos) {
      videos = result.videos;
      cache[channelId] = { at: Date.now(), videos };
      await writeCache(cache);
    } else if (saved && Date.now() - saved.at < STALE_OK_MS) {
      videos = saved.videos;
      console.log(
        `ViewStack: channel feed failed (${result.reason}); using a saved copy`,
      );
    } else {
      console.log(
        `ViewStack: channel feed unavailable for ${channelId}: ${result.reason}`,
      );
      return null;
    }
  }

  const baseline = computeBaseline(videos, excludeVideoId);
  if (!baseline) {
    console.log(
      `ViewStack: not enough videos for a channel baseline (${eligibleVideos(videos, excludeVideoId, Date.now()).length} usable, need ${MIN_SAMPLE})`,
    );
  }
  return baseline;
};
