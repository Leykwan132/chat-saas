import { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { Navigate, useParams } from 'react-router';
import { ShieldAlert } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import {
  formatPeriodLabel,
  type CreditTimeRange,
} from '@/components/analytics/creditUsageChartModel';
import {
  AgentOverviewMetrics,
  type OverviewMetricItem,
} from '@/components/agent-overview/AgentOverviewMetrics';
import { AgentOverviewDataModeSelect } from '@/components/agent-overview/AgentOverviewDataModeSelect';
import { AgentOverviewSkeleton } from '@/components/agent-overview/AgentOverviewSkeleton';
import { AgentOverviewTimeRangeButtons } from '@/components/agent-overview/AgentOverviewTimeRangeButtons';
import { AgentOverviewTopicsAndSentiment } from '@/components/agent-overview/AgentOverviewTopicsAndSentiment';
import { useRetainedOverviewData } from '@/components/agent-overview/useRetainedOverviewData';
import {
  AgentOverviewTrendChart,
  type OverviewChartMode,
} from '@/components/agent-overview/AgentOverviewTrendChart';
import {
  buildOverviewTrendRows,
  type OverviewTrendDataMode,
} from '@/components/agent-overview/agentOverviewTrendModel';
import {
  formatCredits,
  formatWholeNumber,
} from '@/components/agent-overview/agentOverviewFormat';
import { Permission } from '../../shared/permissions';
import { usePermissions } from '@/hooks/usePermissions';
import { useUpgradeModal } from '@/components/upgradeModalContext';

function AccessDenied() {
  return (
    <div className="flex min-h-[42vh] flex-col items-center justify-center gap-3 text-center">
      <ShieldAlert className="size-8 text-muted-foreground" />
      <h1 className="text-2xl font-semibold tracking-tight">Analytics access required</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        You do not have permission to view this agent overview.
      </p>
    </div>
  );
}

export default function AgentOverviewPage() {
  const { agentId } = useParams();
  const selectedAgentId = agentId as Id<'agents'> | undefined;
  const { can, isLoading: permissionsLoading } = usePermissions();
  const { openUpgradeModal } = useUpgradeModal();
  const [chartMode, setChartMode] = useState<OverviewChartMode>('aiAssistedConversations');
  const [timeRange, setTimeRange] = useState<CreditTimeRange>('30d');
  const [trendDataMode, setTrendDataMode] = useState<OverviewTrendDataMode>('daily');
  const canReadAnalytics = !permissionsLoading && can(Permission.ANALYTICS_READ);
  const summary = useQuery(
    api.agentOverview.getSummary,
    selectedAgentId && canReadAnalytics ? { agentId: selectedAgentId, timeRange } : 'skip',
  );
  const creditUsage = useQuery(
    api.creditUsageAnalytics.getAgentCreditUsage,
    selectedAgentId && canReadAnalytics
      ? { agentId: selectedAgentId, timeRange }
      : 'skip',
  );
  const overviewData = useRetainedOverviewData(summary, creditUsage);

  const trendRows = useMemo(
    () => buildOverviewTrendRows(
      overviewData.data?.summary.daily ?? [],
      overviewData.data?.creditUsage?.dailyUsage,
      trendDataMode,
    ),
    [overviewData.data?.creditUsage?.dailyUsage, overviewData.data?.summary.daily, trendDataMode],
  );

  if (!selectedAgentId) {
    return <Navigate to="/workspace" replace />;
  }

  if (permissionsLoading) {
    return <AgentOverviewSkeleton />;
  }

  if (!canReadAnalytics) {
    return <AccessDenied />;
  }

  if (overviewData.data === undefined) {
    return <AgentOverviewSkeleton />;
  }

  const { summary: resolvedSummary, creditUsage: resolvedCreditUsage } = overviewData.data;

  const primaryMetrics = [
    {
      label: 'AI conversations',
      value: formatWholeNumber(resolvedSummary.aiAssistedConversationCount),
      mode: 'aiAssistedConversations',
    },
    {
      label: 'Total credits spent',
      value: formatCredits(resolvedCreditUsage?.totalCreditsUsed ?? null),
      mode: 'credits',
    },
    {
      label: 'Booked appointments',
      value: formatWholeNumber(resolvedSummary.bookedAppointments),
      mode: 'bookings',
    },
    {
      label: 'Human escalation',
      value: formatWholeNumber(resolvedSummary.escalations),
      mode: 'humanEscalations',
    },
  ] satisfies OverviewMetricItem[];
  const secondaryMetrics = [] satisfies OverviewMetricItem[];
  const periodLabel = formatPeriodLabel(
    resolvedSummary.periodStartMs,
    resolvedSummary.periodEndMs,
    resolvedSummary.timeZone,
  );

  return (
    <div className="flex w-full max-w-none flex-col gap-6">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="font-title text-3xl font-normal tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground">{periodLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <AgentOverviewTimeRangeButtons
            value={timeRange}
            onChange={setTimeRange}
            isRefreshing={overviewData.isRefreshing}
          />
          <AgentOverviewDataModeSelect
            value={trendDataMode}
            onChange={setTrendDataMode}
          />
        </div>
      </div>
      <AgentOverviewMetrics
        primary={primaryMetrics}
        secondary={secondaryMetrics}
        selectedMode={chartMode}
        onSelectMode={setChartMode}
      />
      <AgentOverviewTrendChart
        rows={trendRows}
        mode={chartMode}
        dataMode={trendDataMode}
      />
      <AgentOverviewTopicsAndSentiment
        topics={resolvedSummary.trendingTopics}
        sentimentDistribution={resolvedSummary.sentimentDistribution}
        topicAnalyticsEnabled={resolvedSummary.topicAnalyticsEnabled}
        onUpgrade={openUpgradeModal}
      />
    </div>
  );
}
