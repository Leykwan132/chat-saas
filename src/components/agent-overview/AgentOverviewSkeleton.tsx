import { Skeleton } from '@/components/ui/skeleton';
import { AgentOverviewMetricsSkeleton } from './AgentOverviewMetrics';
import { AgentOverviewTopicsAndSentimentSkeleton } from './AgentOverviewTopicsAndSentiment';
import { AgentOverviewTrendChartSkeleton } from './AgentOverviewTrendChart';

export function AgentOverviewSkeleton() {
  return (
    <div className="flex w-full max-w-none flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      <AgentOverviewMetricsSkeleton />
      <AgentOverviewTrendChartSkeleton />
      <AgentOverviewTopicsAndSentimentSkeleton />
    </div>
  );
}
