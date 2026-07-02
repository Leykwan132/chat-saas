import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AnalyticsChartShell,
  AnalyticsChartShellSkeleton,
  AnalyticsCustomerSentimentPieChart,
  AnalyticsHorizontalBarChart,
  TOPIC_BAR_OPACITY_GRADIENT,
  analyticsAdvancedOverviewGridClass,
  getTopicMapShellHeight,
  type AnalyticsHorizontalBarDatum,
} from '@/components/analytics/AnalyticsUi';
import type { CustomerSentimentCounts } from '../../../shared/customerSentiment';
import { formatWholeNumber } from './agentOverviewFormat';

const COLLAPSED_TOPIC_COUNT = 5;

export type AgentOverviewCommonTopic = {
  topicId: string;
  topic: string;
  count: number;
  description: string | null;
};

function buildTopicRows(
  topics: AgentOverviewCommonTopic[],
  expanded: boolean,
): AnalyticsHorizontalBarDatum[] {
  const limit = expanded
    ? topics.length
    : Math.min(COLLAPSED_TOPIC_COUNT, topics.length);

  return topics.slice(0, limit).map((topic) => ({
    key: topic.topicId,
    label: topic.topic,
    value: topic.count,
    displayValue: formatWholeNumber(topic.count),
    detail: topic.description ?? undefined,
  }));
}

export function AgentOverviewTopicsAndSentiment({
  topics,
  sentimentDistribution,
}: {
  topics: AgentOverviewCommonTopic[];
  sentimentDistribution: CustomerSentimentCounts;
}) {
  const [expanded, setExpanded] = useState(false);
  const topicRows = useMemo(
    () => buildTopicRows(topics, expanded),
    [topics, expanded],
  );
  const canExpand = topics.length > COLLAPSED_TOPIC_COUNT;
  const shellHeight = Math.max(
    getTopicMapShellHeight(topicRows.length, { includeExpandAction: canExpand }),
    420,
  );

  return (
    <div className={analyticsAdvancedOverviewGridClass}>
      <AnalyticsChartShell
        title="Common Topics"
        isEmpty={topicRows.length === 0}
        emptyMessage="Nothing available yet."
        shellStyle={{ height: shellHeight }}
      >
        <div className="flex min-h-0 flex-1 flex-col pt-4">
          <AnalyticsHorizontalBarChart
            data={topicRows}
            opacityGradient={TOPIC_BAR_OPACITY_GRADIENT}
            labelWidth={168}
            align="start"
            gapClass="gap-5"
            barHeightClass="h-9"
            barRadiusClass="rounded-sm"
            textClassName="text-[15px]"
            rowTooltip={(row) => (
              <>
                <span className="max-w-72 text-xs font-normal text-background/60">
                  {formatWholeNumber(row.value)} conversation
                  {row.value === 1 ? '' : 's'}
                </span>
                <span className="max-w-72 font-medium leading-snug">
                  {row.label}
                </span>
                {row.detail ? (
                  <span className="max-w-72 text-xs leading-relaxed text-background/60">
                    {row.detail}
                  </span>
                ) : null}
              </>
            )}
          />
          {canExpand ? (
            <div className="mt-auto flex justify-center px-4 pt-5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setExpanded((current) => !current)}
              >
                {expanded ? 'Show less' : 'Show more'}
              </Button>
            </div>
          ) : null}
        </div>
      </AnalyticsChartShell>

      <AnalyticsChartShell
        title="Customer Sentiment"
        shellStyle={{ height: shellHeight }}
      >
        <div className="flex min-h-0 flex-1 items-center justify-center px-2 [&_[data-slot=chart]]:!size-[min(360px,100%)]">
          <AnalyticsCustomerSentimentPieChart distribution={sentimentDistribution} />
        </div>
      </AnalyticsChartShell>
    </div>
  );
}

export function AgentOverviewTopicsAndSentimentSkeleton() {
  const shellHeight = getTopicMapShellHeight(COLLAPSED_TOPIC_COUNT, {
    includeExpandAction: true,
  });

  return (
    <div className={analyticsAdvancedOverviewGridClass}>
      <AnalyticsChartShellSkeleton shellStyle={{ height: shellHeight }} />
      <AnalyticsChartShellSkeleton shellStyle={{ height: shellHeight }} />
    </div>
  );
}
