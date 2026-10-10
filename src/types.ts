// Shared interfaces for the extension

export interface AnalyticsEvent {
  type: "page_view" | "click";
  timestamp: number;
  url: string;
}

export interface PageViewEvent extends AnalyticsEvent {
  type: "page_view";
  path: string;
  title: string;
}

export interface ClickEvent extends AnalyticsEvent {
  type: "click";
  tagName: string;
  text?: string;
}

export type AnyEvent = PageViewEvent | ClickEvent;

export interface YouTubeStats {
  isOnVideo: boolean;
  title?: string;
  views?: string;
  subscribers?: string;
  channel?: string;
  channelName?: string;
  videoId?: string;
  thumbnailUrl?: string; // New
  date?: string; // New
  likes?: string; // New
  comments?: string;
  baseline?: {
    medianViews: number;
    medianViewsPerDay: number;
    sampleSize: number;
  } | null;
}

export interface ExtensionMessage {
  type:
    | "ANALYTICS_EVENT"
    | "GET_STATS"
    | "TOGGLE_TRACKING"
    | "GET_YOUTUBE_STATS"
    | "FETCH_VIDEO_BY_ID";
  payload?: AnyEvent | boolean | YouTubeStats | string;
}

export interface ExtensionState {
  isActive: boolean;
  eventCount: number;
}
