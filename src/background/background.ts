import type { ExtensionMessage, ExtensionState, AnyEvent } from '../types';

let state: ExtensionState = {
    isActive: true,
    eventCount: 0,
};

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
    console.log('ViewStack Analytics Extension Installed');
    // Initialize state or load from storage if we were persisting (not for this MVP)
});

// Listen for messages
chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
    if (message.type === 'ANALYTICS_EVENT') {
        if (state.isActive) {
            const event = message.payload as AnyEvent;
            console.log('📈 [Analytics Received]:', event);
            state.eventCount++;

            // confirm receipt
            sendResponse({ received: true });
        } else {
            console.log('⏸️ [Analytics Ignored] (Paused):', message.payload);
            sendResponse({ received: false, reason: 'paused' });
        }
    } else if (message.type === 'GET_STATS') {
        sendResponse(state);
    } else if (message.type === 'TOGGLE_TRACKING') {
        state.isActive = !state.isActive;
        console.log('🔄 Tracking Toggled:', state.isActive ? 'Active' : 'Paused');
        sendResponse(state);
    } else if (message.type === 'FETCH_VIDEO_DATA') {
        const url = message.payload as string;
        fetch(url)
            .then(res => res.text())
            .then(html => {
                try {
                    // Extract Data using Regex
                    const titleMatch = html.match(/<meta name="title" content="(.*?)">/);
                    const title = titleMatch ? titleMatch[1] : 'Unknown Video';

                    const viewMatch = html.match(/"viewCount":"(\d+)"/);
                    const viewCount = viewMatch ? viewMatch[1] : '0';

                    // Upload Date
                    const dateMatch = html.match(/"uploadDate":"(.*?)"/);
                    const date = dateMatch ? dateMatch[1] : '';

                    // Likes (Tricky in raw HTML, often inside ytInitialData)
                    // We look for the label "X likes" in accessibility data
                    let likes = '0';
                    // Look for "label":"12K likes" pattern often found in like button accessibility data
                    const likeMatch = html.match(/"accessibilityData":{"label":"([\d,.]+[KMB]?)\s+likes"/);
                    if (likeMatch) {
                        likes = likeMatch[1];
                    }

                    // Subscribers (from owner dict)
                    let subscribers = '0';
                    const subMatch = html.match(/"subscriberCountText":\{"accessibility":\{"accessibilityData":\{"label":"([\d,.]+[KMB]?)\s+subscribers"/);
                    if (subMatch) {
                        subscribers = subMatch[1];
                    }

                    // Thumbnail
                    const thumbMatch = html.match(/<meta property="og:image" content="(.*?)">/);
                    const thumbnailUrl = thumbMatch ? thumbMatch[1] : '';

                    // Channel
                    const channelMatch = html.match(/"owner":{"videoOwnerRenderer":{"thumbnail":.*?,"title":{"runs":\[{"text":"(.*?)"}/);
                    const channelName = channelMatch ? channelMatch[1] : '';

                    sendResponse({
                        success: true,
                        data: {
                            views: viewCount,
                            likes,
                            subscribers,
                            title,
                            date,
                            thumbnailUrl,
                            channelName,
                            videoId: url // simplifying
                        }
                    });
                } catch (e) {
                    console.error('Parse Error', e);
                    sendResponse({ success: false, error: 'Failed to parse video data' });
                }
            })
            .catch(err => {
                console.error('Fetch Error', err);
                sendResponse({ success: false, error: 'Failed to fetch video' });
            });

        return true; // Async response
    }

    // Return true to indicate we wish to send a response asynchronously (even though we're sync here, it's good practice)
    return true;
});

console.log('Background Service Worker Running');
