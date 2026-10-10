// Parses a YouTube watch-page HTML document (server-rendered, so always matches the URL requested).
// Shared by the background worker (Compare tab) and the content script (current video).

// Video id from any YouTube link style: watch?v=, youtu.be/, /shorts/, /embed/, /live/, m. and music. hosts,
// links with extra params (?si=, &t=, &list=), or a bare 11-character id. Returns '' if none is found.
export const extractVideoId = (input: string): string => {
  const s = (input || "").trim();
  const isId = (v: string | null | undefined): v is string =>
    !!v && /^[\w-]{11}$/.test(v);
  if (isId(s)) return s;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    const host = u.hostname.replace(/^(www|m|music)\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.split("/")[1];
      return isId(id) ? id : "";
    }
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      const v = u.searchParams.get("v");
      if (isId(v)) return v;
      const m = u.pathname.match(/^\/(?:shorts|embed|live|v)\/([\w-]{11})/);
      if (m) return m[1];
    }
  } catch {
    /* not a URL */
  }
  return "";
};

export interface WatchPageData {
  title: string;
  views: string; // raw digits, e.g. "163012"
  date: string; // ISO upload date
  likes: string;
  subscribers: string;
  channelName: string;
  channelId: string; // 'UC...' (needed for the channel RSS feed)
  comments: string; // '' = unknown, '0' = none / comments turned off
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

// Where YouTube puts the comment count in the page data (tried in order; formats vary by layout).
const NUM = "([\\d,.]+[KMB]?)";
const COMMENT_PATTERNS: RegExp[] = [
  new RegExp(
    `"commentsEntryPointHeaderRenderer":[\\s\\S]{0,2500}?"commentCount":\\{"simpleText":"${NUM}"`,
  ),
  new RegExp(
    `"commentsEntryPointHeaderRenderer":[\\s\\S]{0,2500}?"contextualInfo":\\{"runs":\\[\\{"text":"${NUM}"`,
  ),
  new RegExp(
    `"engagementPanelTitleHeaderRenderer":\\{"title":\\{"runs":\\[\\{"text":"Comments"\\}\\][\\s\\S]{0,400}?"contextualInfo":\\{"runs":\\[\\{"text":"${NUM}"`,
  ),
  new RegExp(
    `"commentsHeaderRenderer":[\\s\\S]{0,1500}?"countText":\\{"runs":\\[\\{"text":"${NUM}"`,
  ),
  new RegExp(`"commentCount":\\{"simpleText":"${NUM}"\\}`),
];

const CHANNEL_ID_PATTERNS: RegExp[] = [
  /"videoDetails":\{[\s\S]{0,4000}?"channelId":"(UC[\w-]{22})"/,
  /"externalChannelId":"(UC[\w-]{22})"/,
  /itemprop="channelId" content="(UC[\w-]{22})"/,
];

const parseChannelId = (html: string): string => {
  for (const p of CHANNEL_ID_PATTERNS) {
    const m = html.match(p);
    if (m) return m[1];
  }
  return "";
};

const parseCommentCount = (html: string): string => {
  for (const p of COMMENT_PATTERNS) {
    const m = html.match(p);
    if (m) return m[1];
  }
  // Comments disabled by the creator: that is a real zero, not "unknown".
  if (/Comments are turned off/i.test(html)) return "0";
  return "";
};

const firstMatch = (html: string, patterns: RegExp[]): string => {
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return m[1];
  }
  return "";
};

// YouTube has changed the like button / owner markup several times, so try each known shape in order.
const LIKE_PATTERNS: RegExp[] = [
  /"accessibilityData":\{"label":"([\d,.]+[KMB]?)\s+likes"/,
  /like this video along with ([\d,]+) other people/i,
  /"likeCountIfIndifferent":\{"content":"([\d,.]+[KMB]?)"/,
  /"likeCountIfLiked":\{"content":"([\d,.]+[KMB]?)"/,
  /"likeCount":"(\d+)"/,
];
const SUBSCRIBER_PATTERNS: RegExp[] = [
  /"subscriberCountText":\{[^}]*?"(?:simpleText|label)":"([\d,.]+[KMB]?)\s+subscribers?/i,
  /"subscriberCountText":"([\d,.]+[KMB]?)\s+subscribers?/i,
  /"content":"([\d,.]+[KMB]?)\s+subscribers?"/i,
];

// The owner's subscriber count normally sits in one "subscriberCountText" object holding BOTH a spoken-out label
// ("869 thousand subscribers") and the short text ("869K subscribers"), in either order. Look inside that object.
const SPELLED_UNITS: Record<string, string> = {
  thousand: "K",
  million: "M",
  billion: "B",
};

const parseSubscribers = (html: string): string => {
  const i = html.indexOf('"subscriberCountText"');
  if (i >= 0) {
    const win = html.slice(i, i + 600);
    const short = win.match(/([\d,.]+[KMB]?)\s+subscribers?/i);
    if (short) return short[1];
    const spelled = win.match(
      /([\d,.]+)\s+(thousand|million|billion)\s+subscribers?/i,
    );
    if (spelled) return spelled[1] + SPELLED_UNITS[spelled[2].toLowerCase()];
  }
  return firstMatch(html, SUBSCRIBER_PATTERNS); // other layouts (e.g. channel-header style)
};

// Missing fields are returned as empty strings so callers can fall back to other sources.
export const parseWatchHtml = (html: string): WatchPageData => {
  const titleMatch = html.match(/<meta name="title" content="(.*?)">/);
  const viewMatch = html.match(/"viewCount":"(\d+)"/);
  const dateMatch = html.match(/"uploadDate":"(.*?)"/);
  // Stop at the closing quote of the "text" value (the run object has more keys after it).
  const channelMatch = html.match(
    /"owner":\{"videoOwnerRenderer":\{"thumbnail":[\s\S]{0,3000}?"title":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/,
  );

  return {
    title: titleMatch ? decodeEntities(titleMatch[1]) : "",
    views: viewMatch ? viewMatch[1] : "",
    date: dateMatch ? dateMatch[1] : "",
    likes: firstMatch(html, LIKE_PATTERNS),
    subscribers: parseSubscribers(html),
    channelName: channelMatch ? cleanChannel(channelMatch[1]) : "",
    comments: parseCommentCount(html),
    channelId: parseChannelId(html),
  };
};
