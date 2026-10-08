// Channel baseline from YouTube's public RSS feed:
//   https://www.youtube.com/feeds/videos.xml?channel_id=UC...
// The feed lists the channel's latest ~15 uploads with exact publish dates and view counts, so no API key
// or backend is needed. Regex parsing (not DOMParser) so this also runs inside the background service worker.

export interface ChannelBaseline {
    medianViews: number;        // median total views of the channel's recent videos
    medianViewsPerDay: number;  // median views/day of those videos
    sampleSize: number;         // how many videos the medians are based on
}

export interface FeedVideo { videoId: string; published: number; views: number }

const DAY_MS = 86400000;
const MIN_AGE_DAYS = 3;      // skip very new uploads: their view counts are still ramping up
const MIN_SAMPLE = 3;        // fewer videos than this is not a meaningful baseline
const FEED_CACHE_MS = 30 * 60 * 1000;

export const parseChannelFeed = (xml: string): FeedVideo[] => {
    const out: FeedVideo[] = [];
    for (const entry of xml.split('<entry>').slice(1)) {
        const videoId = entry.match(/<yt:videoId>([\w-]{11})<\/yt:videoId>/)?.[1];
        const published = entry.match(/<published>([^<]+)<\/published>/)?.[1];
        const views = entry.match(/<media:statistics views="(\d+)"/)?.[1];
        const t = published ? Date.parse(published) : NaN;
        if (videoId && views !== undefined && !isNaN(t)) out.push({ videoId, published: t, views: +views });
    }
    return out;
};

const median = (nums: number[]): number => {
    if (!nums.length) return 0;
    const s = [...nums].sort((a, b) => a - b);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// Median, not average, so one viral hit doesn't skew the baseline.
export const computeBaseline = (videos: FeedVideo[], excludeVideoId: string, now = Date.now()): ChannelBaseline | null => {
    const eligible = videos.filter(v => v.videoId !== excludeVideoId && now - v.published >= MIN_AGE_DAYS * DAY_MS);
    if (eligible.length < MIN_SAMPLE) return null;
    return {
        medianViews: median(eligible.map(v => v.views)),
        medianViewsPerDay: median(eligible.map(v => v.views / Math.max(1, (now - v.published) / DAY_MS))),
        sampleSize: eligible.length,
    };
};

const feedCache = new Map<string, { at: number; videos: FeedVideo[] }>();

export const fetchChannelBaseline = async (channelId: string, excludeVideoId: string): Promise<ChannelBaseline | null> => {
    try {
        let videos = feedCache.get(channelId);
        if (!videos || Date.now() - videos.at > FEED_CACHE_MS) {
            const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`);
            if (!res.ok) return null;
            videos = { at: Date.now(), videos: parseChannelFeed(await res.text()) };
            feedCache.set(channelId, videos);
        }
        return computeBaseline(videos.videos, excludeVideoId);
    } catch (err) {
        console.log('ViewStack: channel feed unavailable', err);
        return null;
    }
};
