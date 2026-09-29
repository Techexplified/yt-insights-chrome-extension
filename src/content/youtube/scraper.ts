export interface YouTubeVideoData {
    videoId: string;
    title: string;
    channelName: string;
    views: string;
    subscribers: string;
    thumbnailUrl: string;
    date: string;
    likes: string;
}

export const getVideoData = (): YouTubeVideoData | null => {
    try {
        // Try to get data from URL first to ensure we are on a video
        const params = new URLSearchParams(window.location.search);
        const videoId = params.get('v');

        if (!videoId) return null;

        // scrape DOM
        const titleElement = document.querySelector('ytd-watch-metadata h1 yt-formatted-string') as HTMLElement;
        const channelElement = document.querySelector('ytd-video-owner-renderer ytd-channel-name a') as HTMLElement;
        const viewsElement = document.querySelector('ytd-video-view-count-renderer span.view-count-style') || document.querySelector('ytd-video-view-count-renderer span.short-view-count') as HTMLElement;
        const subsElement = document.querySelector('ytd-video-owner-renderer #owner-sub-count') as HTMLElement;

        // Likes Selector (Deep Search)
        // 1. New Segmented Button (2024)
        // 2. Classic formatted string
        // 3. Fallback to parsing aria-label of the like button itself
        const likeButton =
            document.querySelector('like-button-view-model span.yt-core-attributed-string') ||
            document.querySelector('ytd-toggle-button-renderer#segments-like-button yt-formatted-string') ||
            document.querySelector('#top-level-buttons-computed > ytd-toggle-button-renderer:first-child #text');

        let likes = (likeButton as HTMLElement)?.innerText || '';

        // Fallback: Check aria-label of the button container if text is empty
        if (!likes || likes === '0' || likes.trim() === '') {
            // Try to find the button container
            const likeBtnContainer = document.querySelector('like-button-view-model button') ||
                document.querySelector('ytd-toggle-button-renderer#segments-like-button button') ||
                document.querySelector('#top-level-buttons-computed > ytd-toggle-button-renderer:first-child a'); // Old youtube

            const aria = likeBtnContainer?.getAttribute('aria-label');

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

        likes = likes.trim() || '0';

        // Meta tags for robust data
        const thumbMeta = document.querySelector('meta[property="og:image"]');
        const dateMeta = document.querySelector('meta[itemprop="uploadDate"]');

        const title = titleElement?.innerText || document.querySelector('meta[name="title"]')?.getAttribute('content') || '';
        const channelName = channelElement?.innerText || '';

        // Views fallback
        const views = viewsElement?.textContent || document.querySelector('meta[itemprop="interactionCount"]')?.getAttribute('content') || '0 views';
        let subscribers = subsElement?.innerText || '0 subscribers';

        const thumbnailUrl = thumbMeta?.getAttribute('content') || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

        // Date scraping fallbacks
        let date = dateMeta?.getAttribute('content') || '';
        if (!date) {
            // Try visible text (e.g., "Oct 20, 2024")
            const dateTextElement = document.querySelector('#info-strings yt-formatted-string') ||
                document.querySelector('#description-inner #tooltip');
            if (dateTextElement) {
                // Heuristic: Just take the text. The UI will try to parse it.
                date = (dateTextElement as HTMLElement).innerText;
            }
        }

        // ---------------------------------------------------------
        // ROBUST FALLBACK: Scrape from script tag (ytInitialData)
        // ---------------------------------------------------------

        if (likes === '0' || views === '0 views' || !date || subscribers === '0 subscribers') {
            try {
                const scripts = document.querySelectorAll('script');
                let initialData = null;

                for (let i = 0; i < scripts.length; i++) {
                    if (scripts[i].textContent?.includes('ytInitialData')) {
                        const content = scripts[i].textContent || '';
                        const match = content.match(/var ytInitialData = ({.*?});/);
                        if (match && match[1]) {
                            initialData = JSON.parse(match[1]);
                            break;
                        }
                    }
                }

                if (initialData) {
                    const str = JSON.stringify(initialData);
                    if (likes === '0') {
                        const likeMatch = str.match(/"accessibilityData":{"label":"([\d,.]+[KMB]?)\s+likes"/);
                        if (likeMatch) likes = likeMatch[1];
                    }
                    if (!date) {
                        const dateMatch = str.match(/"dateText":{"simpleText":"(.*?)"}/);
                        if (dateMatch) date = dateMatch[1];
                    }
                    if (subscribers === '0 subscribers') {
                        const subMatch = str.match(/"subscriberCountText":\{"accessibility":\{"accessibilityData":\{"label":"([\d,.]+[KMB]?)\s+subscribers"/);
                        if (subMatch) subscribers = subMatch[1];
                    }
                }
            } catch (err) {
                console.log('ViewStack: Error parsing ytInitialData', err);
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
            likes: likes || '0'
        };
    } catch (e) {
        console.error('Error scraping YouTube data:', e);
        return null;
    }
};
