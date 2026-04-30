import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  SmilePlus,
  Meh,
  Frown,
  Hash,
} from 'lucide-react';

const sentimentData = [
  { label: 'Positive', percentage: 62, icon: SmilePlus, color: 'text-emerald-500', bg: 'bg-emerald-500' },
  { label: 'Neutral', percentage: 28, icon: Meh, color: 'text-amber-500', bg: 'bg-amber-500' },
  { label: 'Negative', percentage: 10, icon: Frown, color: 'text-red-500', bg: 'bg-red-500' },
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
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor sentiment trends and discover common conversation topics
        </p>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-border p-5 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-semibold text-foreground">{card.value}</span>
              <span className={`inline-flex items-center gap-0.5 text-xs font-medium pb-0.5 ${
                card.trend === 'up' ? 'text-emerald-500' : 'text-red-500'
              }`}>
                {card.trend === 'up' ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {card.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sentiment breakdown */}
        <div className="rounded-xl border border-border p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Sentiment Overview</h2>
            <select className="text-xs px-2.5 py-1.5 rounded-md border border-input bg-background text-muted-foreground cursor-pointer focus:outline-none">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>Last 90 days</option>
            </select>
          </div>

          {/* Sentiment bar */}
          <div className="space-y-4">
            <div className="flex rounded-full overflow-hidden h-3 bg-muted">
              {sentimentData.map((s) => (
                <div
                  key={s.label}
                  className={`${s.bg} transition-all duration-500`}
                  style={{ width: `${s.percentage}%` }}
                />
              ))}
            </div>

            <div className="space-y-3">
              {sentimentData.map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <s.icon className={`w-4 h-4 ${s.color}`} />
                    <span className="text-sm text-foreground">{s.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`${s.bg} h-full rounded-full transition-all duration-500`}
                        style={{ width: `${s.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-foreground w-10 text-right">
                      {s.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
            <MessageSquare className="w-3.5 h-3.5" />
            Based on 1,248 analyzed conversations
          </div>
        </div>

        {/* Common topics */}
        <div className="rounded-xl border border-border p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Common Topics</h2>
            <select className="text-xs px-2.5 py-1.5 rounded-md border border-input bg-background text-muted-foreground cursor-pointer focus:outline-none">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>Last 90 days</option>
            </select>
          </div>

          <div className="space-y-3">
            {topTopics.map((topic, index) => (
              <div
                key={topic.topic}
                className="flex items-center gap-4 py-2.5 hover:bg-muted/30 rounded-lg px-2 -mx-2 transition-colors"
              >
                <span className="text-xs font-mono text-muted-foreground w-5">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{topic.topic}</span>
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">{topic.count} mentions</span>
                <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                  topic.trend === 'up' ? 'text-emerald-500' : 'text-red-500'
                }`}>
                  {topic.trend === 'up' ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {topic.change}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
            <BarChart3 className="w-3.5 h-3.5" />
            Topics auto-detected from customer conversations
          </div>
        </div>
      </div>
    </div>
  );
}
