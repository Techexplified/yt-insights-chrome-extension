import type { ComputedMetrics, VideoData } from '../metrics';
import {
    engagementNote, explainPerformance, formatLarge, getGrowthStatus, NO_BASELINE_TEXT,
} from '../metrics';
import { Card, Icon, SoonButton } from '../ui';
import { VideoHeader } from '../VideoHeader';

interface Props {
    data: VideoData;
    metrics: ComputedMetrics;
}

export const OverviewTab = ({ data, metrics }: Props) => {
    const growth = getGrowthStatus(metrics);
    const why = explainPerformance(metrics);

    // Velocity compared with the channel's typical video when we have a baseline; otherwise the growth label.
    const vsCh = metrics.velocityVsChannel;
    const velocityTone = vsCh !== null
        ? (vsCh >= 1.5 ? 'up' : vsCh >= 0.7 ? 'flat' : 'down')
        : (/Viral|Trending|Rising/.test(growth.label) ? 'up' : 'flat');
    const eng = metrics.engagement;
    const engagementTone = eng === null ? 'flat' : eng >= 4 ? 'up' : eng >= 2 ? 'flat' : 'down';

    const drivers = [
        {
            tone: velocityTone,
            title: vsCh === null ? 'Views velocity' : velocityTone === 'up' ? 'High velocity' : velocityTone === 'flat' ? 'Typical velocity' : 'Below-average velocity',
            sub: vsCh === null
                ? `About ${formatLarge(metrics.velocity)} views per day since publishing`
                : `${vsCh.toFixed(1)}× this channel's typical views/day`,
        },
        {
            tone: engagementTone,
            title: eng === null ? 'Engagement unavailable' : engagementTone === 'up' ? 'Strong engagement' : engagementTone === 'flat' ? 'Typical engagement' : 'Low engagement',
            sub: eng === null ? engagementNote(metrics) : `${eng.toFixed(1)}% (likes + comments ÷ views)`,
        },
    ];

    return (
        <>
            <VideoHeader data={data} metrics={metrics} />

            <div className="yti-grid-3">
                <div className="yti-stat">
                    <Icon name="eye" size={22} className="yti-stat-icon" />
                    <div><strong>{formatLarge(metrics.viewCount)}</strong><span>Views</span><em>Since published</em></div>
                </div>
                <div className="yti-stat">
                    <Icon name="bars" size={22} className="yti-stat-icon" />
                    <div><strong>+{formatLarge(metrics.velocity)}</strong><span>Views/day</span>
                        <em style={{ color: growth.color }}>{growth.label}</em></div>
                </div>
                <div className="yti-stat">
                    <Icon name="heart" size={22} className="yti-stat-icon" />
                    <div><strong>{metrics.engagement !== null ? `${metrics.engagement.toFixed(1)}%` : 'N/A'}</strong><span>Engagement rate</span>
                        <em>{engagementNote(metrics)}</em></div>
                </div>
            </div>

            <div className="yti-grid-2">
                <Card title={why.title} action={<Icon name="sparkle" size={16} className="yti-spark" />}>
                    <p className="yti-body">{why.text}</p>
                    <SoonButton className="yti-btn wide">View detailed explanation <Icon name="arrow" size={14} /></SoonButton>
                </Card>

                <Card title="Key performance drivers">
                    <ul className="yti-drivers">
                        {drivers.map(d => (
                            <li key={d.title}>
                                <span className={`yti-round ${d.tone === 'up' ? 'green' : d.tone === 'down' ? 'red' : 'gray'}`}>
                                    <Icon name={d.tone === 'up' ? 'up' : d.tone === 'down' ? 'down' : 'minus'} size={18} />
                                </span>
                                <div><strong>{d.title}</strong><p>{d.sub}</p></div>
                            </li>
                        ))}
                        <li>
                            <span className="yti-round gray"><Icon name="minus" size={18} /></span>
                            <div><strong>Subscriber conversion</strong><p>Not available yet <span className="yti-sample">Sample</span></p></div>
                        </li>
                    </ul>
                </Card>
            </div>

            <Card title="Compared to this channel" info estimated>
                <div className="yti-per1k">
                    <div className="yti-per1k-cell">
                        <span className="yti-round blue"><Icon name="eye" size={20} /></span>
                        <div>
                            <strong>{metrics.viewsVsChannel !== null ? `${metrics.viewsVsChannel.toFixed(1)}×` : 'N/A'}</strong>
                            <span>views vs a typical video</span>
                            {metrics.viewsVsChannel === null && <small>{NO_BASELINE_TEXT}</small>}
                        </div>
                    </div>
                    <div className="yti-per1k-cell">
                        <span className="yti-round green"><Icon name="trend" size={20} /></span>
                        <div>
                            <strong>{metrics.velocityVsChannel !== null ? `${metrics.velocityVsChannel.toFixed(1)}×` : 'N/A'}</strong>
                            <span>views/day vs a typical video</span>
                            {metrics.velocityVsChannel === null && <small>{NO_BASELINE_TEXT}</small>}
                        </div>
                    </div>
                </div>
                <p className="yti-note left">
                    {metrics.baselineSample !== null
                        ? `Typical = the median of this channel's last ${metrics.baselineSample} uploads older than 3 days (Shorts included if the channel posts them).`
                        : 'Needs at least 3 recent uploads older than 3 days from this channel.'}
                </p>
            </Card>

            <Card title="Engagement per 1K views" info estimated>
                <div className="yti-per1k">
                    <div className="yti-per1k-cell">
                        <span className="yti-round red"><Icon name="heart" size={20} /></span>
                        <div>
                            <strong>{metrics.likesPer1K !== null ? metrics.likesPer1K.toFixed(1) : 'N/A'}</strong>
                            <span>likes per 1K views</span>
                            {metrics.likesPer1K === null && <small>{metrics.viewCount <= 0 ? 'No views yet' : 'Likes hidden or unavailable'}</small>}
                        </div>
                    </div>
                    <div className="yti-per1k-cell">
                        <span className="yti-round purple"><Icon name="message" size={20} /></span>
                        <div>
                            <strong>{metrics.commentsPer1K !== null ? metrics.commentsPer1K.toFixed(1) : 'N/A'}</strong>
                            <span>comments per 1K views</span>
                            {metrics.commentsPer1K === null && <small>{metrics.viewCount <= 0 ? 'No views yet' : 'Comment count unavailable'}</small>}
                        </div>
                    </div>
                </div>
                <p className="yti-note left">
                    Watch time and retention are private to the channel owner, so these ratios are shown instead.
                </p>
            </Card>
        </>
    );
};