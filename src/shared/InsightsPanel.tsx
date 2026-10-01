import { useMemo, useState } from "react";
import type { VideoData } from "./metrics";
import { computeMetrics } from "./metrics";
import { EmptyState, Icon, YouTubeLogo } from "./ui";
import { OverviewTab } from "./tabs/OverviewTab";
import { AudienceTab } from "./tabs/AudienceTab";
import { CompareTab } from "./tabs/CompareTab";
import { OpportunitiesTab } from "./tabs/OpportunitiesTab";
import { ExploreTab } from "./tabs/ExploreTab";

export type TabKey =
  | "overview"
  | "audience"
  | "compare"
  | "opportunities"
  | "explore";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "audience", label: "Audience" },
  { key: "compare", label: "Compare" },
  { key: "opportunities", label: "Opportunities" },
  { key: "explore", label: "Explore" },
];

interface Props {
  data: VideoData | null; // null when the user is not on a video page
  loading?: boolean; // fetching fresh data for the current video
  onClose?: () => void;
  variant?: "popup" | "modal";
}

export const InsightsPanel = ({
  data,
  loading = false,
  onClose,
  variant = "popup",
}: Props) => {
  const [tab, setTab] = useState<TabKey>("overview");
  const metrics = useMemo(() => (data ? computeMetrics(data) : null), [data]);

  const needsVideo =
    tab === "overview" || tab === "audience" || tab === "compare";

  const renderTab = () => {
    if (needsVideo && loading) {
      return <EmptyState text="Loading video data…" />;
    }
    if (needsVideo && (!data || !metrics)) {
      return <EmptyState text="Open a YouTube video to see its stats." />;
    }
    switch (tab) {
      case "overview":
        return (
          <OverviewTab data={data!} metrics={metrics!} onNavigate={setTab} />
        );
      case "audience":
        return <AudienceTab data={data!} metrics={metrics!} />;
      case "compare":
        return <CompareTab data={data!} metrics={metrics!} />;
      case "opportunities":
        return <OpportunitiesTab />;
      case "explore":
        return <ExploreTab />;
    }
  };

  return (
    <div className={`yti-root ${variant}`}>
      <header className="yti-header">
        <div className="yti-brand">
          <YouTubeLogo />
          <span>YT Insights</span>
          <b>V4</b>
        </div>
        <nav className="yti-nav">
          {TABS.map((t) => (
            <button
              type="button"
              key={t.key}
              className={tab === t.key ? "active" : ""}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="yti-header-actions">
          <button
            type="button"
            className="yti-icon-btn"
            title="Settings (coming soon)"
          >
            <Icon name="gear" size={19} />
          </button>
          <span className="yti-divider" />
          <button
            type="button"
            className="yti-icon-btn"
            title="Close"
            onClick={onClose ?? (() => window.close())}
          >
            <Icon name="x" size={22} />
          </button>
        </div>
      </header>
      <main className="yti-content" key={tab}>
        {renderTab()}
      </main>
    </div>
  );
};

export default InsightsPanel;
