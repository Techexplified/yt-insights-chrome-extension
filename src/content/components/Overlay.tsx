import React, { useState, useMemo, useEffect } from 'react';
import type { YouTubeVideoData } from '../youtube/scraper';

interface OverlayProps {
    data: YouTubeVideoData | null;
    onClose: () => void;
}

interface ComputedMetrics {
    viewCount: number;
    subCount: number;
    likeCount: number;
    daysSince: number;
    velocity: number;
    engagement: number;
    score: string; // Virality Score
    scoreValue: number;
}

interface BenchmarkData extends ComputedMetrics {
    title: string;
    savedAt: number;
}

const Overlay: React.FC<OverlayProps> = ({ data, onClose }) => {
    const [activeGraphTab, setActiveGraphTab] = useState('28D');
    const [viewMode, setViewMode] = useState<'VIEWS' | 'COMPARE' | 'RANKING'>('VIEWS');
    const [benchmark, setBenchmark] = useState<BenchmarkData | null>(null);
    const [benchmarkLink, setBenchmarkLink] = useState('');
    const [isFetching, setIsFetching] = useState(false);

    // Load Benchmark on mount
    useEffect(() => {
        chrome.storage.local.get(['viewstat_benchmark'], (result) => {
            if (result.viewstat_benchmark) {
                setBenchmark(result.viewstat_benchmark);
            }
        });
    }, []);

    // ... (rest of parsing/metrics logic is same) ...
    // Parse helper
    const parseCount = (str?: string): number => {
        if (!str) return 0;
        const clean = str.replace(/,| views| subscribers| likes/g, '');
        const last = clean.slice(-1).toUpperCase();
        const num = parseFloat(clean);

        if (last === 'K') return num * 1000;
        if (last === 'M') return num * 1000000;
        if (last === 'B') return num * 1000000000;
        return isNaN(num) ? 0 : num;
    };

    // Derived Metrics
    const metrics: ComputedMetrics | null = useMemo(() => {
        if (!data) return null;
        const viewCount = parseCount(data.views);
        const subCount = parseCount(data.subscribers);
        const likeCount = parseCount(data.likes);

        const now = new Date();
        // Handle "Oct 20, 2024" or ISO string
        let date = new Date(data.date);
        if (isNaN(date.getTime()) && data.date) {
            // Try parsing generic text
            date = new Date(Date.parse(data.date));
        }
        if (isNaN(date.getTime())) {
            date = now; // Fallback
        }

        const daysSince = Math.max(1, Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)));

        // Velocity (Daily Avg)
        const velocity = Math.round(viewCount / daysSince);
        // Engagement
        const engagement = viewCount > 0 ? (likeCount / viewCount) * 100 : 0;

        // Virality Score
        const baseline = subCount > 0 ? subCount : 1000;
        let score = viewCount / baseline;

        return {
            viewCount,
            subCount,
            likeCount,
            daysSince,
            velocity,
            engagement,
            score: score.toFixed(1),
            scoreValue: score
        };
    }, [data]);

    // Graph Path Generator
    const getGraphPaths = (tab: string, viewCount: number, daysSince: number) => {
        const width = 320;
        const height = 100;
        const points: [number, number][] = [];
        const segments = 20;
        for (let i = 0; i <= segments; i++) {
            const x = (width / segments) * i;
            let progress = i / segments;
            const seed = (viewCount % 100) / 100;
            let yNorm = 0;
            switch (tab) {
                case '24H':
                case '1W':
                    yNorm = progress * 0.4 + 0.3;
                    break;
                case '28D':
                case '90D':
                    const ageFactor = Math.min(1, daysSince / 30);
                    yNorm = Math.pow(progress, 2) * 0.8 * ageFactor + 0.1;
                    break;
                case 'Max':
                default:
                    yNorm = 1 / (1 + Math.exp(-10 * (progress - 0.5)));
                    yNorm = yNorm * 0.8 + 0.1;
                    break;
            }
            if (i > 0 && i < segments) {
                yNorm += (Math.sin(progress * 10 + seed * 10) * 0.02);
            }
            yNorm = Math.max(0, Math.min(1, yNorm));
            points.push([x, height - (yNorm * height)]);
        }
        const d = points.reduce((acc, pt, i) => (i === 0 ? `M ${pt[0]},${pt[1]}` : `${acc} L ${pt[0]},${pt[1]}`), "");
        return { stroke: d, fill: `${d} V ${height + 20} H 0 Z` };
    };

    const graphPaths = useMemo(() => {
        if (!metrics) return { stroke: "", fill: "" };
        return getGraphPaths(activeGraphTab, metrics.viewCount, metrics.daysSince);
    }, [activeGraphTab, metrics]);

    // Growth Labels & Tiers
    const growthStatus = useMemo(() => {
        if (!metrics) return { label: 'Analyzing...', color: '#888' };
        const { velocity, subCount, daysSince } = metrics;
        const viralThreshold = Math.max(subCount * 0.05, 500);
        if (velocity > viralThreshold * 5) return { label: '🔥 Viral', color: '#ff4444' };
        if (velocity > viralThreshold) return { label: '🚀 Trending', color: '#23b5b5' };
        if (daysSince < 7 && velocity > 100) return { label: '✨ New & Rising', color: '#fcb103' };
        if (metrics.engagement > 8) return { label: '💎 High Engagement', color: '#9c27b0' };
        return { label: '● Stable Growth', color: '#4caf50' };
    }, [metrics]);

    const rankTier = useMemo(() => {
        if (!metrics) return { label: '---', color: '#888' };
        const s = metrics.scoreValue;
        if (s > 5.0) return { label: 'Diamond Tier (Top 1%)', color: '#b9f2ff' };
        if (s > 2.0) return { label: 'Gold Tier (Top 5%)', color: '#ffd700' };
        if (s > 0.5) return { label: 'Silver Tier (Top 20%)', color: '#c0c0c0' };
        return { label: 'Bronze Tier', color: '#cd7f32' };
    }, [metrics]);

    const handleSaveBenchmark = () => {
        if (metrics && data) {
            const toSave: BenchmarkData = { ...metrics, title: data.title, savedAt: Date.now() };
            chrome.storage.local.set({ 'viewstat_benchmark': toSave }, () => {
                setBenchmark(toSave);
                // Don't alert here, simpler UX
            });
        }
    };

    const handleClearBenchmark = (e: React.MouseEvent) => {
        e.stopPropagation();
        chrome.storage.local.remove('viewstat_benchmark', () => {
            setBenchmark(null);
            if (viewMode === 'COMPARE') setViewMode('VIEWS');
        });
    };



    // Need to adapt types for the fetched data which matches YouTubeStats interface vs YouTubeVideoData
    // We can just cast or normalize. 
    const handleAnalyzeLink = () => {
        if (!benchmarkLink) return;
        setIsFetching(true);
        chrome.runtime.sendMessage({ type: 'FETCH_VIDEO_DATA', payload: benchmarkLink }, (response) => {
            setIsFetching(false);
            if (response && response.success && response.data) {
                // response.data is formatted like Popup's expected stats. Normalize here if needed.
                const raw = response.data;
                // create compatible object for calculateMetrics
                // Note: YouTubeVideoData and YouTubeStats are slightly different types (one has strings, one optional)
                // We'll just manually construct metrics here to avoid type soup.

                const viewCount = parseCount(raw.views);
                const subCount = parseCount(raw.subscribers);
                const likeCount = parseCount(raw.likes);
                // ... same date logic ...
                // Actually, let's just make a mini-helper since we are inside the component

                const now = new Date();
                let d = new Date(raw.date || '');
                if (isNaN(d.getTime())) d = now;

                const days = Math.max(1, Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)));
                const vel = Math.round(viewCount / days);
                const eng = viewCount > 0 ? (likeCount / viewCount) * 100 : 0;
                const base = subCount > 0 ? subCount : 1000;
                const sc = viewCount / base;

                const toSave: BenchmarkData = {
                    viewCount, subCount, likeCount, daysSince: days, velocity: vel, engagement: eng,
                    score: sc.toFixed(1), scoreValue: sc,
                    title: raw.title || 'Unknown',
                    savedAt: Date.now()
                };

                chrome.storage.local.set({ 'viewstat_benchmark': toSave }, () => {
                    setBenchmark(toSave);
                    setBenchmarkLink('');
                });
            } else {
                alert('Failed to analyze video.');
            }
        });
    };

    const handleCopyStats = () => {
        if (!metrics || !data) return;
        const text = `
📺 ${data.title}
👀 Views: ${formatLarge(metrics.viewCount)}
⚡ Velocity: ${formatLarge(metrics.velocity)}/day
💗 Engagement: ${metrics.engagement.toFixed(2)}%
💎 Rank: ${rankTier.label}
🚀 Status: ${growthStatus.label}
        `.trim();
        navigator.clipboard.writeText(text);
        alert('Stats copied!');
    };

    if (!data || !metrics) return null;

    const formatNumber = (str: string) => str.replace(/ views| subscribers| likes/g, '');
    const formatLarge = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };
    const timeAgo = (dateString?: string) => {
        if (!dateString) return 'recently';
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return dateString;
        const diff = new Date().getTime() - d.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days < 30) return `${days} days ago`;
        if (days < 365) return `${Math.floor(days / 30)} months ago`;
        return `${Math.floor(days / 365)} years ago`;
    };





    return (
        <div className="viewstack-overlay">
            <button className="viewstack-close-btn" onClick={onClose}>&times;</button>

            {/* Header */}
            <div className="viewstack-header" style={{ alignItems: 'center' }}>
                <div className="viewstack-logo-area">
                    <div className="viewstack-logo-icon">V</div>
                    <div className="viewstack-title-group">
                        <span className="viewstack-brand">YT<br />Insights</span>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                    <button
                        onClick={() => setViewMode('VIEWS')}
                        className={viewMode === 'VIEWS' ? 'viewstack-tab active' : 'viewstack-tab'}
                        style={{
                            background: viewMode === 'VIEWS' ? 'rgba(35, 181, 181, 0.2)' : 'transparent',
                            color: viewMode === 'VIEWS' ? '#23b5b5' : '#666',
                            border: viewMode === 'VIEWS' ? '1px solid #23b5b5' : '1px solid transparent',
                            borderRadius: '12px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer'
                        }}
                    >
                        Views
                    </button>
                    <button
                        onClick={() => setViewMode('COMPARE')}
                        className={viewMode === 'COMPARE' ? 'viewstack-tab active' : 'viewstack-tab'}
                        style={{
                            background: viewMode === 'COMPARE' ? 'rgba(35, 181, 181, 0.2)' : 'transparent',
                            color: viewMode === 'COMPARE' ? '#23b5b5' : '#666',
                            border: viewMode === 'COMPARE' ? '1px solid #23b5b5' : '1px solid transparent',
                            borderRadius: '12px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer'
                        }}
                    >
                        Compare
                    </button>
                    <button
                        onClick={() => setViewMode('RANKING')}
                        className={viewMode === 'RANKING' ? 'viewstack-tab active' : 'viewstack-tab'}
                        style={{
                            background: viewMode === 'RANKING' ? 'rgba(35, 181, 181, 0.2)' : 'transparent',
                            color: viewMode === 'RANKING' ? '#23b5b5' : '#666',
                            border: viewMode === 'RANKING' ? '1px solid #23b5b5' : '1px solid transparent',
                            borderRadius: '12px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer'
                        }}
                    >
                        Ranking
                    </button>
                </div>
            </div>

            {/* Main Stats (Visible in all modes) */}
            <div>
                <div className="viewstack-main-stat">
                    <div className="viewstack-stat-number">{formatNumber(data.views)}</div>
                    <div className="viewstack-btn-accent" style={{ color: rankTier.color, borderColor: rankTier.color }}>
                        <span>{rankTier.label}</span>
                    </div>
                </div>
                <div className="viewstack-stat-context">
                    views · Since published
                    {viewMode === 'COMPARE' && benchmark && <div style={{ color: '#888', fontSize: '11px', marginTop: '4px' }}>Vs: {benchmark.title}</div>}
                </div>
            </div>

            {/* Comparison / Layout Logic */}
            {viewMode === 'RANKING' ? (
                <>
                    {/* Insights Area (Top for Ranking) */}
                    <div className="viewstack-insights">
                        <div className="viewstack-insights-title"><span>🏆 Ranking Tier</span></div>
                        <div style={{ padding: '10px 0', textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', fontWeight: 700, color: rankTier.color, marginBottom: '4px' }}>{rankTier.label.split('(')[0]}</div>
                            <div style={{ fontSize: '12px', color: '#888' }}>{rankTier.label.split('(')[1]?.replace(')', '') || 'Performance Class'}</div>
                            <div style={{ marginTop: '12px', fontSize: '13px', color: '#ccc' }}>
                                Your Virality Score: <span style={{ color: '#fff', fontWeight: 700 }}>{metrics.scoreValue.toFixed(2)}x</span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                                (Views ÷ Subscribers)
                            </div>
                        </div>
                    </div>

                    {/* Middle Card (Graph - Bottom for Ranking) */}
                    <div className="viewstack-middle-card">
                        <div className="viewstack-velocity-row">
                            <div className="viewstack-velocity-item">
                                <span className="viewstack-velocity-icon">⚡</span>
                                <div>
                                    <div style={{ fontSize: '10px', color: '#888', fontWeight: 400 }}>Current Velocity</div>
                                    +{formatLarge(metrics.velocity)} views/day
                                </div>
                            </div>
                            <div className="viewstack-growth-status" style={{ color: growthStatus.color }}>{growthStatus.label}</div>
                        </div>
                        <div className="viewstack-filters">
                            {['24H', '1W', '28D', '90D', 'Max'].map(tab => (
                                <button key={tab} className={`viewstack-filter-tab ${activeGraphTab === tab ? 'active' : ''}`} onClick={() => setActiveGraphTab(tab)}>{tab}</button>
                            ))}
                            <button className="viewstack-filter-tab" style={{ marginLeft: 'auto' }}>↻</button>
                        </div>
                        <div className="viewstack-graph-area">
                            <svg width="100%" height="100%" viewBox="0 0 320 120" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                                <defs>
                                    <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" style={{ stopColor: '#23b5b5', stopOpacity: 0.4 }} />
                                        <stop offset="100%" style={{ stopColor: '#23b5b5', stopOpacity: 0 }} />
                                    </linearGradient>
                                </defs>
                                <path d={graphPaths.fill} fill="url(#grad1)" />
                                <path d={graphPaths.stroke} fill="none" stroke="#23b5b5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                <circle cx={graphPaths.stroke.split(' ').slice(-1)[0]?.split(',')[0]} cy={graphPaths.stroke.split(' ').slice(-1)[0]?.split(',')[1]} r="4" fill="#fcb103" stroke="#1a1a1a" strokeWidth="2" />
                            </svg>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    {/* Middle Card (Graph - Top for Others) */}
                    <div className="viewstack-middle-card">
                        <div className="viewstack-velocity-row">
                            <div className="viewstack-velocity-item">
                                <span className="viewstack-velocity-icon">⚡</span>
                                <div>
                                    <div style={{ fontSize: '10px', color: '#888', fontWeight: 400 }}>Current Velocity</div>
                                    +{formatLarge(metrics.velocity)} views/day
                                </div>
                            </div>
                            <div className="viewstack-growth-status" style={{ color: growthStatus.color }}>{growthStatus.label}</div>
                        </div>
                        <div className="viewstack-filters">
                            {['24H', '1W', '28D', '90D', 'Max'].map(tab => (
                                <button key={tab} className={`viewstack-filter-tab ${activeGraphTab === tab ? 'active' : ''}`} onClick={() => setActiveGraphTab(tab)}>{tab}</button>
                            ))}
                            <button className="viewstack-filter-tab" style={{ marginLeft: 'auto' }}>↻</button>
                        </div>
                        <div className="viewstack-graph-area">
                            <svg width="100%" height="100%" viewBox="0 0 320 120" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                                <defs>
                                    <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" style={{ stopColor: '#23b5b5', stopOpacity: 0.4 }} />
                                        <stop offset="100%" style={{ stopColor: '#23b5b5', stopOpacity: 0 }} />
                                    </linearGradient>
                                </defs>
                                <path d={graphPaths.fill} fill="url(#grad1)" />
                                <path d={graphPaths.stroke} fill="none" stroke="#23b5b5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                <circle cx={graphPaths.stroke.split(' ').slice(-1)[0]?.split(',')[0]} cy={graphPaths.stroke.split(' ').slice(-1)[0]?.split(',')[1]} r="4" fill="#fcb103" stroke="#1a1a1a" strokeWidth="2" />
                            </svg>
                        </div>
                    </div>

                    {/* Insights (Bottom for Others) */}
                    <div className="viewstack-insights">
                        {viewMode === 'VIEWS' && (
                            <>
                                <div className="viewstack-insights-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>💡 Key Insights</span>
                                    <button onClick={handleCopyStats} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '12px', padding: 0 }}>📋 Copy</button>
                                </div>
                                <ul className="viewstack-insights-list">
                                    <li className="viewstack-insight-item"><span className="viewstack-insight-bullet"></span>Generating ~{formatLarge(metrics.velocity)} views per day</li>
                                    <li className="viewstack-insight-item"><span className="viewstack-insight-bullet"></span>Engagement Rate: {metrics.engagement.toFixed(2)}% ({formatLarge(metrics.likeCount)} likes)</li>
                                    <li className="viewstack-insight-item"><span className="viewstack-insight-bullet yellow"></span>Published {metrics.daysSince} days ago ({data.date})</li>
                                </ul>
                            </>
                        )}

                        {viewMode === 'COMPARE' && (
                            <>
                                <div className="viewstack-insights-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>⚖️ Comparison Matrix</span>
                                </div>
                                {benchmark ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0px 0' }}>
                                        <div style={{
                                            background: 'rgba(255,255,255,0.05)',
                                            padding: '8px',
                                            borderRadius: '4px',
                                            marginBottom: '4px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <div style={{ overflow: 'hidden' }}>
                                                <div style={{ fontSize: '10px', color: '#888' }}>VS Benchmark:</div>
                                                <div style={{ fontSize: '11px', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }}>{benchmark.title}</div>
                                            </div>
                                            <button
                                                onClick={handleClearBenchmark}
                                                style={{
                                                    background: 'rgba(255,68,68,0.2)',
                                                    border: '1px solid #ff4444',
                                                    color: '#ff4444',
                                                    borderRadius: '4px',
                                                    padding: '4px 8px',
                                                    fontSize: '10px',
                                                    cursor: 'pointer',
                                                    fontWeight: 600
                                                }}
                                            >
                                                Remove
                                            </button>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888', borderBottom: '1px solid #333', paddingBottom: '4px' }}><span>Metric</span><span>Current vs Bench</span></div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {[
                                                { label: 'Views', curr: metrics.viewCount, bench: benchmark.viewCount, fmt: formatLarge },
                                                { label: 'Velocity', curr: metrics.velocity, bench: benchmark.velocity, fmt: (v: number) => formatLarge(v) + '/d' },
                                                { label: 'Engagement', curr: metrics.engagement, bench: benchmark.engagement, fmt: (v: number) => v.toFixed(2) + '%' },
                                                { label: 'Score', curr: metrics.scoreValue, bench: benchmark.scoreValue, fmt: (v: number) => v.toFixed(1) + 'x' },
                                            ].map(row => {
                                                const winner = row.curr >= row.bench ? 'curr' : 'bench';
                                                return (
                                                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ color: '#ccc', fontSize: '12px' }}>{row.label}</span>
                                                        <div style={{ fontSize: '12px' }}>
                                                            <span style={{ color: winner === 'curr' ? '#4caf50' : '#888', marginRight: '6px' }}>
                                                                {row.fmt(row.curr)}
                                                            </span>
                                                            <span style={{ color: '#666', fontSize: '10px' }}>vs</span>
                                                            <span style={{ color: winner === 'bench' ? '#4caf50' : '#888', marginLeft: '6px' }}>
                                                                {row.fmt(row.bench)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '10px 0' }}>
                                        <p style={{ color: '#888', fontSize: '12px', marginBottom: '8px' }}>Compare this video with another:</p>

                                        <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
                                            <input
                                                type="text"
                                                placeholder="Paste YouTube Link..."
                                                value={benchmarkLink}
                                                onChange={(e) => setBenchmarkLink(e.target.value)}
                                                style={{ flex: 1, background: '#1a1a1a', border: '1px solid #333', color: '#fff', borderRadius: '4px', padding: '6px', fontSize: '11px' }}
                                            />
                                            <button
                                                onClick={handleAnalyzeLink}
                                                disabled={isFetching || !benchmarkLink}
                                                style={{ background: '#23b5b5', border: 'none', borderRadius: '4px', color: '#121212', padding: '0 12px', cursor: 'pointer', fontWeight: 600, fontSize: '11px', opacity: isFetching ? 0.5 : 1 }}
                                            >
                                                {isFetching ? '...' : 'Go'}
                                            </button>
                                        </div>

                                        <div style={{ fontSize: '10px', color: '#666', margin: '8px 0' }}>— OR —</div>

                                        <button onClick={() => { handleSaveBenchmark(); setViewMode('COMPARE'); }} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid #333', borderRadius: '4px', color: '#ccc', padding: '8px', cursor: 'pointer', fontSize: '11px' }}>
                                            Save Current Video as Benchmark
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </>
            )}

            {/* Bottom Card (Current Video) */}
            <div className="viewstack-bottom-card">
                <div className="viewstack-video-thumb">
                    <img src={data.thumbnailUrl} alt="Thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/60x34?text=YT'; }} />
                </div>
                <div className="viewstack-video-info">
                    <div className="viewstack-video-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{data.title}</div>
                    <div className="viewstack-video-meta">{data.views} • {timeAgo(data.date)}</div>
                </div>
                <div className="viewstack-video-score">{metrics.score}x</div>
            </div>
        </div>
    );
};

export default Overlay;
