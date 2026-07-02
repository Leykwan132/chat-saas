import { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { PlanFeatureGate } from '@/components/PlanFeatureGate';
import {
  AnalyticsChartShell,
  ANALYTICS_CHART_BODY_HEIGHT,
  ANALYTICS_CHART_COLORS,
  AnalyticsCustomersByChannelChart,
  AnalyticsDropOffRateLineChart,
  AnalyticsMetricCards,
  AnalyticsVerticalBarChart,
  analyticsTeamOverviewGridClass,
  TeamAnalyticsSkeleton,
} from '@/components/analytics/AnalyticsUi';
import {
  formatAnalyticsDuration,
  formatAnalyticsNumber,
  formatAnalyticsRate,
} from '@/components/analytics/analyticsFormatters';
import { TeamAnalyticsMemberTable } from '@/components/analytics/TeamAnalyticsMemberTable';
import type { AnalyticsRange } from '@/components/analytics/analyticsRange';
import { api } from '../../../convex/_generated/api';

export function TeamAnalyticsContent({ range }: { range: AnalyticsRange }) {
  const [memberSearch, setMemberSearch] = useState('');
  const overview = useQuery(api.analytics.getOverview, { range });
  const members = useQuery(api.analytics.getMemberPerformance, { range });
  const channelMonthly = useQuery(api.analytics.getCustomersByChannelMonthly, { range });
  const dropOffMonthly = useQuery(api.analytics.getDropOffRateMonthly, { range });

  const isLoading =
    overview === undefined ||
    members === undefined ||
    channelMonthly === undefined ||
    dropOffMonthly === undefined;

  const overviewCards = overview?.cards ?? [];
  const memberRows = useMemo(() => members ?? [], [members]);
  const channelMonthlyChartData = useMemo(
    () => channelMonthly?.rows ?? [],
    [channelMonthly?.rows],
  );
  const dropOffMonthlyChartData = useMemo(
    () =>
      (dropOffMonthly?.rows ?? []).filter((row) => row.conversationCount > 0),
    [dropOffMonthly?.rows],
  );

  const hasChannelMonthlyData = useMemo(
    () =>
      channelMonthlyChartData.some((row) =>
        ['whatsapp', 'instagram', 'messenger'].some(
          (service) => Number(row[service] ?? 0) > 0,
        ),
      ),
    [channelMonthlyChartData],
  );

  const hasDropOffMonthlyData = useMemo(
    () => dropOffMonthlyChartData.some((row) => row.conversationCount > 0),
    [dropOffMonthlyChartData],
  );

  const avgConversionChartData = useMemo(
    () =>
      [...memberRows]
        .filter(
          (member) =>
            member.convertedCount > 0 && member.averageConversionMs !== null,
        )
        .sort(
          (a, b) =>
            (a.averageConversionMs ?? Number.POSITIVE_INFINITY) -
            (b.averageConversionMs ?? Number.POSITIVE_INFINITY),
        )
        .slice(0, 5)
        .map((member) => ({
          member: member.name,
          averageConversionMs: member.averageConversionMs ?? 0,
        })),
    [memberRows],
  );

  const topMemberChartData = useMemo(
    () =>
      [...memberRows]
        .filter(
          (member) =>
            member.assignedConversationCount > 0 && member.convertedCount > 0,
        )
        .sort(
          (a, b) =>
            b.conversionRate - a.conversionRate ||
            b.convertedCount - a.convertedCount,
        )
        .slice(0, 5)
        .map((member) => ({
          member: member.name,
          conversionRate: member.conversionRate,
          convertedCount: member.convertedCount,
        })),
    [memberRows],
  );

  if (isLoading) {
    return <TeamAnalyticsSkeleton />;
  }

  return (
    <PlanFeatureGate featureKey="team_analytics" featureName="Team Analytics">
      <div className="flex flex-col gap-4">
        <AnalyticsMetricCards
          items={overviewCards.map((card) => ({
            key: card.key,
            label: card.label,
            value: card.value,
          }))}
        />

        <div className={analyticsTeamOverviewGridClass}>
          <AnalyticsChartShell
            title="Customers by Channel"
            isEmpty={!hasChannelMonthlyData}
            className="col-span-1 sm:col-span-2"
          >
            <div className="px-2" style={{ height: ANALYTICS_CHART_BODY_HEIGHT }}>
              <AnalyticsCustomersByChannelChart rows={channelMonthlyChartData} />
            </div>
          </AnalyticsChartShell>

          <AnalyticsChartShell
            title="Drop-off Rate"
            isEmpty={!hasDropOffMonthlyData}
            className="col-span-1 sm:col-span-2"
          >
            <div className="px-2" style={{ height: ANALYTICS_CHART_BODY_HEIGHT }}>
              <AnalyticsDropOffRateLineChart rows={dropOffMonthlyChartData} />
            </div>
          </AnalyticsChartShell>

          <AnalyticsChartShell
            title="Avg Time to Conversion"
            titleSuffix="by team members"
            isEmpty={avgConversionChartData.length === 0}
            className="col-span-1 sm:col-span-2"
          >
            <div className="px-2" style={{ height: ANALYTICS_CHART_BODY_HEIGHT }}>
              <AnalyticsVerticalBarChart
                data={avgConversionChartData.map((row) => ({
                  label: row.member,
                  value: row.averageConversionMs,
                }))}
                barColor={ANALYTICS_CHART_COLORS.bar}
                tooltipLabel="Avg time to conversion"
                formatValue={(value) => formatAnalyticsDuration(value)}
                allowDecimals
              />
            </div>
          </AnalyticsChartShell>

          <AnalyticsChartShell
            title="Conversion Rate"
            titleSuffix="by team members"
            isEmpty={topMemberChartData.length === 0}
            className="col-span-1 sm:col-span-2"
          >
            <div className="px-2" style={{ height: ANALYTICS_CHART_BODY_HEIGHT }}>
              <AnalyticsVerticalBarChart
                data={topMemberChartData.map((row) => ({
                  label: row.member,
                  value: row.conversionRate,
                  detail: `${formatAnalyticsNumber(row.convertedCount)} converted`,
                }))}
                barColor={ANALYTICS_CHART_COLORS.bar}
                tooltipLabel="Conversion rate"
                formatValue={(value) => formatAnalyticsRate(value)}
                allowDecimals
              />
            </div>
          </AnalyticsChartShell>
        </div>

        <TeamAnalyticsMemberTable
          members={memberRows}
          memberSearch={memberSearch}
          onMemberSearchChange={setMemberSearch}
        />
      </div>
    </PlanFeatureGate>
  );
}
