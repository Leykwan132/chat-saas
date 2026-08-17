import { Fragment, useMemo, useState } from 'react';
import { Separator } from '@/components/ui/separator';
import {
  AnalyticsChartShell,
  AnalyticsChartShellSkeleton,
  analyticsAdvancedOverviewGridClass,
} from '@/components/analytics/AnalyticsUi';
import {
  AgentOverviewActiveDonutChart,
  getActiveDonutOuterRadius,
  type AgentOverviewActiveDonutDatum,
} from './AgentOverviewActiveDonutChart';
import {
  AgentOverviewPreviewUpgradeAction,
  LockedTopicAnalyticsPanel,
  OverviewPanelTitle,
} from './AgentOverviewTopicPanels';
import {
  CUSTOMER_SENTIMENT_CHART_COLORS,
  CUSTOMER_SENTIMENT_LABELS,
  CUSTOMER_SENTIMENTS,
  type CustomerSentimentCounts,
} from '../../../shared/customerSentiment';

const COMMON_TOPICS_SHELL_MIN_HEIGHT = 340;
const TOPIC_CHART_COLORS = [
  '#7cb4f4',
  '#67d184',
  '#ffd43d',
  '#ffab8c',
  '#c7a4f5',
  '#f8b5bd',
] as const;
const SAMPLE_TOPICS: AgentOverviewCommonTopic[] = [
  { topicId: 'booking', topic: 'Appointment booking', count: 14, description: null },
  { topicId: 'pricing', topic: 'Pricing questions', count: 9, description: null },
  { topicId: 'support', topic: 'Product support', count: 6, description: null },
];
const SAMPLE_SENTIMENT = { positive: 14, neutral: 7, negative: 3 };

export type AgentOverviewCommonTopic = {
  topicId: string;
  topic: string;
  count: number;
  description: string | null;
};

export type AgentOverviewTopicChartDatum = AgentOverviewActiveDonutDatum & {
  percentage: number;
  detail?: string;
};

type AgentOverviewDistributionItem = AgentOverviewActiveDonutDatum & { percentage: number };

export function buildTopicChartData(
  topics: AgentOverviewCommonTopic[],
): AgentOverviewTopicChartDatum[] {
  const totalCustomers = topics.reduce((sum, topic) => sum + topic.count, 0);

  return topics.map((topic, index) => ({
    key: topic.topicId,
    label: topic.topic,
    customerCount: topic.count,
    percentage:
      totalCustomers > 0
        ? Number(((topic.count / totalCustomers) * 100).toFixed(2))
        : 0,
    fill: TOPIC_CHART_COLORS[index % TOPIC_CHART_COLORS.length],
    detail: topic.description ?? undefined,
  }));
}

export function getTopicChartOuterRadius(
  outerRadius: number,
  index: number,
  activeTopicIndex: number | null,
) {
  return getActiveDonutOuterRadius(outerRadius, index, activeTopicIndex);
}

function formatPercentage(percentage: number) {
  return `${percentage % 1 === 0 ? percentage.toFixed(0) : percentage.toFixed(2)}%`;
}

export function buildSentimentChartData(
  distribution: CustomerSentimentCounts,
): AgentOverviewDistributionItem[] {
  const total = CUSTOMER_SENTIMENTS.reduce(
    (sum, sentiment) => sum + distribution[sentiment],
    0,
  );

  return CUSTOMER_SENTIMENTS.map((sentiment) => ({
    key: sentiment,
    label: CUSTOMER_SENTIMENT_LABELS[sentiment],
    customerCount: distribution[sentiment],
    percentage:
      total > 0
        ? Number(((distribution[sentiment] / total) * 100).toFixed(2))
        : 0,
    fill: CUSTOMER_SENTIMENT_CHART_COLORS[sentiment],
  })).sort((left, right) => right.percentage - left.percentage);
}

function DistributionList({
  items,
  onItemHover,
}: {
  items: AgentOverviewDistributionItem[];
  onItemHover?: (index: number | null) => void;
}) {
  return (
    <div className="flex min-h-0 w-full flex-col justify-start">
      {items.map((item, index) => (
        <Fragment key={item.key}>
          <div
            className="flex w-full min-w-0 items-center justify-between gap-3 py-2 text-base leading-tight"
            onMouseEnter={() => onItemHover?.(index)}
            onMouseLeave={() => onItemHover?.(null)}
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.fill }}
              />
              <span className="min-w-0 truncate text-foreground">{item.label}</span>
            </div>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {formatPercentage(item.percentage)}
            </span>
          </div>
          {index < items.length - 1 ? <Separator /> : null}
        </Fragment>
      ))}
    </div>
  );
}

