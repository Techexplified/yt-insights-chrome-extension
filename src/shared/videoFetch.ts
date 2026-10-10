// Fetches and parses any video's watch page by id (used for Video B in the Compare tab).
// It must run inside the YouTube page (content script) so the request is same-origin and carries the same
// cookies/HTML as the page you are watching. The popup reaches it by messaging the active tab.
import { extractVideoId, parseWatchHtml } from './watchPage';
import type { WatchPageData } from './watchPage';
import { fetchChannelBaseline } from './channelFeed';
import type { VideoData } from './metrics';

export type FetchVideoResult = { ok: true; data: VideoData } | { ok: false; error: string };

export const fetchVideoDataById = async (input: string): Promise<FetchVideoResult> => {
    const id = extractVideoId(input);
    if (!id) return { ok: false, error: "That doesn't look like a YouTube video link." };

    let page: WatchPageData;
    try {
        const res = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(id)}`, { credentials: 'same-origin' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        page = parseWatchHtml(await res.text());
    } catch (err) {
        console.log('ViewStack: could not fetch video page', err);
        return { ok: false, error: "Couldn't reach YouTube. Check your connection and try again." };
    }
    if (!page.title && !page.views) {
        return { ok: false, error: 'That video is unavailable (private, deleted or region-blocked).' };
    }

    const baseline = page.channelId ? await fetchChannelBaseline(page.channelId, id) : null;

    // Helps diagnose "N/A" values: lists what could not be read from this video's page.
    const missing = [
        !page.likes && 'likes', !page.subscribers && 'subscribers', !page.comments && 'comments',
        !page.channelId && 'channelId', !page.channelName && 'channelName', !page.date && 'date',
        !baseline && 'channel baseline',
    ].filter(Boolean);
    if (missing.length) console.log(`ViewStack: Video B (${id}) not found in page data: ${missing.join(', ')}`);

    return {
        ok: true,
        data: {
            videoId: id,
            title: page.title || 'Unknown video',
            channelName: page.channelName,
            views: page.views || '0',
            likes: page.likes,
            subscribers: page.subscribers,
            comments: page.comments,
            date: page.date,
            thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
            baseline,
        },
    };
};

// Overlay (runs inside the YouTube page): fetch directly. Popup (extension page): ask the active YouTube tab.
export const requestVideoData = (input: string): Promise<FetchVideoResult> => {
    if (location.protocol.startsWith('http')) return fetchVideoDataById(input);
    return new Promise(resolve => {
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            const tabId = tabs[0]?.id;
            if (!tabId) { resolve({ ok: false, error: 'Open a YouTube tab to compare videos.' }); return; }
            chrome.tabs.sendMessage(tabId, { type: 'FETCH_VIDEO_BY_ID', payload: input }, (res?: FetchVideoResult) => {
                void chrome.runtime.lastError;
                resolve(res ?? { ok: false, error: 'Reload the YouTube tab and try again.' });
            });
        });
    });
};
