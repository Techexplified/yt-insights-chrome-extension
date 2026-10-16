import { useCallback, useEffect, useState } from 'react';
import type { ComputedMetrics, VideoData } from '../metrics';
import {
    fetchAudience, type AudienceAnalytics, type AudienceDepth, type AudienceResult,
} from '../audienceApi';
import { AreaChart, Bar, Card, Donut, EmptyState, Icon, LoadingState } from '../ui';
import { VideoHeader } from '../VideoHeader';

const COLORS = { positive: '#34d16f', neutral: '#8b93a3', negative: '#ff5b5b' };

const formatCount = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n));

// ---------- Comment-volume chart helpers ----------
const volumeChart = (volume: NonNullable<AudienceAnalytics['volume']>) => {
    const max = Math.max(1, ...volume.counts);
    const start = new Date(volume.start).getTime();
    const end = new Date(volume.end).getTime();
    const short = end - start < 2 * 86400000;
    const fmt = (t: number) =>
        new Date(t).toLocaleString('en-US', short
            ? { hour: 'numeric' }
            : { month: 'short', day: 'numeric' });
    return {
        values: volume.counts.map(c => c / max),
        yLabels: [max, (max * 2) / 3, max / 3, 0].map(v => String(Math.round(v))),
        xLabels: [0, 1, 2, 3, 4].map(i => fmt(start + ((end - start) * i) / 4)),
    };
};

