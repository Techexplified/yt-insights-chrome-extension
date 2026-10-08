import { useMemo, useState } from "react";
import type { ComputedMetrics, Range, VideoData } from "../metrics";
import {
  RANGES,
  buildTrend,
  engagementNote,
  explainPerformance,
  formatLarge,
  getGrowthStatus,
  getRankTier,
  NO_SCORE_TEXT,
  rangeDays,
  xLabelsFor,
} from "../metrics";
import { AreaChart, Card, Icon, SoonButton } from "../ui";
import type { TabKey } from "../InsightsPanel";
import { VideoHeader } from "../VideoHeader";

interface Props {
  data: VideoData;
  metrics: ComputedMetrics;
  onNavigate: (tab: TabKey) => void;
}

export const OverviewTab = ({ data, metrics, onNavigate }: Props) => {
  const [range, setRange] = useState<Range>("28D");
  const tier = getRankTier(metrics);
  const growth = getGrowthStatus(metrics);
  const why = explainPerformance(metrics);

  const chart = useMemo(() => {
    const values = buildTrend(range, metrics.viewCount, metrics.daysSince);
    const end = values[values.length - 1] || 1;
    const top = metrics.viewCount / end;
    const yLabels = [top, (top * 2) / 3, top / 3, 0].map((v) =>
      v === 0 ? "0" : formatLarge(v),
    );
    return {
      values,
      yLabels,
      xLabels: xLabelsFor(rangeDays(range, metrics.daysSince)),
    };
  }, [range, metrics.viewCount, metrics.daysSince]);

  const velocityTone = /Viral|Trending|Rising/.test(growth.label)
    ? "up"
    : "flat";
  const eng = metrics.engagement;
  const engagementTone =
    eng === null ? "flat" : eng >= 4 ? "up" : eng >= 2 ? "flat" : "down";

  const drivers = [
    {
      tone: velocityTone,
      title: "Views velocity",
      sub: `About ${formatLarge(metrics.velocity)} views per day since publishing`,
    },
    {
      tone: engagementTone,
      title:
        eng === null
          ? "Engagement unavailable"
          : engagementTone === "up"
            ? "Strong engagement"
            : engagementTone === "flat"
              ? "Typical engagement"
              : "Low engagement",
      sub:
        eng === null
          ? engagementNote(metrics)
          : `${eng.toFixed(1)}% (likes + comments ÷ views)`,
    },
  ];

  return (
    <>
      <VideoHeader data={data} metrics={metrics} />

      <div className="yti-grid-4">
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
        <div className="yti-stat">
          <Icon name="star" size={22} className="yti-stat-icon yellow" />
          {tier && metrics.score !== null ? (
            <div>
              <strong>{metrics.score}x</strong>
              <span>
                Virality Score{" "}
                <b className="yti-tier" style={{ background: tier.color }}>
                  {tier.name}
                </b>
              </span>
              <em>Views ÷ subscribers</em>
            </div>
          ) : (
            <div>
              <strong>N/A</strong>
              <span>Virality Score</span>
              <em>{NO_SCORE_TEXT}</em>
            </div>
          )}
        </div>
      </div>

      <div className="yti-grid-main">
        <Card
          title="Views over time"
          action={
            <select
              className="yti-select"
              value={range}
              onChange={(e) => setRange(e.target.value as Range)}
            >
              {RANGES.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          }
        >
          <AreaChart
            values={chart.values}
            color="#ff3b3b"
            yLabels={chart.yLabels}
            xLabels={chart.xLabels}
          />
          <p className="yti-note">
            Trend shape is estimated from total views and upload date.
          </p>
        </Card>

        <Card
          title={why.title}
          action={<Icon name="sparkle" size={16} className="yti-spark" />}
        >
          <p className="yti-body">{why.text}</p>
          <SoonButton className="yti-btn wide">
            View detailed explanation <Icon name="arrow" size={14} />
          </SoonButton>
        </Card>
      </div>

      <div className="yti-grid-2">
        <Card title="Compared to similar videos" info>
          <div className="yti-split">
            <div className="yti-split-cell">
              <span className="yti-round blue">
                <Icon name="bars" size={20} />
              </span>
              <div>
                <strong>{tier ? tier.note : "N/A"}</strong>
                <p>
                  {tier
                    ? "Estimated from views ÷ subscribers. Similar-video percentiles are not connected yet."
                    : NO_SCORE_TEXT +
                      ": the channel subscriber count is missing."}
                </p>
              </div>
            </div>
            <div className="yti-split-cell">
              <span className="yti-round yellow">
                <Icon name="trophy" size={20} />
              </span>
              <div>
                <strong>{tier ? `${tier.name} tier` : "No tier yet"}</strong>
                <p>
                  {tier
                    ? "Based on views relative to channel size."
                    : "A tier needs a virality score."}
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="yti-btn"
            onClick={() => onNavigate("compare")}
          >
            View benchmark details <Icon name="arrow" size={14} />
          </button>
        </Card>

        <Card title="Key performance drivers">
          <ul className="yti-drivers">
            {drivers.map((d) => (
              <li key={d.title}>
                <span
                  className={`yti-round ${d.tone === "up" ? "green" : d.tone === "down" ? "red" : "gray"}`}
                >
                  <Icon
                    name={
                      d.tone === "up"
                        ? "up"
                        : d.tone === "down"
                          ? "down"
                          : "minus"
                    }
                    size={18}
                  />
                </span>
                <div>
                  <strong>{d.title}</strong>
                  <p>{d.sub}</p>
                </div>
              </li>
            ))}
            <li>
              <span className="yti-round gray">
                <Icon name="minus" size={18} />
              </span>
              <div>
                <strong>Subscriber conversion</strong>
                <p>
                  Not available yet <span className="yti-sample">Sample</span>
                </p>
              </div>
            </li>
          </ul>
        </Card>
      </div>

      <Card title="Engagement per 1K views" info estimated>
        <div className="yti-per1k">
          <div className="yti-per1k-cell">
            <span className="yti-round red">
              <Icon name="heart" size={20} />
            </span>
            <div>
              <strong>
                {metrics.likesPer1K !== null
                  ? metrics.likesPer1K.toFixed(1)
                  : "N/A"}
              </strong>
              <span>likes per 1K views</span>
              {metrics.likesPer1K === null && (
                <small>
                  {metrics.viewCount <= 0
                    ? "No views yet"
                    : "Likes hidden or unavailable"}
                </small>
              )}
            </div>
          </div>
          <div className="yti-per1k-cell">
            <span className="yti-round purple">
              <Icon name="message" size={20} />
            </span>
            <div>
              <strong>
                {metrics.commentsPer1K !== null
                  ? metrics.commentsPer1K.toFixed(1)
                  : "N/A"}
              </strong>
              <span>comments per 1K views</span>
              {metrics.commentsPer1K === null && (
                <small>
                  {metrics.viewCount <= 0
                    ? "No views yet"
                    : "Comment count unavailable"}
                </small>
              )}
            </div>
          </div>
        </div>
        <p className="yti-note left">
          Watch time and retention are private to the channel owner, so these
          ratios are shown instead.
        </p>
      </Card>
    </>
  );
};
