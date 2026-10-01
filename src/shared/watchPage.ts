// Parses a YouTube watch-page HTML document (server-rendered, so always matches the URL requested).
// Shared by the background worker (Compare tab) and the content script (current video).

export interface WatchPageData {
  title: string;
  views: string; // raw digits, e.g. "163012"
  date: string; // ISO upload date
  likes: string;
  subscribers: string;
  channelName: string;
}

const decodeEntities = (s: string): string =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

// Unescape JSON string escapes and reject anything that doesn't look like a channel name,
// so a bad match can never leak raw page data into the UI.
const cleanChannel = (raw: string): string => {
  let name = raw;
  try {
    name = JSON.parse(`"${raw}"`);
  } catch {
    /* keep raw */
  }
  name = decodeEntities(name).trim();
  return name.length > 0 && name.length <= 80 && !/[{}]|":/.test(name)
    ? name
    : "";
};

// Missing fields are returned as empty strings so callers can fall back to other sources.
export const parseWatchHtml = (html: string): WatchPageData => {
  const titleMatch = html.match(/<meta name="title" content="(.*?)">/);
  const viewMatch = html.match(/"viewCount":"(\d+)"/);
  const dateMatch = html.match(/"uploadDate":"(.*?)"/);
  const likeMatch = html.match(
    /"accessibilityData":{"label":"([\d,.]+[KMB]?)\s+likes"/,
  );
  const subMatch = html.match(
    /"subscriberCountText":\{"accessibility":\{"accessibilityData":\{"label":"([\d,.]+[KMB]?)\s+subscribers"/,
  );
  // Stop at the closing quote of the "text" value (the run object has more keys after it).
  const channelMatch = html.match(
    /"owner":\{"videoOwnerRenderer":\{"thumbnail":[\s\S]{0,3000}?"title":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/,
  );

  return {
    title: titleMatch ? decodeEntities(titleMatch[1]) : "",
    views: viewMatch ? viewMatch[1] : "",
    date: dateMatch ? dateMatch[1] : "",
    likes: likeMatch ? likeMatch[1] : "",
    subscribers: subMatch ? subMatch[1] : "",
    channelName: channelMatch ? cleanChannel(channelMatch[1]) : "",
  };
};