// ---------- Results view (used for both quick and detailed) ----------
const Results = ({ a, detailed }: { a: AudienceAnalytics; detailed: boolean }) => {
    const segments = [
        { label: 'Positive', value: a.sentiment.positive, color: COLORS.positive },
        { label: 'Neutral', value: a.sentiment.neutral, color: COLORS.neutral },
        { label: 'Negative', value: a.sentiment.negative, color: COLORS.negative },
    ];
    const themeMax = Math.max(10, ...a.themes.map(t => t.pct));
    const chart = a.volume ? volumeChart(a.volume) : null;

    return (
        <>
            <div className="yti-grid-2 wide-left">
                <Card title="Audience sentiment">
                    <div className="yti-sentiment">
                        <Donut segments={segments} center={formatCount(a.commentsAnalyzed)} sub="comments" />
                        <ul>
                            {segments.map(s => (
                                <li key={s.label}>
                                    <i style={{ background: s.color }} />{s.label}<strong>{s.value}%</strong>
                                </li>
                            ))}
                        </ul>
                    </div>
                </Card>

                <Card title="Top comment themes">
                    {a.themes.length === 0 ? <p className="yti-note">No clear themes found.</p> : (
                        <ul className="yti-rank-list">
                            {a.themes.map((t, i) => (
                                <li key={t.label}>
                                    <span className="yti-num sm">{i + 1}</span>
                                    <span className="yti-rank-label">{t.label}</span>
                                    <Bar pct={t.pct} max={themeMax} color="#3b82f6" />
                                    <strong>{t.pct}%</strong>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>

            <div className="yti-grid-2">
                <Card title="Common audience questions">
                    {a.questions.length === 0 ? <p className="yti-note">No repeated questions found.</p> : (
                        <ul className="yti-rows">
                            {a.questions.map(q => (
                                <li key={q.text}>
                                    <Icon name="message" size={15} className="yti-muted" />
                                    <span>“{q.text}”</span><em>~{q.mentions} mentions</em>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>

                <Card title="Audience pain points">
                    {a.painPoints.length === 0 ? <p className="yti-note">No clear pain points found.</p> : (
                        <ul className="yti-rows">
                            {a.painPoints.map(p => (
                                <li key={p.label}>
                                    <span className="yti-round red sm"><Icon name="alert" size={14} /></span>
                                    <span>{p.label}</span><strong>{p.pct}%</strong>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>

            <div className="yti-grid-main">
                <Card title="Comment volume over time">
                    {chart
                        ? <AreaChart values={chart.values} color="#34d16f" yLabels={chart.yLabels} xLabels={chart.xLabels} />
                        : <p className="yti-note">Not enough timing data.</p>}
                </Card>

                <Card title="Key takeaway" icon={<Icon name="sparkle" size={16} className="yti-spark" />}>
                    <p className="yti-body">{a.takeaway}</p>
                </Card>
            </div>

            {detailed && a.summary && (
                <Card title="Audience summary">
                    <p className="yti-body">{a.summary}</p>
                </Card>
            )}

            {detailed && a.contentIdeas && a.contentIdeas.length > 0 && (
                <Card title="Content ideas from your audience" icon={<Icon name="sparkle" size={16} className="yti-spark" />}>
                    <ul className="yti-rows">
                        {a.contentIdeas.map(idea => (
                            <li key={idea}><span>{idea}</span></li>
                        ))}
                    </ul>
                </Card>
            )}
        </>
    );
};

// ---------- Loads one depth of analytics from the backend ----------
const useAudience = (videoId: string | undefined, depth: AudienceDepth, enabled: boolean) => {
    const [result, setResult] = useState<AudienceResult | null>(null);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        if (!enabled || !videoId) return;
        let cancelled = false;
        setResult(null);
        fetchAudience(videoId, depth).then(r => { if (!cancelled) setResult(r); });
        return () => { cancelled = true; };
    }, [videoId, depth, enabled, attempt]);

    const retry = useCallback(() => setAttempt(a => a + 1), []);
    return { result, retry };
};

const Footnote = ({ result }: { result: Extract<AudienceResult, { status: 'ready' }> }) => (
    <p className="yti-footnote">
        AI-generated from {result.analytics.commentsAnalyzed} comments · analyzed{' '}
        {new Date(result.analyzedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        {result.stale && ' · could not refresh, showing older results'}
    </p>
);

const Message = ({ text, onRetry }: { text: string; onRetry?: () => void }) => (
    <div className="yti-empty">
        <Icon name="alert" size={22} />
        <p>{text}</p>
        {onRetry && <button type="button" className="yti-btn" onClick={onRetry}>Try again</button>}
    </div>
);

export const AudienceTab = ({ data, metrics }: { data: VideoData; metrics: ComputedMetrics }) => {
    const [view, setView] = useState<'quick' | 'detailed'>('quick');
    const videoId = data.videoId;
    const quick = useAudience(videoId, 'quick', true);
    const detailed = useAudience(videoId, 'detailed', view === 'detailed');

    const { result, retry } = view === 'quick' ? quick : detailed;

    const renderBody = () => {
        if (!videoId) return <EmptyState text="Open a YouTube video to see its audience." />;

        if (!result) {
            return view === 'quick'
                ? <LoadingState text="Analyzing the latest comments…" sub="This usually takes a few seconds" />
                : <LoadingState text="Building the detailed report…" sub="Analyzing up to 1,000 comments. This can take 15–40 seconds" />;
        }
        if (result.status === 'comments_disabled') return <Message text="Comments are turned off for this video." />;
        if (result.status === 'insufficient_comments') return <Message text="Not enough comments yet to analyze this video." />;
        if (result.status === 'error') return <Message text={result.message} onRetry={retry} />;

        return (
            <>
                {view === 'detailed' && (
                    <button type="button" className="yti-link yti-back" onClick={() => setView('quick')}>
                        ← Back to quick analysis
                    </button>
                )}
                <Results a={result.analytics} detailed={view === 'detailed'} />
                <Footnote result={result} />
                {view === 'quick' && (
                    <div className="yti-detail-cta">
                        <button type="button" className="yti-btn primary" onClick={() => setView('detailed')}>
                            View Detailed Analysis <Icon name="arrow" size={14} />
                        </button>
                        <span className="yti-note">Analyzes up to 1,000 comments · can take 15–40 seconds</span>
                    </div>
                )}
            </>
        );
    };

    return (
        <>
            <VideoHeader data={data} metrics={metrics} />
            {renderBody()}
        </>
    );
};
