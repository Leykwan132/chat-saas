import { Fragment, useMemo } from 'react';
import { Pie, PieChart } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Separator } from '@/components/ui/separator';
import {
  AnalyticsChartShell,
  AnalyticsChartShellSkeleton,
  AnalyticsCustomerSentimentPieChart,
  analyticsAdvancedOverviewGridClass,
} from '@/components/analytics/AnalyticsUi';
import {
  CUSTOMER_SENTIMENT_CHART_COLORS,
  CUSTOMER_SENTIMENT_LABELS,
  CUSTOMER_SENTIMENTS,
  type CustomerSentimentCounts,
} from '../../../shared/customerSentiment';

const COMMON_TOPICS_SHELL_HEIGHT = 340;
const TOPIC_CHART_COLORS = [
  '#7cb4f4',
  '#67d184',
  '#ffd43d',
  '#ffab8c',
  '#c7a4f5',
  '#f8b5bd',
] as const;

const topicChartConfig = {
  customers: { label: 'Customers' },
} satisfies ChartConfig;

export type AgentOverviewCommonTopic = {
  topicId: string;
  topic: string;
  count: number;
  description: string | null;
};

export type AgentOverviewTopicChartDatum = {
  key: string;
  label: string;
  customerCount: number;
  percentage: number;
  fill: string;
  detail?: string;
};

type AgentOverviewDistributionItem = {
  key: string;
  label: string;
  percentage: number;
  fill: string;
};

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

function formatPercentage(percentage: number) {
  return `${percentage % 1 === 0 ? percentage.toFixed(0) : percentage.toFixed(2)}%`;
}

function formatCustomerCount(count: number) {
  return `${count.toLocaleString()} customer${count === 1 ? '' : 's'}`;
}

function buildSentimentChartData(
  distribution: CustomerSentimentCounts,
): AgentOverviewDistributionItem[] {
  const total = CUSTOMER_SENTIMENTS.reduce(
    (sum, sentiment) => sum + distribution[sentiment],
    0,
  );

  return CUSTOMER_SENTIMENTS.map((sentiment) => ({
    key: sentiment,
    label: CUSTOMER_SENTIMENT_LABELS[sentiment],
    percentage:
      total > 0
        ? Number(((distribution[sentiment] / total) * 100).toFixed(2))
        : 0,
    fill: CUSTOMER_SENTIMENT_CHART_COLORS[sentiment],
  })).sort((left, right) => right.percentage - left.percentage);
}

function DistributionList({
  items,
}: {
  items: AgentOverviewDistributionItem[];
}) {
  return (
    <div className="flex min-h-0 w-full flex-col justify-start">
      {items.map((item, index) => (
        <Fragment key={item.key}>
          <div className="flex w-full min-w-0 items-center justify-between gap-3 py-2 text-base leading-tight">
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

function OverviewPanelTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <div className="font-sans font-medium leading-tight">{title}</div>
      <div className="mt-0.5 text-sm font-normal leading-tight text-muted-foreground">
        {description}
      </div>
    </div>
  );
}

export function AgentOverviewTopicsAndSentiment({
  topics,
  sentimentDistribution,
}: {
  topics: AgentOverviewCommonTopic[];
  sentimentDistribution: CustomerSentimentCounts;
}) {
  const topicChartData = useMemo(() => buildTopicChartData(topics), [topics]);
  const sentimentChartData = useMemo(
    () => buildSentimentChartData(sentimentDistribution),
    [sentimentDistribution],
  );

  return (
    <div className={analyticsAdvancedOverviewGridClass}>
      <AnalyticsChartShell
        title={(
          <OverviewPanelTitle
            title="Common Topics"
            description="Most discussed topics."
          />
        )}
        className="bg-background"
        headerClassName="px-5"
        isEmpty={topicChartData.length === 0}
        emptyMessage="Nothing available yet."
        shellStyle={{ height: COMMON_TOPICS_SHELL_HEIGHT }}
      >
        <div className="grid min-h-0 flex-1 grid-cols-1 items-start gap-8 px-5 pb-5 pt-2 md:grid-cols-[minmax(0,1fr)_minmax(220px,300px)]">
          <DistributionList items={topicChartData} />

          <ChartContainer
            config={topicChartConfig}
            className="mx-auto aspect-square size-full max-h-[230px] max-w-[230px]"
          >
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={(
                  <ChartTooltipContent
                    hideLabel
                    formatter={(value, _name, item) => {
                      const topic = item.payload as AgentOverviewTopicChartDatum;
                      return (
                        <span className="font-medium text-foreground">
                          {topic.label}: {formatCustomerCount(Number(value))}
                        </span>
                      );
                    }}
                  />
                )}
              />
              <Pie
                data={topicChartData}
                dataKey="customerCount"
                nameKey="label"
                innerRadius="48%"
                outerRadius="86%"
                strokeWidth={3}
                stroke="var(--background)"
              />
            </PieChart>
          </ChartContainer>
        </div>
      </AnalyticsChartShell>

      <AnalyticsChartShell
        title={(
          <OverviewPanelTitle
            title="Customer Sentiment"
            description="Conversation sentiment."
          />
        )}
        className="bg-background"
        headerClassName="px-5"
        shellStyle={{ height: COMMON_TOPICS_SHELL_HEIGHT }}
      >
        <div className="grid min-h-0 flex-1 grid-cols-1 items-start gap-8 px-5 pb-5 pt-2 md:grid-cols-[minmax(0,1fr)_minmax(220px,300px)]">
          <DistributionList items={sentimentChartData} />
          <div className="flex min-h-0 flex-1 items-start justify-center [&_[data-slot=chart]]:!size-[min(230px,100%)]">
            <AnalyticsCustomerSentimentPieChart
              distribution={sentimentDistribution}
              showLegend={false}
            />
          </div>
        </div>
      </AnalyticsChartShell>
    </div>
  );
}

export function AgentOverviewTopicsAndSentimentSkeleton() {
  return (
    <div className={analyticsAdvancedOverviewGridClass}>
      <AnalyticsChartShellSkeleton
        shellStyle={{ height: COMMON_TOPICS_SHELL_HEIGHT }}
      />
      <AnalyticsChartShellSkeleton
        shellStyle={{ height: COMMON_TOPICS_SHELL_HEIGHT }}
      />
    </div>
  );
}
