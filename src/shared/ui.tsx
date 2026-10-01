import { useId } from 'react';
import type { ReactNode } from 'react';
import type { Tone } from './sampleData';

// ---------- Icons ----------
export type IconName =
    | 'eye' | 'bars' | 'heart' | 'users' | 'star' | 'sparkle' | 'bulb' | 'trend' | 'external'
    | 'arrow' | 'chevron' | 'gear' | 'x' | 'search' | 'swap' | 'plus' | 'alert' | 'doc'
    | 'info' | 'trophy' | 'message' | 'minus' | 'more' | 'up' | 'down';

const PATHS: Record<IconName, ReactNode> = {
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
    bars: <path d="M6 20v-8M12 20V5M18 20v-6" />,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" />,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></>,
    star: <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" />,
    sparkle: <><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /><path d="M19 15l.7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7z" /></>,
    bulb: <><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.3 1 2.1h5c0-.8.4-1.6 1-2.1A6 6 0 0 0 12 3z" /></>,
    trend: <><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></>,
    external: <><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><path d="M15 3h6v6M10 14L21 3" /></>,
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
    chevron: <path d="M6 9l6 6 6-6" />,
    gear: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
    x: <path d="M18 6L6 18M6 6l12 12" />,
    search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>,
    swap: <path d="M17 3l4 4-4 4M3 7h18M7 21l-4-4 4-4M21 17H3" />,
    plus: <path d="M12 5v14M5 12h14" />,
    alert: <><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></>,
    doc: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h8" /></>,
    info: <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></>,
    trophy: <><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" /></>,
    message: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
    minus: <path d="M5 12h14" />,
    more: <><circle cx="12" cy="5" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="12" cy="19" r="1.2" /></>,
    up: <path d="M12 19V5M5 12l7-7 7 7" />,
    down: <path d="M12 5v14M19 12l-7 7-7-7" />,
};

export const Icon = ({ name, size = 16, className }: { name: IconName; size?: number; className?: string }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
        strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
        {PATHS[name]}
    </svg>
);

export const YouTubeLogo = () => (
    <svg viewBox="0 0 32 32" width="34" height="34" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#ff2b2b" />
        <path d="M13 10.5v11l9-5.5z" fill="#fff" />
    </svg>
);

// ---------- Building blocks ----------
export const SampleBadge = () => (
    <span className="yti-sample" title="Placeholder data. A real data source is not connected yet.">Sample</span>
);

export const Card = ({ title, icon, sample, action, info, className = '', children }: {
    title?: ReactNode; icon?: ReactNode; sample?: boolean; action?: ReactNode; info?: boolean;
    className?: string; children: ReactNode;
}) => (
    <section className={`yti-card ${className}`}>
        {(title || action) && (
            <header className="yti-card-head">
                <h3>
                    {icon}
                    {title}
                    {info && <Icon name="info" size={13} className="yti-info" />}
                    {sample && <SampleBadge />}
                </h3>
                {action}
            </header>
        )}
        {children}
    </section>
);

export const SoonButton = ({ children, className = 'yti-btn' }: { children: ReactNode; className?: string }) => (
    <button type="button" className={className} title="Coming soon">{children}</button>
);

export const ViewAll = () => (
    <button type="button" className="yti-link" title="Coming soon">View all <Icon name="arrow" size={13} /></button>
);

export const Pill = ({ tone, icon, children }: { tone: Tone; icon?: IconName; children: ReactNode }) => (
    <span className={`yti-pill ${tone}`}>{icon && <Icon name={icon} size={12} />}{children}</span>
);

export const Bar = ({ pct, color, max = 100 }: { pct: number; color: string; max?: number }) => (
    <div className="yti-bar"><div style={{ width: `${Math.min(100, (pct / max) * 100)}%`, background: color }} /></div>
);

export const EmptyState = ({ text }: { text: string }) => (
    <div className="yti-empty">
        <Icon name="eye" size={22} />
        <p>{text}</p>
    </div>
);

// ---------- Charts ----------
export const AreaChart = ({ values, color, yLabels, xLabels }: {
    values: number[]; color: string; yLabels: string[]; xLabels: string[];
}) => {
    const id = useId().replace(/:/g, '');
    const W = 400, H = 140;
    const step = W / Math.max(1, values.length - 1);
    const pts = values.map((v, i) => [step * i, H - v * H]);
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const area = `${line} L${W},${H} L0,${H} Z`;
    return (
        <div className="yti-chart">
            <div className="yti-chart-y">{yLabels.map(l => <span key={l}>{l}</span>)}</div>
            <div className="yti-chart-body">
                <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
                    <defs>
                        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0" stopColor={color} stopOpacity="0.38" />
                            <stop offset="1" stopColor={color} stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    {[0, 1, 2, 3].map(i => (
                        <line key={i} x1="0" x2={W} y1={(H / 3) * i} y2={(H / 3) * i}
                            stroke="rgba(255,255,255,0.06)" vectorEffect="non-scaling-stroke" />
                    ))}
                    <path d={area} fill={`url(#${id})`} />
                    <path d={line} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round"
                        strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                </svg>
                <div className="yti-chart-x">{xLabels.map(l => <span key={l}>{l}</span>)}</div>
            </div>
        </div>
    );
};

export const Donut = ({ segments, center, sub }: {
    segments: { value: number; color: string }[]; center: string; sub: string;
}) => {
    const r = 50, c = 2 * Math.PI * r;
    const total = segments.reduce((s, x) => s + x.value, 0) || 1;
    let offset = 0;
    return (
        <div className="yti-donut">
            <svg viewBox="0 0 120 120" width="130" height="130">
                <g transform="rotate(-90 60 60)">
                    <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                    {segments.map((s, i) => {
                        const len = (s.value / total) * c;
                        const el = (
                            <circle key={i} cx="60" cy="60" r={r} fill="none" stroke={s.color} strokeWidth="12"
                                strokeDasharray={`${Math.max(0, len - 2)} ${c - Math.max(0, len - 2)}`}
                                strokeDashoffset={-offset} />
                        );
                        offset += len;
                        return el;
                    })}
                </g>
            </svg>
            <div className="yti-donut-center"><strong>{center}</strong><span>{sub}</span></div>
        </div>
    );
};
