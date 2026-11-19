import { useEffect, useMemo, useRef, useState } from "react";
import type { BenchmarkData, ComputedMetrics, VideoData } from "../metrics";
import { extractVideoId } from "../watchPage";
import { requestVideoData } from "../videoFetch";
import {
  BENCHMARK_KEY,
  NO_BASELINE_TEXT,
  computeMetrics,
  formatLarge,
  pctDiff,
  withCurrentScore,
} from "../metrics";
import type { IconName } from "../ui";
import { Card, Icon } from "../ui";
import type { CompareContext } from "../../types";
import { fetchCompare, type CompareSummary } from "../compareApi";

interface Side {
  label: string;
  title: string;
  channel?: string;
  thumb?: string;
  m: ComputedMetrics;
}

interface Row {
  icon: IconName;
  label: string;
  l?: number;
  r?: number;
  fmt?: (v: number) => string;
}

export const CompareTab = ({
  data,
  metrics,
}: {
  data: VideoData;
  metrics: ComputedMetrics;
}) => {
  const [benchmark, setBenchmark] = useState<BenchmarkData | null>(null);
  const [mode, setMode] = useState<"performance" | "audience">("performance");
  const [swapped, setSwapped] = useState(false);
  const [adding, setAdding] = useState(false);
  const [link, setLink] = useState("");
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [aiComparison, setAiComparison] = useState<CompareSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [details, setDetails] = useState("");
  const [detailsError, setDetailsError] = useState("");

  const videoId = data.videoId ?? "";
  const videoIdRef = useRef(videoId);
  videoIdRef.current = videoId;

  // Video B belongs to the video you are watching: it is restored for the same video (for example after closing
  // and reopening the panel) and discarded as soon as you open a different one.
  useEffect(() => {
    setBenchmark(null);
    setSwapped(false);
    setAdding(false);
    setLink("");
    setError("");
    chrome.storage.local.get(BENCHMARK_KEY, (res) => {
      const saved = res[BENCHMARK_KEY] as
        | { forVideoId?: string; benchmark?: BenchmarkData }
        | undefined;
      if (!saved) return;
      if (saved.forVideoId === videoId && saved.benchmark)
        setBenchmark(withCurrentScore(saved.benchmark));
      else chrome.storage.local.remove(BENCHMARK_KEY); // belongs to another video (or an older format)
    });
  }, [videoId]);

  const persist = (b: BenchmarkData, forVideoId: string) =>
    chrome.storage.local.set(
      { [BENCHMARK_KEY]: { forVideoId, benchmark: b } },
      () => {
        setBenchmark(b);
        setAdding(false);
        setLink("");
        setError("");
      },
    );

  const analyzeLink = async () => {
    const pastedId = extractVideoId(link);
    if (!pastedId) {
      setError("That doesn't look like a YouTube video link.");
      return;
    }
    if (pastedId === videoId) {
      setError("That is the current video (Video A). Paste a different link.");
      return;
    }
    setFetching(true);
    setError("");
    const startedOn = videoId;
    const result = await requestVideoData(pastedId);
    setFetching(false);
    if (videoIdRef.current !== startedOn) return; // you opened another video while this was loading
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const v = result.data;
    persist(
      {
        ...computeMetrics(v),
        title: v.title || "Unknown video",
        thumbnailUrl: v.thumbnailUrl,
        channelName: v.channelName,
        savedAt: Date.now(),
      },
      startedOn,
    );
  };

  const clearBenchmark = () =>
    chrome.storage.local.remove(BENCHMARK_KEY, () => {
      setBenchmark(null);
      setSwapped(false);
    });

  const A: Side = {
    label: "Video A",
    title: data.title || "Current video",
    channel: data.channelName,
    thumb: data.thumbnailUrl,
    m: metrics,
  };
  const B: Side | null = benchmark
    ? {
        label: "Video B",
        title: benchmark.title,
        channel: benchmark.channelName,
        thumb: benchmark.thumbnailUrl,
        m: benchmark,
      }
    : null;
  const left = swapped && B ? B : A;
  const right = swapped && B ? A : B;

  const renderSide = (s: Side | null, isRight: boolean) => {
    if (!s) {
      return (
        <div className="yti-side empty">
          <span className="yti-muted">Video B</span>
          <p>Add a video to compare against.</p>
        </div>
      );
    }
    return (
      <div className="yti-side">
        <span className="yti-muted">
          {s.label}
          {s.label === "Video A" && " (Current video)"}
        </span>
        <div className="yti-side-body">
          <div className="yti-thumb sm">
            {s.thumb && (
              <img
                src={s.thumb}
                alt=""
                onError={(e) => {
                  (e.target as HTMLImageElement).style.visibility = "hidden";
                }}
              />
            )}
          </div>
          <div className="yti-side-text">
            <strong title={s.title}>{s.title}</strong>
            {s.channel && <small>{s.channel}</small>}
          </div>
          {isRight && (
            <button
              type="button"
              className="yti-x"
              onClick={clearBenchmark}
              title="Remove video"
            >
              <Icon name="x" size={14} />
            </button>
          )}
        </div>
      </div>
    );
  };

  const rows: Row[] =
    B && left && right
      ? [
          {
            icon: "eye",
            label: "Views",
            l: left.m.viewCount,
            r: right.m.viewCount,
            fmt: formatLarge,
          },
          {
            icon: "bars",
            label: "Views per day",
            l: left.m.velocity,
            r: right.m.velocity,
            fmt: (v) => "+" + formatLarge(v),
          },
          {
            icon: "heart",
            label: "Engagement rate",
            l: left.m.engagement ?? undefined,
            r: right.m.engagement ?? undefined,
            fmt: (v) => v.toFixed(1) + "%",
          },
          {
            icon: "eye",
            label: "Views vs channel median",
            l: left.m.viewsVsChannel ?? undefined,
            r: right.m.viewsVsChannel ?? undefined,
            fmt: (v) => v.toFixed(1) + "×",
          },
          {
            icon: "bars",
            label: "Views/day vs channel median",
            l: left.m.velocityVsChannel ?? undefined,
            r: right.m.velocityVsChannel ?? undefined,
            fmt: (v) => v.toFixed(1) + "×",
          },
          {
            icon: "heart",
            label: "Likes per 1K views",
            l: left.m.likesPer1K ?? undefined,
            r: right.m.likesPer1K ?? undefined,
            fmt: (v) => v.toFixed(1),
          },
          {
            icon: "message",
            label: "Comments per 1K views",
            l: left.m.commentsPer1K ?? undefined,
            r: right.m.commentsPer1K ?? undefined,
            fmt: (v) => v.toFixed(1),
          },
        ]
      : [];

  // Which video leads overall (A vs B, independent of the swap toggle)?
  let analysis: { leader: "A" | "B" } | null = null;
  if (B) {
    const a = A.m,
      b = B.m;
    // Preserve the existing overall-leader calculation; AI explains the evidence behind it.
    const engComparable = a.engagement !== null && b.engagement !== null;
    const wins = [a.viewCount > b.viewCount, a.velocity > b.velocity];
    if (engComparable) wins.push(a.engagement! > b.engagement!);
    const leader: "A" | "B" =
      wins.filter(Boolean).length * 2 >= wins.length ? "A" : "B";
    analysis = { leader };
  }

  const compareContext = useMemo<CompareContext | null>(() => {
    if (!B || !analysis) return null;
    const toVideoContext = (side: Side): CompareContext["videoA"] => ({
      title: side.title,
      channelName: side.channel ?? "Unknown channel",
      views: side.m.viewCount,
      viewsPerDay: side.m.velocity,
      engagementRatePct: side.m.engagement,
      viewsVsRecentMedian: side.m.viewsVsChannel,
      viewsPerDayVsRecentMedian: side.m.velocityVsChannel,
      likesPer1KViews: side.m.likesPer1K,
      commentsPer1KViews: side.m.commentsPer1K,
      daysSincePublished: Math.max(1, Math.floor(side.m.daysSince || 1)),
      recentUploadsSample: side.m.baselineSample,
    });
    return {
      leader: analysis.leader,
      videoA: toVideoContext(A),
      videoB: toVideoContext(B),
    };
  }, [data.title, data.channelName, metrics, benchmark, analysis?.leader]);
  const compareContextKey = compareContext
    ? JSON.stringify(compareContext)
    : "";

  const loadSummary = async () => {
    if (!compareContext || !videoId) return;
    setSummaryLoading(true);
    setSummaryError("");
    const result = await fetchCompare(videoId, compareContext, "summary");
    if (result.ok && "summary" in result.data) {
      setAiComparison(result.data);
    } else {
      setSummaryError(
        result.ok
          ? "The AI comparison returned an unexpected response."
          : result.error,
      );
    }
    setSummaryLoading(false);
  };

  useEffect(() => {
    let active = true;
    setAiComparison(null);
    setSummaryError("");
    setDetailsOpen(false);
    setDetailsLoading(false);
    setDetails("");
    setDetailsError("");

    if (!compareContextKey || !videoId) {
      setSummaryLoading(false);
      return () => {
        active = false;
      };
    }

    const context = JSON.parse(compareContextKey) as CompareContext;
    setSummaryLoading(true);
    void fetchCompare(videoId, context, "summary").then((result) => {
      if (!active) return;
      if (result.ok && "summary" in result.data) {
        setAiComparison(result.data);
      } else {
        setSummaryError(
          result.ok
            ? "The AI comparison returned an unexpected response."
            : result.error,
        );
      }
      setSummaryLoading(false);
    });

    return () => {
      active = false;
    };
  }, [videoId, compareContextKey]);

  const handleDetailedAnalysis = async () => {
    if (detailsOpen) {
      setDetailsOpen(false);
      return;
    }
    if (!compareContext || !videoId) return;
    setDetailsOpen(true);
    if (details || detailsLoading) return;

    setDetailsLoading(true);
    setDetailsError("");
    const result = await fetchCompare(videoId, compareContext, "detailed");
    if (result.ok && "explanation" in result.data) {
      setDetails(result.data.explanation);
    } else {
      setDetailsError(
        result.ok
          ? "The detailed comparison returned an unexpected response."
          : result.error,
      );
    }
    setDetailsLoading(false);
  };

  const retryDetailedAnalysis = async () => {
    if (!compareContext || !videoId || detailsLoading) return;
    setDetailsLoading(true);
    setDetailsError("");
    const result = await fetchCompare(videoId, compareContext, "detailed");
    if (result.ok && "explanation" in result.data) {
      setDetails(result.data.explanation);
    } else {
      setDetailsError(
        result.ok
          ? "The detailed comparison returned an unexpected response."
          : result.error,
      );
    }
    setDetailsLoading(false);
  };

  return (
    <>
      <div className="yti-title-row">
        <div>
          <h2 className="yti-h2">Compare videos</h2>
          <p className="yti-sub">
            Analyze performance and audience insights side by side.
          </p>
        </div>
        <button
          type="button"
          className="yti-btn"
          onClick={() => setSwapped((s) => !s)}
          disabled={!B}
        >
          <Icon name="swap" size={14} /> Swap
        </button>
      </div>

      <div className="yti-versus">
        {renderSide(left, false)}
        <span className="yti-vs">VS</span>
        {renderSide(right, true)}
        <div className="yti-add">
          {!B && !adding && (
            <button
              type="button"
              className="yti-btn"
              onClick={() => setAdding(true)}
            >
              <Icon name="plus" size={14} /> Add video
            </button>
          )}
          {!B && <small>Paste URL</small>}
        </div>
      </div>

      {!B && adding && (
        <Card>
          <div className="yti-add-form">
            <input
              className="yti-input"
              autoFocus
              placeholder="Paste the YouTube link of Video B…"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && analyzeLink()}
            />
            <button
              type="button"
              className="yti-btn primary"
              onClick={analyzeLink}
              disabled={fetching || !link}
            >
              {fetching ? "Analyzing…" : "Compare"}
            </button>
            <button
              type="button"
              className="yti-btn"
              onClick={() => {
                setAdding(false);
                setLink("");
                setError("");
              }}
            >
              Cancel
            </button>
          </div>
          {error && <p className="yti-error">{error}</p>}
        </Card>
      )}

      <div className="yti-tabs-sm">
        <button
          type="button"
          className={mode === "performance" ? "active" : ""}
          onClick={() => setMode("performance")}
        >
          Performance comparison
        </button>
        <button
          type="button"
          className={mode === "audience" ? "active" : ""}
          onClick={() => setMode("audience")}
        >
          Audience comparison
        </button>
      </div>

      {mode === "audience" ? (
        <Card title="Audience comparison" sample>
          <p className="yti-body">
            Side-by-side sentiment, themes and questions will appear here once
            comment data is connected.
          </p>
        </Card>
      ) : B ? (
        <>
          <Card title="Key metrics">
            <table className="yti-table">
              <thead>
                <tr>
                  <th />
                  <th title={left.title}>{left.label}</th>
                  <th title={right?.title}>{right?.label}</th>
                  <th>Difference</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const diff =
                    r.l !== undefined && r.r !== undefined
                      ? pctDiff(r.l, r.r)
                      : null;
                  return (
                    <tr key={r.label}>
                      <td>
                        <Icon name={r.icon} size={15} className="yti-muted" />{" "}
                        {r.label}
                      </td>
                      <td>{r.fmt && r.l !== undefined ? r.fmt(r.l) : "—"}</td>
                      <td>{r.fmt && r.r !== undefined ? r.fmt(r.r) : "—"}</td>
                      <td
                        className={
                          diff === null ? "" : diff >= 0 ? "pos" : "neg"
                        }
                      >
                        {diff === null ? (
                          "—"
                        ) : (
                          <>
                            <Icon name={diff >= 0 ? "up" : "down"} size={12} />{" "}
                            {diff >= 0 ? "+" : ""}
                            {Math.round(diff)}%
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {(metrics.viewsVsChannel === null ||
              benchmark?.viewsVsChannel === null) && (
              <p className="yti-note left">
                Channel comparison: {NO_BASELINE_TEXT.toLowerCase()} for{" "}
                {metrics.viewsVsChannel === null &&
                benchmark?.viewsVsChannel === null
                  ? "either video"
                  : metrics.viewsVsChannel === null
                    ? "Video A"
                    : "Video B"}
                .
              </p>
            )}
            {(metrics.engagement === null ||
              benchmark?.engagement === null) && (
              <p className="yti-note left">
                Engagement rate: N/A for{" "}
                {metrics.engagement === null && benchmark?.engagement === null
                  ? "either video"
                  : metrics.engagement === null
                    ? "Video A"
                    : "Video B"}{" "}
                (likes hidden or comment count unavailable).
              </p>
            )}
          </Card>

          {analysis && (
            <div className="yti-grid-2 yti-ai-overview-grid">
              <Card
                className="yti-ai-card yti-ai-summary-card"
                title={`Why is Video ${analysis.leader} performing better?`}
                icon={
                  <Icon
                    name="sparkle"
                    size={21}
                    className="yti-ai-spark-icon"
                  />
                }
              >
                {summaryLoading ? (
                  <div className="yti-ai-status">
                    <span className="yti-ai-pulse" />
                    Generating an AI comparison…
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
                    <p className="yti-ai-summary-text">
                      {aiComparison?.summary}
                    </p>
                    <button
                      type="button"
                      className="yti-btn yti-ai-detail-btn"
                      onClick={() => void handleDetailedAnalysis()}
                      disabled={detailsLoading}
                    >
                      {detailsLoading
                        ? "Generating analysis…"
                        : detailsOpen && details
                          ? "Hide detailed analysis"
                          : "View detailed analysis"}
                      <Icon name="arrow" size={15} />
                    </button>
                    {detailsOpen && detailsLoading && (
                      <div className="yti-ai-detail-status">
                        Preparing a more detailed comparison…
                      </div>
                    )}
                    {detailsOpen && detailsError && (
                      <div className="yti-ai-error yti-ai-detail-error">
                        <p>{detailsError}</p>
                        <button
                          type="button"
                          className="yti-link"
                          onClick={() => void retryDetailedAnalysis()}
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
                    Analysing both videos…
                  </div>
                ) : summaryError ? (
                  <p className="yti-ai-muted">
                    Key takeaways will appear when the AI comparison is
                    available.
                  </p>
                ) : (
                  <ul className="yti-ai-takeaways">
                    {aiComparison?.takeaways.map((takeaway, index) => (
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
                        <span className="yti-ai-takeaway-text">
                          {takeaway.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          )}
        </>
      ) : (
        <Card title="Key metrics">
          <p className="yti-body">
            Paste the link of Video B to compare it with the video you have
            open.
          </p>
        </Card>
      )}
    </>
  );
};
