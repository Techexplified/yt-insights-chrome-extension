import type { ComputedMetrics, VideoData } from '../metrics';
import { xLabelsFor } from '../metrics';
import {
    SAMPLE_AUDIENCE_TAKEAWAY, SAMPLE_COMMENT_THEMES, SAMPLE_COMMENT_VOLUME, SAMPLE_PAIN_POINTS,
    SAMPLE_QUESTIONS, SAMPLE_SENTIMENT,
} from '../sampleData';
import { AreaChart, Bar, Card, Donut, Icon, SoonButton, ViewAll } from '../ui';
import { VideoHeader } from '../VideoHeader';

// Comment analysis isn't scraped yet, so everything below the header uses sample data.
export const AudienceTab = ({ data, metrics }: { data: VideoData; metrics: ComputedMetrics }) => (
    <>
        <VideoHeader data={data} metrics={metrics} />

        <div className="yti-grid-2 wide-left">
            <Card title="Audience sentiment" info sample>
                <div className="yti-sentiment">
                    <Donut segments={SAMPLE_SENTIMENT.segments} center={SAMPLE_SENTIMENT.total} sub="comments" />
                    <ul>
                        {SAMPLE_SENTIMENT.segments.map(s => (
                            <li key={s.label}>
                                <i style={{ background: s.color }} />{s.label}<strong>{s.value}%</strong>
                            </li>
                        ))}
                    </ul>
                </div>
            </Card>

            <Card title="Top comment themes" info sample action={<ViewAll />}>
                <ul className="yti-rank-list">
                    {SAMPLE_COMMENT_THEMES.map((t, i) => (
                        <li key={t.label}>
                            <span className="yti-num sm">{i + 1}</span>
                            <span className="yti-rank-label">{t.label}</span>
                            <Bar pct={t.pct} max={30} color="#3b82f6" />
                            <strong>{t.pct}%</strong>
                        </li>
                    ))}
                </ul>
            </Card>
        </div>

        <div className="yti-grid-2">
            <Card title="Common audience questions" sample action={<ViewAll />}>
                <ul className="yti-rows">
                    {SAMPLE_QUESTIONS.map(q => (
                        <li key={q.text}>
                            <Icon name="message" size={15} className="yti-muted" />
                            <span>{q.text}</span><em>{q.mentions} mentions</em>
                        </li>
                    ))}
                </ul>
            </Card>

            <Card title="Audience pain points" sample action={<ViewAll />}>
                <ul className="yti-rows">
                    {SAMPLE_PAIN_POINTS.map(p => (
                        <li key={p.label}>
                            <span className="yti-round red sm"><Icon name="alert" size={14} /></span>
                            <span>{p.label}</span><strong>{p.pct}%</strong>
                        </li>
                    ))}
                </ul>
            </Card>
        </div>

        <div className="yti-grid-main">
            <Card title="Comment volume over time" info sample action={
                <select className="yti-select" defaultValue="30"><option value="30">Last 30 days</option></select>
            }>
                <AreaChart values={SAMPLE_COMMENT_VOLUME} color="#34d16f"
                    yLabels={['600', '400', '200', '0']} xLabels={xLabelsFor(28)} />
            </Card>

            <Card title="Key takeaway" icon={<Icon name="sparkle" size={16} className="yti-spark" />} sample>
                <p className="yti-body">{SAMPLE_AUDIENCE_TAKEAWAY}</p>
                <SoonButton className="yti-btn wide">View supporting comments <Icon name="arrow" size={14} /></SoonButton>
            </Card>
        </div>
    </>
);
