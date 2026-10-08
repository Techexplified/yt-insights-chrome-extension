import { useEffect, useState } from "react";
import type { BenchmarkData, ComputedMetrics, VideoData } from "../metrics";
import {
  BENCHMARK_KEY,
  NO_BASELINE_TEXT,
  NO_SCORE_TEXT,
  computeMetrics,
  formatLarge,
  joinList,
  pctDiff,
  withCurrentScore,
} from "../metrics";
import type { IconName } from "../ui";
import { Card, EstimatedBadge, Icon, SampleBadge, SoonButton } from "../ui";

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
  sample?: boolean;
  estimated?: boolean;
}

const looksLikeYouTube = (s: string) => /youtube\.com|youtu\.be/i.test(s);

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

  useEffect(() => {
    chrome.storage.local.get(BENCHMARK_KEY, (res) => {
      if (res[BENCHMARK_KEY])
        setBenchmark(withCurrentScore(res[BENCHMARK_KEY] as BenchmarkData));
    });
  }, []);

  const persist = (b: BenchmarkData) =>
    chrome.storage.local.set({ [BENCHMARK_KEY]: b }, () => {
      setBenchmark(b);
      setAdding(false);
      setLink("");
      setError("");
    });

  const saveCurrent = () =>
    persist({
      ...metrics,
      title: data.title || "Unknown video",
      thumbnailUrl: data.thumbnailUrl,
      channelName: data.channelName,
      savedAt: Date.now(),
    });

  const analyzeLink = () => {
    if (!looksLikeYouTube(link)) {
      setError("Paste a YouTube video URL.");
      return;
    }
    setFetching(true);
    setError("");
    chrome.runtime.sendMessage(
      { type: "FETCH_VIDEO_DATA", payload: link.trim() },
      (response) => {
        setFetching(false);
        void chrome.runtime.lastError;
        if (response && response.success && response.data) {
          const v = response.data as VideoData;
          persist({
            ...computeMetrics(v),
            title: v.title || "Unknown video",
            thumbnailUrl: v.thumbnailUrl,
            channelName: v.channelName,
            savedAt: Date.now(),
          });
        } else {
          setError("Could not analyze that video. Check the link.");
        }
      },
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
            estimated: true,
          },
          {
            icon: "bars",
            label: "Views/day vs channel median",
            l: left.m.velocityVsChannel ?? undefined,
            r: right.m.velocityVsChannel ?? undefined,
            fmt: (v) => v.toFixed(1) + "×",
            estimated: true,
          },
          {
            icon: "heart",
            label: "Likes per 1K views",
            l: left.m.likesPer1K ?? undefined,
            r: right.m.likesPer1K ?? undefined,
            fmt: (v) => v.toFixed(1),
            estimated: true,
          },
          {
            icon: "message",
            label: "Comments per 1K views",
            l: left.m.commentsPer1K ?? undefined,
            r: right.m.commentsPer1K ?? undefined,
            fmt: (v) => v.toFixed(1),
            estimated: true,
          },
          { icon: "users", label: "Subscriber conversion", sample: true },
          {
            icon: "star",
            label: "Virality Score",
            l: left.m.scoreValue ?? undefined,
            r: right.m.scoreValue ?? undefined,
            fmt: (v) => v.toFixed(1) + "x",
          },
        ]
      : [];

  // Which video leads overall (A vs B, independent of the swap toggle)?
  let analysis: {
    leader: "A" | "B";
    text: string;
    takeaways: string[];
  } | null = null;
  if (B) {
    const a = A.m,
      b = B.m;
    // Virality is only compared when both videos have a score.
    const scoreComparable = a.scoreValue !== null && b.scoreValue !== null;
    // Engagement is only compared when both videos have a rate.
    const engComparable = a.engagement !== null && b.engagement !== null;
    const wins = [a.viewCount > b.viewCount, a.velocity > b.velocity];
    if (engComparable) wins.push(a.engagement! > b.engagement!);
    if (scoreComparable) wins.push(a.scoreValue! > b.scoreValue!);
    const leader: "A" | "B" =
      wins.filter(Boolean).length * 2 >= wins.length ? "A" : "B";
    const L = leader === "A" ? a : b,
      O = leader === "A" ? b : a;
    const ahead: string[] = [];
    if (L.velocity > O.velocity)
      ahead.push(
        `views per day (${formatLarge(L.velocity)} vs ${formatLarge(O.velocity)})`,
      );
    if (engComparable && L.engagement! > O.engagement!)
      ahead.push(
        `engagement (${L.engagement!.toFixed(1)}% vs ${O.engagement!.toFixed(1)}%)`,
      );
    if (scoreComparable && L.scoreValue! > O.scoreValue!)
      ahead.push(`virality score (${L.score}x vs ${O.score}x)`);
    if (L.viewCount > O.viewCount)
      ahead.push(
        `total views (${formatLarge(L.viewCount)} vs ${formatLarge(O.viewCount)})`,
      );
    let engTakeaway =
      "Engagement rate can't be compared: likes or comment count is unavailable for one video.";
    if (engComparable) {
      const engLead = a.engagement! >= b.engagement! ? "A" : "B";
      engTakeaway = `Video ${engLead} has the higher engagement rate (${Math.max(a.engagement!, b.engagement!).toFixed(1)}% vs ${Math.min(a.engagement!, b.engagement!).toFixed(1)}%).`;
    }
    const reachLead = a.viewCount >= b.viewCount ? "A" : "B";
    analysis = {
      leader,
      text: ahead.length
        ? `Video ${leader} is ahead on ${joinList(ahead)}.`
        : `Video ${leader} is slightly ahead overall.`,
      takeaways: [
        engTakeaway,
        `Video ${reachLead} has the larger overall reach (${formatLarge(Math.max(a.viewCount, b.viewCount))} views).`,
      ],
    };
  }

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
          <small>{B ? "Saved as benchmark" : "Paste URL"}</small>
        </div>
      </div>

      {!B && (
        <Card>
          {adding && (
            <div className="yti-add-form">
              <input
                className="yti-input"
                placeholder="Paste a YouTube video URL…"
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
                {fetching ? "Analyzing…" : "Analyze"}
              </button>
            </div>
          )}
          {error && <p className="yti-error">{error}</p>}
          <p className="yti-note left">
            Tip: save this video as a benchmark, then open another video to
            compare the two.
          </p>
          <button type="button" className="yti-btn" onClick={saveCurrent}>
            Save current video as benchmark
          </button>
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
                        {r.sample && <SampleBadge />}
                        {r.estimated && <EstimatedBadge />}
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
            {(metrics.scoreValue === null ||
              benchmark?.scoreValue === null) && (
              <p className="yti-note left">
                Virality Score: {NO_SCORE_TEXT} for{" "}
                {metrics.scoreValue === null && benchmark?.scoreValue === null
                  ? "either video"
                  : metrics.scoreValue === null
                    ? "Video A"
                    : "Video B"}{" "}
                (subscriber count missing).
              </p>
            )}
          </Card>

          {analysis && (
            <div className="yti-grid-2">
              <Card
                title={`Why is Video ${analysis.leader} performing better?`}
                icon={<Icon name="sparkle" size={16} className="yti-spark" />}
              >
                <p className="yti-body">{analysis.text}</p>
                <SoonButton className="yti-btn">
                  View detailed analysis <Icon name="arrow" size={14} />
                </SoonButton>
              </Card>
              <Card
                title="Key takeaways"
                icon={<Icon name="doc" size={16} className="yti-muted" />}
              >
                <ol className="yti-takeaways">
                  {analysis.takeaways.map((t) => (
                    <li key={t}>
                      <span className="yti-num sm">
                        {analysis!.takeaways.indexOf(t) + 1}
                      </span>
                      {t}
                    </li>
                  ))}
                  <li>
                    <span className="yti-num sm">3</span>Audience overlap
                    insights are not available yet. <SampleBadge />
                  </li>
                </ol>
              </Card>
            </div>
          )}
        </>
      ) : (
        <Card title="Key metrics" sample>
          <p className="yti-body">
            Add a second video to see views, views per day, engagement and
            virality side by side.
          </p>
        </Card>
      )}
    </>
  );
};
