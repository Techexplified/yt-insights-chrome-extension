// Shared data types + metric helpers used by both the popup and the on-page overlay.

export interface VideoData {
    videoId?: string;
    title?: string;
    channelName?: string;
    views?: string;
    subscribers?: string;
    thumbnailUrl?: string;
    date?: string;
    likes?: string;
}

export interface ComputedMetrics {
    viewCount: number;
    subCount: number;
    likeCount: number;
    daysSince: number;
    velocity: number;
    engagement: number;
    score: string; // Virality score, formatted
    scoreValue: number;
}

export interface BenchmarkData extends ComputedMetrics {
    title: string;
    thumbnailUrl?: string;
    channelName?: string;
    savedAt: number;
}

export const BENCHMARK_KEY = 'viewstat_benchmark';

// ---------- Parsing / formatting ----------

export const parseCount = (str?: string): number => {
    if (!str) return 0;
    const clean = str.replace(/,| views| subscribers| likes/g, '');
    const last = clean.slice(-1).toUpperCase();
    const num = parseFloat(clean);
    if (last === 'K') return num * 1000;
    if (last === 'M') return num * 1000000;
    if (last === 'B') return num * 1000000000;
    return isNaN(num) ? 0 : num;
};

export const formatLarge = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return Math.round(num).toString();
};

export const timeAgo = (dateString?: string): string => {
    if (!dateString) return 'recently';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const days = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (days < 0) return 'recently';
    if (days < 1) return 'today';
    if (days < 30) return `${days} days ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
};

export const joinList = (items: string[]): string => {
    if (items.length <= 1) return items.join('');
    return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
};

// ---------- Core metrics ----------

export const computeMetrics = (d: VideoData): ComputedMetrics => {
    const viewCount = parseCount(d.views);
    const subCount = parseCount(d.subscribers);
    const likeCount = parseCount(d.likes);

    const now = new Date();
    let date = new Date(d.date || '');
    if (isNaN(date.getTime()) && d.date) date = new Date(Date.parse(d.date));
    if (isNaN(date.getTime())) date = now;

    const daysSince = Math.max(1, Math.floor((now.getTime() - date.getTime()) / 86400000));
    const velocity = Math.round(viewCount / daysSince);
    const engagement = viewCount > 0 ? (likeCount / viewCount) * 100 : 0;

    const baseline = subCount > 0 ? subCount : 1000;
    const score = viewCount / baseline;

    return {
        viewCount, subCount, likeCount, daysSince, velocity, engagement,
        score: score.toFixed(1),
        scoreValue: score,
    };
};

export interface Tier { name: string; note: string; color: string; label: string }

export const getRankTier = (m: ComputedMetrics): Tier => {
    const s = m.scoreValue;
    const make = (name: string, note: string, color: string): Tier =>
        ({ name, note, color, label: `${name} Tier (${note})` });
    if (s > 5.0) return make('Diamond', 'Top 1%', '#b9f2ff');
    if (s > 2.0) return make('Gold', 'Top 5%', '#ffd24a');
    if (s > 0.5) return make('Silver', 'Top 20%', '#c8ccd4');
    return make('Bronze', 'Below Top 20%', '#cd7f32');
};

export const getGrowthStatus = (m: ComputedMetrics): { label: string; color: string } => {
    const { velocity, subCount, daysSince } = m;
    const viralThreshold = Math.max(subCount * 0.05, 500);
    if (velocity > viralThreshold * 5) return { label: '🔥 Viral', color: '#ff4d4d' };
    if (velocity > viralThreshold) return { label: '🚀 Trending', color: '#34d16f' };
    if (daysSince < 7 && velocity > 100) return { label: '✨ New & Rising', color: '#f5b83d' };
    if (m.engagement > 8) return { label: '💎 High Engagement', color: '#a56bff' };
    return { label: '● Stable Growth', color: '#8b93a3' };
};

export const explainPerformance = (m: ComputedMetrics): { good: boolean; title: string; text: string } => {
    const growth = getGrowthStatus(m).label;
    const parts: string[] = [];
    if (m.scoreValue >= 2) parts.push(`it has reached ${m.score}x the channel's subscriber count in views`);
    if (/Viral|Trending|Rising/.test(growth)) parts.push(`it is gaining about ${formatLarge(m.velocity)} views per day`);
    if (m.engagement >= 4) parts.push(`viewers are engaging strongly (${m.engagement.toFixed(1)}% like rate)`);
    if (parts.length) {
        return { good: true, title: 'Why is this video performing well?', text: `This video is doing well because ${joinList(parts)}.` };
    }
    return {
        good: false,
        title: 'How is this video performing?',
        text: `This video is averaging ${formatLarge(m.velocity)} views per day with a ${m.engagement.toFixed(1)}% like rate. No standout growth signals yet.`,
    };
};

// ---------- Trend chart helpers (estimated curve; real daily history is not scraped) ----------

export type Range = '24H' | '1W' | '28D' | '90D' | 'Max';
export const RANGES: { key: Range; label: string }[] = [
    { key: '24H', label: 'Last 24 hours' },
    { key: '1W', label: 'Last 7 days' },
    { key: '28D', label: 'Last 28 days' },
    { key: '90D', label: 'Last 90 days' },
    { key: 'Max', label: 'Since published' },
];

export const rangeDays = (range: Range, daysSince: number): number => {
    switch (range) {
        case '24H': return 1;
        case '1W': return 7;
        case '28D': return 28;
        case '90D': return 90;
        default: return Math.max(2, daysSince);
    }
};

export const buildTrend = (range: Range, viewCount: number, daysSince: number): number[] => {
    const segments = 20;
    const seed = (viewCount % 100) / 100;
    const out: number[] = [];
    for (let i = 0; i <= segments; i++) {
        const progress = i / segments;
        let y: number;
        if (range === '24H' || range === '1W') {
            y = progress * 0.4 + 0.3;
        } else if (range === '28D' || range === '90D') {
            const ageFactor = Math.min(1, daysSince / 30);
            y = Math.pow(progress, 2) * 0.8 * ageFactor + 0.1;
        } else {
            y = (1 / (1 + Math.exp(-10 * (progress - 0.5)))) * 0.8 + 0.1;
        }
        if (i > 0 && i < segments) y += Math.sin(progress * 10 + seed * 10) * 0.02;
        out.push(Math.max(0, Math.min(1, y)));
    }
    return out;
};

export const shortDate = (d: Date): string =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export const xLabelsFor = (days: number): string[] => {
    if (days <= 1) return ['24h ago', '18h', '12h', '6h', 'Now'];
    const now = Date.now();
    return [0, 1, 2, 3, 4].map(i => shortDate(new Date(now - days * 86400000 * (1 - i / 4))));
};

export const pctDiff = (a: number, b: number): number | null => (b > 0 ? ((a - b) / b) * 100 : null);
