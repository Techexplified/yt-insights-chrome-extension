import { useEffect, useMemo, useRef, useState } from "react";
import type { VideoData } from "../metrics";
import {
  fetchOpportunities,
  type Demand,
  type OpportunitiesResult,
  type OpportunityAnalytics,
  type OpportunityTopic,
} from "../opportunitiesApi";
import { Bar, Card, EmptyState, Icon, LoadingState, Pill } from "../ui";

const TOP_COUNT = 5;
const QUESTION_COUNT = 4;
const GAP_COUNT = 4;

const DEMAND_LABEL: Record<Demand, string> = {
  high: "High demand",
  medium: "Medium demand",
  low: "Low demand",
};
const DEMAND_TONE = { high: "green", medium: "yellow", low: "gray" } as const;
const DEMAND_TEXT: Record<Demand, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};
const DEMAND_CLASS: Record<Demand, string> = {
  high: "yti-green",
  medium: "yti-yellow",
  low: "yti-muted",
};

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

// Topics that viewers want AND the channel hasn't covered rank first.
const opportunityScore = (t: OpportunityTopic) =>
  t.requests * (t.covered === true ? 0.5 : 1);

// ---------- Category popup menu (a custom popup, not a native <select>) ----------
const TopicMenu = ({
  categories,
  value,
  onChange,
}: {
  categories: string[];
  value: string | null;
  onChange: (v: string | null) => void;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // composedPath() so clicks are detected correctly inside the extension's shadow DOM
    const onDown = (e: MouseEvent) => {
      if (ref.current && !e.composedPath().includes(ref.current))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (v: string | null) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <div className="yti-menu" ref={ref}>
      <button
        type="button"
        className="yti-menu-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {value ? `#${value.toLowerCase()}` : "All topics"}
        <Icon name="chevron" size={14} className="yti-chev" />
      </button>
      {open && (
        <div className="yti-menu-list" role="listbox">
          <button
            type="button"
            role="option"
            aria-selected={value === null}
            className={`yti-menu-item ${value === null ? "active" : ""}`}
            onClick={() => choose(null)}
          >
            All topics
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              role="option"
              aria-selected={value === c}
              className={`yti-menu-item ${value === c ? "active" : ""}`}
              onClick={() => choose(c)}
            >
              #{c.toLowerCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const Message = ({ text, onRetry }: { text: string; onRetry?: () => void }) => (
  <div className="yti-empty">
    <Icon name="alert" size={22} />
    <p>{text}</p>
    {onRetry && (
      <button type="button" className="yti-btn" onClick={onRetry}>
        Try again
      </button>
    )}
  </div>
);

const Header = ({ menu }: { menu?: React.ReactNode }) => (
  <div className="yti-title-row">
    <div>
      <h2 className="yti-h2">Content opportunities</h2>
      <p className="yti-sub">
        Based on what your audience asks for in the comments and what your
        recent videos cover.
      </p>
    </div>
    {menu}
  </div>
);

// ---------- Loaded results ----------
const Results = ({
  a,
  analyzedAt,
  stale,
  category,
  onCategory,
}: {
  a: OpportunityAnalytics;
  analyzedAt: string;
  stale: boolean;
  category: string | null;
  onCategory: (c: string | null) => void;
}) => {
  const [showAllTop, setShowAllTop] = useState(false);
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [showAllGaps, setShowAllGaps] = useState(false);

  // The category filter applies to every number and list below.
  const topics = useMemo(
    () => a.topics.filter((t) => !category || t.category === category),
    [a.topics, category],
  );
  const questions = useMemo(
    () => a.questions.filter((q) => !category || q.category === category),
    [a.questions, category],
  );

  const ranked = useMemo(
    () => [...topics].sort((x, y) => opportunityScore(y) - opportunityScore(x)),
    [topics],
  );
  const gaps = useMemo(
    () =>
      topics
        .filter((t) => t.covered === false)
        .sort((x, y) => y.requests - x.requests),
    [topics],
  );

  const highOpportunity = topics.filter(
    (t) => t.covered !== true && t.demand !== "low",
  ).length;
  const stats = [
    {
      label: "High opportunity topics",
      value: String(highOpportunity),
      sub: "Promising by audience demand and content gaps",
      icon: "trend" as const,
      tone: "green",
    },
    {
      label: "Frequently requested",
      value: String(topics.length),
      sub: "Topics viewers have asked for repeatedly",
      icon: "users" as const,
      tone: "blue",
    },
    {
      label: "Not covered yet",
      value: a.coverageChecked ? String(gaps.length) : "—",
      sub: "Requested topics your recent videos haven’t covered",
      icon: "bars" as const,
      tone: "purple",
    },
  ];

  const visibleTop = showAllTop ? ranked : ranked.slice(0, TOP_COUNT);
  const visibleQuestions = showAllQuestions
    ? questions
    : questions.slice(0, QUESTION_COUNT);
  const visibleGaps = showAllGaps ? gaps : gaps.slice(0, GAP_COUNT);
  const gapMax = Math.max(1, ...gaps.map((g) => g.requests));

  return (
    <>
      <Header
        menu={
          a.categories.length > 0 && (
            <TopicMenu
              categories={a.categories}
              value={category}
              onChange={onCategory}
            />
          )
        }
      />

      <div className="yti-grid-3">
        {stats.map((s) => (
          <div className="yti-stat" key={s.label}>
            <span className={`yti-round lg ${s.tone}`}>
              <Icon name={s.icon} size={20} />
            </span>
            <div>
              <span>{s.label}</span>
              <strong>{s.value}</strong>
              <em>{s.sub}</em>
            </div>
          </div>
        ))}
      </div>

      <Card
        title="Top opportunities"
        action={
          ranked.length > TOP_COUNT && (
            <button
              type="button"
              className="yti-link"
              onClick={() => setShowAllTop((v) => !v)}
            >
              {showAllTop ? "Show less" : "View all"}{" "}
              <Icon name="arrow" size={13} />
            </button>
          )
        }
      >
        {ranked.length === 0 ? (
          <p className="yti-note">
            No repeated topic requests found
            {category ? " in this category" : ""}.
          </p>
        ) : (
          <ul className="yti-opps">
            {visibleTop.map((t, i) => (
              <li key={t.label}>
                <span className="yti-num">{i + 1}</span>
                <span className="yti-opp-title">{t.label}</span>
                <Pill tone={DEMAND_TONE[t.demand]} icon="trend">
                  {DEMAND_LABEL[t.demand]}
                </Pill>
                {t.covered === false && (
                  <Pill tone="blue" icon="bulb">
                    Not covered yet
                  </Pill>
                )}
                {t.covered === true && (
                  <Pill tone="yellow" icon="doc">
                    Covered before
                  </Pill>
                )}
                <Pill tone="gray" icon="users">
                  {plural(t.requests, "audience request", "audience requests")}
                </Pill>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="yti-grid-2">
        <Card
          title="Unanswered audience questions"
          icon={<Icon name="bulb" size={16} className="yti-yellow" />}
          action={
            questions.length > QUESTION_COUNT && (
              <button
                type="button"
                className="yti-link"
                onClick={() => setShowAllQuestions((v) => !v)}
              >
                {showAllQuestions ? "Show less" : "View all"}{" "}
                <Icon name="arrow" size={13} />
              </button>
            )
          }
        >
          <p className="yti-sub">
            Questions where no reply from you was found in the comments.
          </p>
          {questions.length === 0 ? (
            <p className="yti-note">
              No unanswered questions found{category ? " in this category" : ""}
              .
            </p>
          ) : (
            <ul className="yti-rows">
              {visibleQuestions.map((q) => (
                <li key={q.text}>
                  <span>“{q.text}”</span>
                  <em>{plural(q.mentions, "mention", "mentions")}</em>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Content gaps"
          icon={<Icon name="bars" size={16} className="yti-green" />}
        >
          <p className="yti-sub">
            Topics your audience wants that your recent videos don’t cover.
          </p>
          {!a.coverageChecked ? (
            <p className="yti-note">
              Couldn’t check your recent videos, so gaps aren’t available.
            </p>
          ) : gaps.length === 0 ? (
            <p className="yti-note">
              No uncovered topics found{category ? " in this category" : ""}.
            </p>
          ) : (
            <>
              <ul className="yti-gaps">
                {visibleGaps.map((g) => (
                  <li key={g.label}>
                    <span>{g.label}</span>
                    <Bar pct={g.requests} max={gapMax} color="#34d16f" />
                    <strong className={DEMAND_CLASS[g.demand]}>
                      {DEMAND_TEXT[g.demand]}
                    </strong>
                  </li>
                ))}
              </ul>
              {gaps.length > GAP_COUNT && (
                <div className="yti-card-actions">
                  <button
                    type="button"
                    className="yti-btn"
                    onClick={() => setShowAllGaps((v) => !v)}
                  >
                    {showAllGaps ? "Show fewer gaps" : "Explore more gaps"}{" "}
                    <Icon name="arrow" size={14} />
                  </button>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      <p className="yti-footnote">
        AI-generated from {a.commentsAnalyzed} comments
        {a.coverageChecked &&
          ` and your last ${a.channelVideosChecked} videos`}{" "}
        · analyzed{" "}
        {new Date(analyzedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}
        {stale && " · could not refresh, showing older results"}
      </p>
    </>
  );
};

export const OpportunitiesTab = ({ data }: { data: VideoData }) => {
  const videoId = data.videoId;
  // null = still checking whether a result is already cached
  const [result, setResult] = useState<OpportunitiesResult | null>(null);
  const [running, setRunning] = useState(false);
  const [category, setCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!videoId) return;
    let cancelled = false;
    setResult(null);
    setRunning(false);
    setCategory(null);
    fetchOpportunities(videoId, true).then((r) => {
      if (cancelled) return;
      // If the quick check itself failed, offer the button; clicking it shows any real error.
      setResult(r.status === "error" ? { status: "not_cached" } : r);
    });
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  const run = () => {
    if (!videoId) return;
    setRunning(true);
    fetchOpportunities(videoId, false).then((r) => {
      setResult(r);
      setRunning(false);
    });
  };

  if (!videoId)
    return (
      <EmptyState text="Open a YouTube video to find content opportunities." />
    );

  if (running) {
    return (
      <>
        <Header />
        <LoadingState
          text="Finding content opportunities…"
          sub="Analyzing up to 1,000 comments and your recent videos. This can take 15–40 seconds"
        />
      </>
    );
  }

  if (!result) {
    return (
      <>
        <Header />
        <LoadingState text="Checking for saved results…" />
      </>
    );
  }

  if (result.status === "ready") {
    return (
      <Results
        a={result.analytics}
        analyzedAt={result.analyzedAt}
        stale={result.stale}
        category={category}
        onCategory={setCategory}
      />
    );
  }

  return (
    <>
      <Header />
      {result.status === "comments_disabled" && (
        <Message text="Comments are turned off for this video." />
      )}
      {result.status === "insufficient_comments" && (
        <Message text="Not enough comments yet to find opportunities." />
      )}
      {result.status === "error" && (
        <Message text={result.message} onRetry={run} />
      )}
      {result.status === "not_cached" && (
        <div className="yti-empty">
          <Icon name="sparkle" size={22} className="yti-spark" />
          <p>
            Find topics your audience keeps asking for, and what your recent
            videos haven’t covered yet.
          </p>
          <button type="button" className="yti-btn primary" onClick={run}>
            Find opportunities <Icon name="arrow" size={14} />
          </button>
          <span className="yti-note">
            Analyzes up to 1,000 comments · takes 15–40 seconds
          </span>
        </div>
      )}
    </>
  );
};
