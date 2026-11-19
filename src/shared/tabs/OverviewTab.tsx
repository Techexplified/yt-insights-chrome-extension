import { useEffect, useMemo, useState } from "react";
import type { ComputedMetrics, VideoData } from "../metrics";
import {
  engagementNote,
  explainPerformance,
  formatLarge,
  getGrowthStatus,
  NO_BASELINE_TEXT,
} from "../metrics";
import { fetchOverview, type OverviewSummary } from "../overviewApi";
import type { OverviewContext } from "../../types";
import { Card, Icon } from "../ui";
import { VideoHeader } from "../VideoHeader";

interface Props {
  data: VideoData;
  metrics: ComputedMetrics;
}

export const OverviewTab = ({ data, metrics }: Props) => {
  const growth = getGrowthStatus(metrics);
  const why = explainPerformance(metrics);

  const overviewContext = useMemo<OverviewContext>(
    () => ({
      title: data.title ?? "Untitled video",
      channelName: data.channelName ?? "Unknown channel",
      views: metrics.viewCount,
      // A zero like count is treated as hidden/unavailable by the scraper.
      likes: metrics.likeCount > 0 ? metrics.likeCount : null,
      comments: metrics.commentCount,
      subscribers: metrics.subCount > 0 ? metrics.subCount : null,
      daysSincePublished: metrics.daysSince,
      viewsPerDay: metrics.velocity,
      engagementRatePct: metrics.engagement,
      viewsVsRecentMedian: metrics.viewsVsChannel,
      viewsPerDayVsRecentMedian: metrics.velocityVsChannel,
      recentUploadsSample: metrics.baselineSample,
      viewsToSubscribersRatio: metrics.scoreValue,
    }),
    [data.title, data.channelName, metrics],
  );

  const [aiOverview, setAiOverview] = useState<OverviewSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [details, setDetails] = useState("");
  const [detailsError, setDetailsError] = useState("");

  const loadSummary = async () => {
    if (!data.videoId) {
      setSummaryError(
        "Video details are unavailable, so the AI overview cannot be generated.",
      );
      setSummaryLoading(false);
      return;
    }
    setSummaryLoading(true);
    setSummaryError("");
    const result = await fetchOverview(
      data.videoId,
      overviewContext,
      "summary",
    );
    if (result.ok && "summary" in result.data) {
      setAiOverview(result.data);
    } else {
      setSummaryError(
        result.ok
          ? "The AI overview returned an unexpected response."
          : result.error,
      );
    }
    setSummaryLoading(false);
  };

  useEffect(() => {
    let active = true;
    setAiOverview(null);
    setSummaryError("");
    setSummaryLoading(true);
    setDetailsOpen(false);
    setDetails("");
    setDetailsError("");

    if (!data.videoId) {
      setSummaryError(
        "Video details are unavailable, so the AI overview cannot be generated.",
      );
      setSummaryLoading(false);
      return () => {
        active = false;
      };
    }

    void fetchOverview(data.videoId, overviewContext, "summary").then(
      (result) => {
        if (!active) return;
        if (result.ok && "summary" in result.data) {
          setAiOverview(result.data);
        } else {
          setSummaryError(
            result.ok
              ? "The AI overview returned an unexpected response."
              : result.error,
          );
        }
        setSummaryLoading(false);
      },
    );

    return () => {
      active = false;
    };
  }, [data.videoId, overviewContext]);

  const handleDetailedExplanation = async () => {
    if (detailsOpen) {
      setDetailsOpen(false);
      return;
    }
    setDetailsOpen(true);
    if (details || detailsLoading || !data.videoId) return;

    setDetailsLoading(true);
    setDetailsError("");
    const result = await fetchOverview(
      data.videoId,
      overviewContext,
      "detailed",
    );
    if (result.ok && "explanation" in result.data) {
      setDetails(result.data.explanation);
    } else {
      setDetailsError(
        result.ok
          ? "The detailed explanation returned an unexpected response."
          : result.error,
      );
    }
    setDetailsLoading(false);
  };

  const retryDetailedExplanation = async () => {
    if (!data.videoId || detailsLoading) return;
    setDetailsLoading(true);
    setDetailsError("");
    const result = await fetchOverview(
      data.videoId,
      overviewContext,
      "detailed",
    );
    if (result.ok && "explanation" in result.data) {
      setDetails(result.data.explanation);
    } else {
      setDetailsError(
        result.ok
          ? "The detailed explanation returned an unexpected response."
          : result.error,
      );
    }
    setDetailsLoading(false);
  };

  return (
    <>
      <VideoHeader data={data} metrics={metrics} />

      <div className="yti-grid-3">
        <div className="yti-stat">
          <Icon name="eye" size={22} className="yti-stat-icon" />
          <div>
            <strong>{formatLarge(metrics.viewCount)}</strong>
            <span>Views</span>
            <em>Since published</em>
          </div>
        </div>
        <div className="yti-stat">
          <Icon name="bars" size={22} className="yti-stat-icon" />
          <div>
            <strong>+{formatLarge(metrics.velocity)}</strong>
            <span>Views/day</span>
            <em style={{ color: growth.color }}>{growth.label}</em>
          </div>
        </div>
        <div className="yti-stat">
          <Icon name="heart" size={22} className="yti-stat-icon" />
          <div>
            <strong>
              {metrics.engagement !== null
                ? `${metrics.engagement.toFixed(1)}%`
                : "N/A"}
            </strong>
            <span>Engagement rate</span>
            <em>{engagementNote(metrics)}</em>
          </div>
        </div>
      </div>

      <div className="yti-grid-2 yti-ai-overview-grid">
        <Card
          className="yti-ai-card yti-ai-summary-card"
          title={
            why.good
              ? "Why is this video performing well?"
              : "How is this video performing?"
          }
          icon={<Icon name="sparkle" size={21} className="yti-ai-spark-icon" />}
        >
          {summaryLoading ? (
            <div className="yti-ai-status">
              <span className="yti-ai-pulse" />
              Generating an AI overview…
            </div>
          ) : summaryError ? (
            <div className="yti-ai-error">
              <p>{summaryError}</p>
              <button
                type="button"
                className="yti-link"
                onClick={() => void loadSummary()}
              >
                Try again <Icon name="arrow" size={13} />
              </button>
            </div>
          ) : (
            <>
              <p className="yti-ai-summary-text">{aiOverview?.summary}</p>
              <button
                type="button"
                className="yti-btn yti-ai-detail-btn"
                onClick={() => void handleDetailedExplanation()}
                disabled={detailsLoading}
              >
                {detailsLoading
                  ? "Generating explanation…"
                  : detailsOpen && details
                    ? "Hide detailed explanation"
                    : "View detailed explanation"}
                <Icon name="arrow" size={15} />
              </button>
              {detailsOpen && detailsLoading && (
                <div className="yti-ai-detail-status">
                  Preparing a more detailed analysis…
                </div>
              )}
              {detailsOpen && detailsError && (
                <div className="yti-ai-error yti-ai-detail-error">
                  <p>{detailsError}</p>
                  <button
                    type="button"
                    className="yti-link"
                    onClick={() => void retryDetailedExplanation()}
                  >
                    Try again <Icon name="arrow" size={13} />
                  </button>
                </div>
              )}
              {detailsOpen && details && (
                <div className="yti-ai-detail-text">{details}</div>
              )}
            </>
          )}
        </Card>

        <Card
          className="yti-ai-card yti-ai-takeaways-card"
          title="Key takeaways"
          icon={<Icon name="doc" size={21} className="yti-ai-doc-icon" />}
        >
          {summaryLoading ? (
            <div className="yti-ai-takeaway-loading">
              <span className="yti-ai-pulse" />
              Analysing the available metrics…
            </div>
          ) : summaryError ? (
            <p className="yti-ai-muted">
              Key takeaways will appear when the AI overview is available.
            </p>
          ) : (
            <ul className="yti-ai-takeaways">
              {aiOverview?.takeaways.map((takeaway, index) => (
                <li key={`${index}-${takeaway.text}`}>
                  <span className={`yti-ai-bullet ${takeaway.tone}`}>
                    <Icon
                      name={
                        takeaway.tone === "positive"
                          ? "up"
                          : takeaway.tone === "negative"
                            ? "down"
                            : "minus"
                      }
                      size={17}
                    />
                  </span>
                  <span className="yti-ai-takeaway-text">{takeaway.text}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Compared to recent uploads" info estimated>
        <div className="yti-per1k">
          <div className="yti-per1k-cell">
            <span className="yti-round blue">
              <Icon name="eye" size={20} />
            </span>
            <div>
              <strong>
                {metrics.viewsVsChannel !== null
                  ? `${metrics.viewsVsChannel.toFixed(1)}×`
                  : "N/A"}
              </strong>
              <span>views vs typical recent upload</span>
              {metrics.viewsVsChannel === null && (
                <small>{NO_BASELINE_TEXT}</small>
              )}
            </div>
          </div>
          <div className="yti-per1k-cell">
            <span className="yti-round green">
              <Icon name="trend" size={20} />
            </span>
            <div>
              <strong>
                {metrics.velocityVsChannel !== null
                  ? `${metrics.velocityVsChannel.toFixed(1)}×`
                  : "N/A"}
              </strong>
              <span>views/day vs typical recent upload</span>
              {metrics.velocityVsChannel === null && (
                <small>{NO_BASELINE_TEXT}</small>
              )}
            </div>
          </div>
        </div>
        <p className="yti-note left">
          {metrics.baselineSample !== null
            ? `Typical = the median of this channel's ${metrics.baselineSample} most recent uploads (taken from its latest 15, skipping videos under 3 days old). Not the channel's full history. Shorts are included if the channel posts them.`
            : "Needs at least 3 of this channel's latest 15 uploads that are older than 3 days."}
        </p>
      </Card>
    </>
  );
};
