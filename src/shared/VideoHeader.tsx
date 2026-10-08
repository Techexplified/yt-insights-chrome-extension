import { useState } from "react";
import type { ComputedMetrics, VideoData } from "./metrics";
import {
  explainPerformance,
  formatLarge,
  getGrowthStatus,
  getRankTier,
  timeAgo,
} from "./metrics";
import { Icon } from "./ui";

// Video summary row shown at the top of the Overview and Audience tabs.
export const VideoHeader = ({
  data,
  metrics,
}: {
  data: VideoData;
  metrics: ComputedMetrics;
}) => {
  const [copied, setCopied] = useState(false);
  const url = data.videoId
    ? `https://www.youtube.com/watch?v=${data.videoId}`
    : undefined;

  const copyStats = () => {
    const tier = getRankTier(metrics);
    const text = [
      `📺 ${data.title ?? ""}`,
      `👀 Views: ${formatLarge(metrics.viewCount)}`,
      `⚡ Velocity: ${formatLarge(metrics.velocity)}/day`,
      `💗 Engagement: ${metrics.engagement !== null ? metrics.engagement.toFixed(2) + "%" : "N/A"}`,
      `📊 Per 1K views: ${metrics.likesPer1K !== null ? metrics.likesPer1K.toFixed(1) : "N/A"} likes, ${metrics.commentsPer1K !== null ? metrics.commentsPer1K.toFixed(1) : "N/A"} comments (estimated)`,
      `📈 vs channel: ${metrics.viewsVsChannel !== null ? metrics.viewsVsChannel.toFixed(1) + "×" : "N/A"} views, ${metrics.velocityVsChannel !== null ? metrics.velocityVsChannel.toFixed(1) + "×" : "N/A"} views/day (estimated)`,
      `💎 Rank: ${tier ? tier.label : "Not enough data available"}`,
      `🚀 Status: ${getGrowthStatus(metrics).label}`,
      `📝 ${explainPerformance(metrics).text}`,
    ].join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="yti-video-head">
      <div className="yti-thumb">
        {data.thumbnailUrl && (
          <img
            src={data.thumbnailUrl}
            alt=""
            onError={(e) => {
              (e.target as HTMLImageElement).style.visibility = "hidden";
            }}
          />
        )}
      </div>
      <div className="yti-video-info">
        <h2 title={data.title}>{data.title || "Untitled video"}</h2>
        <p>
          {data.channelName && <>{data.channelName} • </>}
          {data.subscribers && data.subscribers !== "0 subscribers" ? (
            <>{data.subscribers.replace(/ subscribers/, "")} subscribers • </>
          ) : null}
          {timeAgo(data.date)}
        </p>
      </div>
      <div className="yti-video-actions">
        {url && (
          <a className="yti-btn" href={url} target="_blank" rel="noreferrer">
            View on YouTube <Icon name="external" size={14} />
          </a>
        )}
        <button
          type="button"
          className="yti-icon-btn"
          onClick={copyStats}
          title="Copy stats summary"
        >
          {copied ? (
            <span className="yti-copied">Copied</span>
          ) : (
            <Icon name="more" size={18} />
          )}
        </button>
      </div>
    </div>
  );
};