export { AgentOverviewPreviewUpgradeAction } from './AgentOverviewTopicPanels';

export function AgentOverviewTopicsAndSentiment({
  topics,
  sentimentDistribution,
  topicAnalyticsEnabled = true,
  onUpgrade,
}: {
  topics: AgentOverviewCommonTopic[];
  sentimentDistribution: CustomerSentimentCounts;
  topicAnalyticsEnabled?: boolean;
  onUpgrade?: () => void;
}) {
  const [activeSentimentIndex, setActiveSentimentIndex] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTopicIndex, setActiveTopicIndex] = useState<number | null>(null);
  const previewing = !topicAnalyticsEnabled && showPreview;
  const displayedTopics = previewing ? SAMPLE_TOPICS : topics;
  const displayedSentiment = previewing ? SAMPLE_SENTIMENT : sentimentDistribution;
  const topicChartData = useMemo(() => buildTopicChartData(displayedTopics), [displayedTopics]);
  const sentimentChartData = useMemo(
    () => buildSentimentChartData(displayedSentiment),
    [displayedSentiment],
  );

  if (!topicAnalyticsEnabled && !showPreview) {
    return (
      <div className={analyticsAdvancedOverviewGridClass}>
        <LockedTopicAnalyticsPanel title="Common Topics" onPreview={() => setShowPreview(true)} onUpgrade={onUpgrade} />
        <LockedTopicAnalyticsPanel title="Customer Sentiment" onPreview={() => setShowPreview(true)} onUpgrade={onUpgrade} />
      </div>
    );
  }

  return (
    <div className={analyticsAdvancedOverviewGridClass}>
      <AnalyticsChartShell
        title={(
          <OverviewPanelTitle
            title="Common Topics"
            description="Most discussed topics."
            sample={previewing}
          />
        )}
        className="bg-background"
        headerClassName="px-5"
        isEmpty={topicChartData.length === 0}
        emptyMessage="Nothing available yet."
        shellStyle={{ minHeight: COMMON_TOPICS_SHELL_MIN_HEIGHT }}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="grid min-h-0 flex-1 grid-cols-1 items-start gap-8 px-5 pt-2 md:grid-cols-[minmax(0,1fr)_minmax(220px,300px)]">
            <DistributionList items={topicChartData} onItemHover={setActiveTopicIndex} />
            <AgentOverviewActiveDonutChart data={topicChartData} activeIndex={activeTopicIndex} />
          </div>
          {previewing ? <AgentOverviewPreviewUpgradeAction onUpgrade={onUpgrade} /> : null}
        </div>
      </AnalyticsChartShell>

      <AnalyticsChartShell
        title={(
          <OverviewPanelTitle
            title="Customer Sentiment"
            description="Conversation sentiment."
            sample={previewing}
          />
        )}
        className="bg-background"
        headerClassName="px-5"
        shellStyle={{ minHeight: COMMON_TOPICS_SHELL_MIN_HEIGHT }}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="grid min-h-0 flex-1 grid-cols-1 items-start gap-8 px-5 pt-2 md:grid-cols-[minmax(0,1fr)_minmax(220px,300px)]">
            <DistributionList items={sentimentChartData} onItemHover={setActiveSentimentIndex} />
            <AgentOverviewActiveDonutChart
              data={sentimentChartData}
              activeIndex={activeSentimentIndex}
            />
          </div>
          {previewing ? <AgentOverviewPreviewUpgradeAction onUpgrade={onUpgrade} /> : null}
        </div>
      </AnalyticsChartShell>
    </div>
  );
}

export function AgentOverviewTopicsAndSentimentSkeleton() {
  return (
    <div className={analyticsAdvancedOverviewGridClass}>
      <AnalyticsChartShellSkeleton
        shellStyle={{ minHeight: COMMON_TOPICS_SHELL_MIN_HEIGHT }}
      />
      <AnalyticsChartShellSkeleton
        shellStyle={{ minHeight: COMMON_TOPICS_SHELL_MIN_HEIGHT }}
      />
    </div>
  );
}
