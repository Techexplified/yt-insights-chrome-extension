import type { ComputedMetrics, VideoData } from "../metrics";
import {
  engagementNote,
  explainPerformance,
  formatLarge,
  getGrowthStatus,
  NO_BASELINE_TEXT,
} from "../metrics";
import { Card, Icon, SoonButton } from "../ui";
import { VideoHeader } from "../VideoHeader";

interface Props {
  data: VideoData;
  metrics: ComputedMetrics;
}

export const OverviewTab = ({ data, metrics }: Props) => {
  const growth = getGrowthStatus(metrics);
  const why = explainPerformance(metrics);

  // Velocity compared with the channel's typical video when we have a baseline; otherwise the growth label.
  const vsCh = metrics.velocityVsChannel;
  const velocityTone =
    vsCh !== null
      ? vsCh >= 1.5
        ? "up"
        : vsCh >= 0.7
          ? "flat"
          : "down"
      : /Viral|Trending|Rising/.test(growth.label)
        ? "up"
        : "flat";
  const eng = metrics.engagement;
  const engagementTone =
    eng === null ? "flat" : eng >= 4 ? "up" : eng >= 2 ? "flat" : "down";

  const drivers = [
    {
      tone: velocityTone,
      title:
        vsCh === null
          ? "Views velocity"
          : velocityTone === "up"
            ? "High velocity"
            : velocityTone === "flat"
              ? "Typical velocity"
              : "Below-average velocity",
      sub:
        vsCh === null
          ? `About ${formatLarge(metrics.velocity)} views per day since publishing`
          : `${vsCh.toFixed(1)}× the recent-uploads typical views/day`,
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

      <div className="yti-grid-2">
        <Card
          title={why.title}
          action={<Icon name="sparkle" size={16} className="yti-spark" />}
        >
          <p className="yti-body">{why.text}</p>
          <SoonButton className="yti-btn wide">
            View detailed explanation <Icon name="arrow" size={14} />
          </SoonButton>
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
          </ul>
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
