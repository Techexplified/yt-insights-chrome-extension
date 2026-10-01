// Placeholder data for sections that don't have a real data source yet.
// Replace these with real API / scraper results when available.

export const SAMPLE_SENTIMENT = {
    total: '12.4K',
    segments: [
        { label: 'Positive', value: 72, color: '#34d16f' },
        { label: 'Neutral', value: 21, color: '#8b93a3' },
        { label: 'Negative', value: 7, color: '#ff5b5b' },
    ],
};

export const SAMPLE_COMMENT_THEMES = [
    { label: 'Productivity tips', pct: 28 },
    { label: 'Routine & habit building', pct: 18 },
    { label: 'Tool recommendations', pct: 12 },
    { label: 'Motivational feedback', pct: 10 },
    { label: 'Questions about process', pct: 8 },
];

export const SAMPLE_QUESTIONS = [
    { text: '"What app do you use for this?"', mentions: 423 },
    { text: '"How do you stay consistent?"', mentions: 312 },
    { text: '"Can you share a template?"', mentions: 187 },
];

export const SAMPLE_PAIN_POINTS = [
    { label: 'Difficulty staying consistent', pct: 21 },
    { label: 'Overwhelm with too many tools', pct: 14 },
    { label: 'Lack of time', pct: 11 },
];

export const SAMPLE_COMMENT_VOLUME = [
    0.1, 0.2, 0.25, 0.22, 0.33, 0.35, 0.42, 0.55, 0.58, 0.38, 0.3, 0.42, 0.6, 0.72,
    0.6, 0.45, 0.42, 0.4, 0.55, 0.85, 0.55, 0.5, 0.55, 0.5, 0.45, 0.47, 0.5, 0.52,
];

export const SAMPLE_AUDIENCE_TAKEAWAY =
    'Viewers love the practical structure but often ask for more specific tools and templates. Many also mention struggling with consistency, which presents an opportunity for follow-up content.';

export type Tone = 'green' | 'yellow' | 'blue' | 'red' | 'gray' | 'purple';

export const SAMPLE_OPPORTUNITY_STATS = [
    { label: 'High opportunity topics', value: '12', delta: '+33%', icon: 'trend' as const, tone: 'green' as Tone },
    { label: 'Frequently requested', value: '28', delta: '+40%', icon: 'users' as const, tone: 'blue' as Tone },
    { label: 'Low competition topics', value: '9', delta: '+50%', icon: 'bars' as const, tone: 'purple' as Tone },
];

export const SAMPLE_OPPORTUNITIES = [
    { title: "Beginner's guide to focus techniques", demand: ['High demand', 'green'], competition: ['Low competition', 'blue'], requests: 127 },
    { title: 'Best productivity tools in 2024', demand: ['High demand', 'green'], competition: ['Medium competition', 'yellow'], requests: 84 },
    { title: 'How to build a consistent routine', demand: ['Medium demand', 'yellow'], competition: ['Low competition', 'blue'], requests: 56 },
    { title: 'Overcoming procrastination (real examples)', demand: ['High demand', 'green'], competition: ['High competition', 'red'], requests: 49 },
    { title: 'Focus routine for students', demand: ['Medium demand', 'yellow'], competition: ['Low competition', 'blue'], requests: 42 },
] as { title: string; demand: [string, Tone]; competition: [string, Tone]; requests: number }[];

export const SAMPLE_UNANSWERED = [
    { text: '"What app do you use for this?"', mentions: 423 },
    { text: '"How do you stay consistent?"', mentions: 312 },
    { text: '"Can you make a video on your morning routine?"', mentions: 198 },
    { text: '"How do you deal with distractions?"', mentions: 176 },
];

export const SAMPLE_GAPS = [
    { label: 'Focus for remote work', pct: 62, level: 'Low' },
    { label: 'Productivity for students', pct: 32, level: 'Medium' },
    { label: 'Minimalist workspace setup', pct: 30, level: 'Medium' },
    { label: 'Deep work techniques', pct: 60, level: 'Low' },
];

export const SAMPLE_POPULAR = [
    'Study routine', 'Productivity', 'AI tools', 'Career advice', 'Notion', 'Habit building', 'Resume tips', 'Remote work',
];

export const SAMPLE_TRENDING = [
    { title: 'How to be consistent', demand: ['High demand', 'green'], volume: '128K', growth: '+62%' },
    { title: 'Best productivity tools', demand: ['High demand', 'green'], volume: '96K', growth: '+48%' },
    { title: 'How to build a routine', demand: ['Medium demand', 'yellow'], volume: '74K', growth: '+36%' },
    { title: 'Remote internship tips', demand: ['High demand', 'green'], volume: '62K', growth: '+52%' },
    { title: 'Resume for freshers', demand: ['Medium demand', 'yellow'], volume: '58K', growth: '+28%' },
] as { title: string; demand: [string, Tone]; volume: string; growth: string }[];

export const SAMPLE_RELATED = [
    { text: 'how to be consistent in studies', volume: '42K' },
    { text: 'productivity tools for students', volume: '38K' },
    { text: 'how to build a daily routine', volume: '31K' },
    { text: 'best notion templates', volume: '28K' },
    { text: 'how to avoid distractions', volume: '26K' },
];

export const SAMPLE_ASKED = [
    { text: 'How do I stay consistent?', volume: '12K' },
    { text: 'What are the best productivity tools?', volume: '9.8K' },
    { text: 'How can I build a routine from scratch?', volume: '8.6K' },
    { text: 'How do I stop wasting time?', volume: '7.4K' },
    { text: 'What skills should I learn in 2026?', volume: '6.1K' },
];
