import {
    SAMPLE_GAPS, SAMPLE_OPPORTUNITIES, SAMPLE_OPPORTUNITY_STATS, SAMPLE_UNANSWERED,
} from '../sampleData';
import { Bar, Card, Icon, Pill, SoonButton, ViewAll } from '../ui';

// Entire tab is placeholder content until a topic/demand data source exists.
export const OpportunitiesTab = () => (
    <>
        <div className="yti-title-row">
            <div>
                <h2 className="yti-h2">Content opportunities</h2>
                <p className="yti-sub">Based on audience demand, competitor gaps and performance data.</p>
            </div>
            <select className="yti-select" defaultValue="all"><option value="all">All topics</option></select>
        </div>

        <div className="yti-banner"><Icon name="info" size={14} /> Sample data. Connect a topic data source to see real opportunities.</div>

        <div className="yti-grid-3">
            {SAMPLE_OPPORTUNITY_STATS.map(s => (
                <div className="yti-stat" key={s.label}>
                    <span className={`yti-round lg ${s.tone}`}><Icon name={s.icon} size={20} /></span>
                    <div>
                        <span>{s.label}</span>
                        <strong>{s.value}</strong>
                        <em className="yti-green"><Icon name="up" size={11} /> {s.delta}<small> vs last 30 days</small></em>
                    </div>
                </div>
            ))}
        </div>

        <Card title="Top opportunities" action={<ViewAll />}>
            <ul className="yti-opps">
                {SAMPLE_OPPORTUNITIES.map((o, i) => (
                    <li key={o.title}>
                        <span className="yti-num">{i + 1}</span>
                        <span className="yti-opp-title">{o.title}</span>
                        <Pill tone={o.demand[1]} icon="trend">{o.demand[0]}</Pill>
                        <Pill tone={o.competition[1]} icon="bars">{o.competition[0]}</Pill>
                        <Pill tone="gray" icon="users">{o.requests} audience requests</Pill>
                        <Icon name="arrow" size={16} className="yti-muted" />
                    </li>
                ))}
            </ul>
        </Card>

        <div className="yti-grid-2">
            <Card title="Unanswered audience questions" icon={<Icon name="bulb" size={16} className="yti-yellow" />} action={<ViewAll />}>
                <ul className="yti-rows">
                    {SAMPLE_UNANSWERED.map(q => <li key={q.text}><span>{q.text}</span><em>{q.mentions} mentions</em></li>)}
                </ul>
            </Card>

            <Card title="Content gaps" icon={<Icon name="bars" size={16} className="yti-green" />}>
                <p className="yti-sub">Topics your audience wants, but competitors haven't covered well.</p>
                <ul className="yti-gaps">
                    {SAMPLE_GAPS.map(g => (
                        <li key={g.label}>
                            <span>{g.label}</span>
                            <Bar pct={g.pct} color="#34d16f" />
                            <strong className={g.level === 'Low' ? 'yti-green' : 'yti-yellow'}>{g.level}</strong>
                        </li>
                    ))}
                </ul>
                <SoonButton>Explore more gaps <Icon name="arrow" size={14} /></SoonButton>
            </Card>
        </div>
    </>
);
