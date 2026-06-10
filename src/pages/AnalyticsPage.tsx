import { BarChart3, TrendingUp, TrendingDown, MessageSquare, SmilePlus, Meh, Frown, Hash } from 'lucide-react';
import { PageDescription } from '@/components/PageDescription';

const sentimentData = [
  { label: 'Positive', percentage: 62, icon: SmilePlus, color: '#16a34a', bg: '#16a34a', barBg: '#dcfce7' },
  { label: 'Neutral', percentage: 28, icon: Meh, color: '#d97706', bg: '#d97706', barBg: '#fef3c7' },
  { label: 'Negative', percentage: 10, icon: Frown, color: '#dc2626', bg: '#dc2626', barBg: '#fee2e2' },
];

const topTopics = [
  { topic: 'Shipping & Delivery', count: 142, trend: 'up', change: '+12%' },
  { topic: 'Product Quality', count: 98, trend: 'up', change: '+8%' },
  { topic: 'Refunds & Returns', count: 76, trend: 'down', change: '-3%' },
  { topic: 'Account Issues', count: 54, trend: 'up', change: '+5%' },
  { topic: 'Pricing Questions', count: 43, trend: 'down', change: '-7%' },
  { topic: 'Feature Requests', count: 31, trend: 'up', change: '+15%' },
];

const overviewCards = [
  { label: 'Total Conversations', value: '1,248', change: '+12.5%', trend: 'up' as const },
  { label: 'Avg. Response Time', value: '2.4m', change: '-18.2%', trend: 'down' as const },
  { label: 'Resolution Rate', value: '94.2%', change: '+3.1%', trend: 'up' as const },
  { label: 'Customer Satisfaction', value: '4.7/5', change: '+0.3', trend: 'up' as const },
];

export default function AnalyticsPage() {
  const cardStyle: React.CSSProperties = {
    background: 'var(--color-surface)', borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', width: '100%' }}>
      {/* Header */}
      <div>
        <h1 className="m-0 text-4xl font-semibold tracking-tight text-foreground">
          Analytics
        </h1>
        <PageDescription>
          See how your team and AI are performing over time.
        </PageDescription>
      </div>

      {/* Overview cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        {overviewCards.map(card => (
          <div key={card.label} style={{ ...cardStyle, padding: '18px 20px' }}>
            <p style={{ margin: 0, fontSize: '11px', fontWeight: 600, color: 'var(--color-foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {card.label}
            </p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-foreground)', letterSpacing: '-0.02em' }}>
                {card.value}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '12px', fontWeight: 600, paddingBottom: '2px', color: card.trend === 'up' ? '#16a34a' : '#dc2626' }}>
                {card.trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {card.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Sentiment */}
        <div style={{ ...cardStyle, padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--color-foreground)' }}>
              Sentiment Overview
            </h2>
            <select
              style={{ fontSize: '12px', padding: '5px 10px', borderRadius: '7px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-foreground-muted)', cursor: 'pointer', outline: 'none' }}
            >
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>Last 90 days</option>
            </select>
          </div>

          {/* Combined bar */}
          <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', height: '10px', marginBottom: '20px' }}>
            {sentimentData.map(s => (
              <div key={s.label} style={{ width: `${s.percentage}%`, background: s.bg, transition: 'width 0.5s' }} />
            ))}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {sentimentData.map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <s.icon size={15} color={s.color} />
                  <span style={{ fontSize: '13px', color: 'var(--color-foreground)', fontWeight: 500 }}>{s.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '80px', background: '#f4f4f5', borderRadius: '99px', height: '5px', overflow: 'hidden' }}>
                    <div style={{ width: `${s.percentage}%`, background: s.bg, height: '100%', borderRadius: '99px', transition: 'width 0.5s' }} />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-foreground)', width: '32px', textAlign: 'right' }}>
                    {s.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '16px', fontSize: '12px', color: 'var(--color-foreground-subtle)' }}>
            <MessageSquare size={13} />
            Based on 1,248 analyzed conversations
          </div>
        </div>

        {/* Common topics */}
        <div style={{ ...cardStyle, padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--color-foreground)' }}>
              Common Topics
            </h2>
            <select
              style={{ fontSize: '12px', padding: '5px 10px', borderRadius: '7px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-foreground-muted)', cursor: 'pointer', outline: 'none' }}
            >
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>Last 90 days</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {topTopics.map((topic, index) => (
              <div
                key={topic.topic}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 8px', borderRadius: '8px',
                  cursor: 'pointer', transition: 'background 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f9')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--color-foreground-subtle)', width: '20px', flexShrink: 0 }}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Hash size={13} color="var(--color-foreground-subtle)" />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {topic.topic}
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--color-foreground-muted)', flexShrink: 0 }}>{topic.count}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '12px', fontWeight: 600, color: topic.trend === 'up' ? '#16a34a' : '#dc2626', flexShrink: 0 }}>
                  {topic.trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {topic.change}
                </span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '8px', fontSize: '12px', color: 'var(--color-foreground-subtle)' }}>
            <BarChart3 size={13} />
            Topics auto-detected from customer conversations
          </div>
        </div>
      </div>
    </div>
  );
}
