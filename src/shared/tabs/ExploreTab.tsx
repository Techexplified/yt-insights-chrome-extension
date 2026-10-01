import { useState } from 'react';
import {
    SAMPLE_ASKED, SAMPLE_POPULAR, SAMPLE_RELATED, SAMPLE_TRENDING,
} from '../sampleData';
import { Card, Icon, Pill, ViewAll } from '../ui';

// Entire tab is placeholder content until a keyword/trends data source exists.
export const ExploreTab = () => {
    const [query, setQuery] = useState('');
    const q = query.trim().toLowerCase();
    const trending = SAMPLE_TRENDING.filter(t => !q || t.title.toLowerCase().includes(q));

    return (
        <>
            <div className="yti-title-row">
                <div>
                    <h2 className="yti-h2">Explore topics</h2>
                    <p className="yti-sub">Discover trending ideas, keywords and questions your audience is searching for.</p>
                </div>
                <select className="yti-select" defaultValue="IN"><option value="IN">India</option><option value="US">United States</option></select>
            </div>

            <div className="yti-banner"><Icon name="info" size={14} /> Sample data. Connect a keyword data source to see real search volume.</div>

            <div className="yti-filters">
                <label className="yti-search">
                    <Icon name="search" size={16} className="yti-muted" />
                    <input placeholder="Search topics, keywords or questions…" value={query} onChange={e => setQuery(e.target.value)} />
                </label>
                <select className="yti-select" defaultValue="all"><option value="all">All categories</option></select>
                <select className="yti-select" defaultValue="trending"><option value="trending">Trending</option></select>
                <select className="yti-select" defaultValue="30"><option value="30">Last 30 days</option></select>
            </div>

            <div>
                <h3 className="yti-h3">Popular right now</h3>
                <div className="yti-chips">
                    {SAMPLE_POPULAR.map(p => <button type="button" key={p} className="yti-chip" onClick={() => setQuery(p)}>{p}</button>)}
                </div>
            </div>

            <Card title="Trending topics" action={
                <select className="yti-select" defaultValue="rel"><option value="rel">Sort by: Relevance</option></select>
            }>
                <ul className="yti-trending">
                    {trending.map((t, i) => (
                        <li key={t.title}>
                            <span className="yti-num">{i + 1}</span>
                            <span className="yti-opp-title">{t.title}</span>
                            <Pill tone={t.demand[1]}>{t.demand[0]}</Pill>
                            <div><strong>{t.volume}</strong><small>search volume</small></div>
                            <div><strong>{t.growth}</strong><small>growth (30d)</small></div>
                        </li>
                    ))}
                    {!trending.length && <li className="yti-none">No sample topics match "{query}".</li>}
                </ul>
            </Card>

            <div className="yti-grid-2">
                <Card title="Related searches" icon={<Icon name="bulb" size={16} className="yti-yellow" />} action={<ViewAll />}>
                    <ul className="yti-rows">{SAMPLE_RELATED.map(r => <li key={r.text}><span>{r.text}</span><em>{r.volume}</em></li>)}</ul>
                </Card>
                <Card title="Questions people are asking" icon={<Icon name="message" size={16} className="yti-purple" />} action={<ViewAll />}>
                    <ul className="yti-rows">{SAMPLE_ASKED.map(r => <li key={r.text}><span>{r.text}</span><em>{r.volume}</em></li>)}</ul>
                </Card>
            </div>
        </>
    );
};
