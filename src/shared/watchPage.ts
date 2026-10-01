// Parses a YouTube watch-page HTML document (server-rendered, so always matches the URL requested).
// Shared by the background worker (Compare tab) and the content script (current video).

export interface WatchPageData {
    title: string;
    views: string;        // raw digits, e.g. "163012"
    date: string;         // ISO upload date
    likes: string;
    subscribers: string;
    channelName: string;
}

const decodeEntities = (s: string): string =>
    s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>');

// Missing fields are returned as empty strings so callers can fall back to other sources.
export const parseWatchHtml = (html: string): WatchPageData => {
    const titleMatch = html.match(/<meta name="title" content="(.*?)">/);
    const viewMatch = html.match(/"viewCount":"(\d+)"/);
    const dateMatch = html.match(/"uploadDate":"(.*?)"/);
    const likeMatch = html.match(/"accessibilityData":{"label":"([\d,.]+[KMB]?)\s+likes"/);
    const subMatch = html.match(/"subscriberCountText":\{"accessibility":\{"accessibilityData":\{"label":"([\d,.]+[KMB]?)\s+subscribers"/);
    const channelMatch = html.match(/"owner":{"videoOwnerRenderer":{"thumbnail":.*?,"title":{"runs":\[{"text":"(.*?)"}/);

    return {
        title: titleMatch ? decodeEntities(titleMatch[1]) : '',
        views: viewMatch ? viewMatch[1] : '',
        date: dateMatch ? dateMatch[1] : '',
        likes: likeMatch ? likeMatch[1] : '',
        subscribers: subMatch ? subMatch[1] : '',
        channelName: channelMatch ? decodeEntities(channelMatch[1]) : '',
    };
};
