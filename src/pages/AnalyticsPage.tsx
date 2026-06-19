import { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { Navigate, useNavigate, useParams } from 'react-router';
import {
  Bot,
  Hash,
  Search,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PlanFeatureGate } from '@/components/PlanFeatureGate';
import { emptyCustomerSentimentCounts } from '../../shared/customerSentiment';
import {
  AnalyticsChartShell,
  ANALYTICS_CHART_BODY_HEIGHT,
  ANALYTICS_CHART_COLORS,
  AnalyticsCustomerSentimentPieChart,
  AnalyticsCustomersByChannelChart,
  AnalyticsDropOffRateLineChart,
  getTopicMapShellHeight,
  TOPIC_BAR_OPACITY_GRADIENT,
  AnalyticsDataTable,
  AnalyticsHorizontalBarChart,
  AnalyticsMetricCards,
  AnalyticsMemberRoleTag,
  AnalyticsVerticalBarChart,
  analyticsTeamOverviewGridClass,
  analyticsAdvancedOverviewGridClass,
  AnalyticsRangeToggle,
  AnalyticsSectionHeader,
  AnalyticsSectionHeaderSkeleton,
  AnalyticsSectionNav,
  TeamAnalyticsSkeleton,
  TopicsAnalyticsSkeleton,
} from '@/components/analytics/AnalyticsUi';
import { pricingTableShellClass, pricingSectionBorderClass } from '@/components/pricing/pricingStyles';
import { PlanUsageCard } from '@/components/analytics/PlanUsageCard';
import {
  CreditUsagePanel,
  CreditUsagePanelSkeleton,
  type CreditTimeRange,
} from '@/components/analytics/CreditUsagePanel';
import { CreditSpendTable, CreditSpendTableSkeleton } from '@/components/analytics/CreditSpendTable';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '../../shared/permissions';
import { PLAN_CATALOG, getDefaultAnalyticsSection, type PlanKey } from '../../shared/planCatalog';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

type AnalyticsRange = '7d' | '30d' | '90d' | 'all';
type AnalyticsSection = 'team' | 'topics' | 'usage';

const RANGE_OPTIONS: Array<{ value: AnalyticsRange; label: string }> = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'all', label: 'All time' },
];

const ANALYTICS_SECTIONS: Array<{
  section: AnalyticsSection;
  label: string;
  icon: React.ElementType;
  title: string;
  description: string;
}> = [
  {
    section: 'usage',
    label: 'AI Agent Usage',
    icon: Bot,
    title: 'AI Agent Usage',
    description: 'See how much token spend this agent has used across models over time.',
  },
  {
    section: 'team',
    label: 'Team Analytics',
    icon: Users,
    title: 'Team Analytics',
    description: 'Track team performance, channel conversions, and member outcomes.',
  },
  {
    section: 'topics',
    label: 'Advanced Analytics',
    icon: Hash,
    title: 'Advanced Analytics',
    description:
      'Discover common conversation topics and track customer sentiment across your chats.',
  },
];

function formatDuration(ms: number | null | undefined) {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) {
    return '—';
  }

  const minutes = Math.round(ms / 60000);
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.round((minutes / 60) * 10) / 10;
  if (hours < 48) {
    return `${hours}h`;
  }

  const days = Math.round((hours / 24) * 10) / 10;
  return `${days}d`;
}

function formatNumber(value: number | undefined) {
  return new Intl.NumberFormat().format(Math.round(value ?? 0));
}

function formatRate(value: number | undefined) {
  return `${(value ?? 0).toFixed((value ?? 0) % 1 === 0 ? 0 : 1)}%`;
}

function formatDecimal(value: number | undefined) {
  return (value ?? 0).toFixed(1);
}

function AccessDenied() {
  return (
    <div className={pricingTableShellClass}>
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-8 py-16 text-center">
        <ShieldAlert className="size-8 text-muted-foreground" />
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Analytics access required
        </h2>
        <p className="max-w-md text-base text-muted-foreground">
          You do not have permission to view team analytics for this workspace.
        </p>
      </div>
    </div>
  );
}

function TeamAnalyticsContent({ range }: { range: AnalyticsRange }) {
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

  const memberRows = members ?? [];

  const channelMonthlyChartData = channelMonthly?.rows ?? [];
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
          averageConversionLabel: member.averageConversionLabel,
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

  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    if (!query) {
      return memberRows;
    }

    return memberRows.filter((member) =>
      member.name.toLowerCase().includes(query),
    );
  }, [memberSearch, memberRows]);

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
              formatValue={(value) => formatDuration(value)}
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
                detail: `${formatNumber(row.convertedCount)} converted`,
              }))}
              barColor={ANALYTICS_CHART_COLORS.bar}
              tooltipLabel="Conversion rate"
              formatValue={(value) => formatRate(value)}
              allowDecimals
            />
          </div>
        </AnalyticsChartShell>
      </div>

      <div className={pricingTableShellClass}>
        <div className={cn('border-b px-8 py-4', pricingSectionBorderClass())}>
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={memberSearch}
              onChange={(event) => setMemberSearch(event.target.value)}
              placeholder="Search member name..."
              className="pl-9"
            />
          </div>
        </div>
        <AnalyticsDataTable
          minWidth="760px"
          emptyMessage={
            memberSearch.trim()
              ? 'No members match your search.'
              : 'No member analytics yet.'
          }
          defaultSort={{ key: 'assigned', direction: 'desc' }}
          rowKey={(member) => member.workosUserId}
          rows={filteredMembers}
          columns={[
            {
              key: 'member',
              header: 'Member',
              sortValue: (member) => member.name.toLowerCase(),
              cell: (member) => (
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{member.name}</span>
                    <AnalyticsMemberRoleTag roleSlug={member.roleSlug} />
                  </div>
                  <div className="text-sm text-muted-foreground">{member.email}</div>
                </div>
              ),
            },
            {
              key: 'assigned',
              header: 'Assigned',
              align: 'center',
              sortValue: (member) => member.assignedConversationCount,
              cell: (member) => formatNumber(member.assignedConversationCount),
            },
            {
              key: 'active',
              header: 'Active',
              align: 'center',
              sortValue: (member) => member.activeConversationCount,
              cell: (member) => formatNumber(member.activeConversationCount),
            },
            {
              key: 'sent',
              header: 'Sent',
              align: 'center',
              sortValue: (member) => member.messageSentCount,
              cell: (member) => formatNumber(member.messageSentCount),
            },
            {
              key: 'avg',
              header: 'Avg Msg/Conv',
              align: 'center',
              sortValue: (member) => member.averageMessagesPerConversation,
              cell: (member) => formatDecimal(member.averageMessagesPerConversation),
            },
            {
              key: 'firstReply',
              header: 'First Reply',
              align: 'center',
              sortValue: (member) => member.averageFirstReplyMs,
              cell: (member) => member.averageFirstReplyLabel,
            },
            {
              key: 'conversion',
              header: 'Conv.',
              align: 'center',
              sortValue: (member) => member.conversionRate,
              cell: (member) => formatRate(member.conversionRate),
            },
            {
              key: 'drop',
              header: 'Drop',
              align: 'center',
              sortValue: (member) => member.dropRate,
              cell: (member) => formatRate(member.dropRate),
            },
          ]}
        />
      </div>

      </div>
    </PlanFeatureGate>
  );
}

const TOPIC_MAP_COLLAPSED_COUNT = 5;

function TopicsAnalyticsContent({ range }: { range: AnalyticsRange }) {
  const [topicMapExpanded, setTopicMapExpanded] = useState(false);
  const topics = useQuery(api.analytics.getTopics, { range });
  const sentiment = useQuery(api.analytics.getCustomerSentimentDistribution, { range });

  const topicRows = topics?.tableRows ?? [];
  const sentimentDistribution = sentiment ?? emptyCustomerSentimentCounts();

  const topicChartData = useMemo(() => {
    const limit = topicMapExpanded
      ? topicRows.length
      : Math.min(TOPIC_MAP_COLLAPSED_COUNT, topicRows.length);

    return topicRows.slice(0, limit).map((topic) => ({
      key: topic.topicId,
      label: topic.topic,
      value: topic.count,
      displayValue: formatNumber(topic.count),
    }));
  }, [topicRows, topicMapExpanded]);

  const canExpandTopicMap = topicRows.length > TOPIC_MAP_COLLAPSED_COUNT;
  const chartRowHeight = Math.max(
    getTopicMapShellHeight(topicChartData.length, {
      includeExpandAction: canExpandTopicMap,
    }),
    420,
  );

  if (topics === undefined || sentiment === undefined) {
    return <TopicsAnalyticsSkeleton />;
  }

  return (
    <PlanFeatureGate
      featureKey="topic_analytics"
      featureName="Advanced Analytics"
      className="min-h-0"
    >
      <div className="flex flex-col gap-4">
        <div className={analyticsAdvancedOverviewGridClass}>
          <AnalyticsChartShell
            title="Common Topic"
            isEmpty={topicChartData.length === 0}
            emptyMessage="Nothing available yet."
            shellStyle={{ height: chartRowHeight }}
          >
            <div className="flex min-h-0 flex-1 flex-col">
              <AnalyticsHorizontalBarChart
                data={topicChartData}
                opacityGradient={TOPIC_BAR_OPACITY_GRADIENT}
                labelWidth={168}
                align="start"
                gapClass="gap-5"
                barHeightClass="h-9"
                barRadiusClass="rounded-sm"
                textClassName="text-[15px]"
                rowTooltip={(row) => (
                  <>
                    <span className="font-medium">{row.label}</span>
                    <span className="text-background/80">
                      {formatNumber(row.value)} conversation{row.value === 1 ? '' : 's'} mentioned
                      this
                    </span>
                  </>
                )}
              />
              {canExpandTopicMap ? (
                <div className="mt-auto flex justify-center px-4 pt-5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setTopicMapExpanded((expanded) => !expanded)}
                  >
                    {topicMapExpanded ? 'Show less' : 'Show more'}
                  </Button>
                </div>
              ) : null}
            </div>
          </AnalyticsChartShell>

          <AnalyticsChartShell
            title="Customer Sentiment"
            shellStyle={{ height: chartRowHeight }}
          >
            <div className="flex min-h-0 flex-1 items-center justify-center px-2">
              <AnalyticsCustomerSentimentPieChart distribution={sentimentDistribution} />
            </div>
          </AnalyticsChartShell>
        </div>

        <div className={pricingTableShellClass}>
          <AnalyticsDataTable
            minWidth="480px"
            emptyMessage="Nothing available yet."
            defaultSort={{ key: 'mentions', direction: 'desc' }}
            rowKey={(topic) => topic.topicId}
            rows={topicRows}
            isRowExpandable={(topic) => Boolean(topic.description?.trim())}
            renderExpandedRow={(topic) =>
              topic.description ? (
                <div className="rounded-lg bg-muted/70 px-4 py-3.5 text-base leading-7 text-foreground">
                  {topic.description}
                </div>
              ) : null
            }
            columns={[
              {
                key: 'topic',
                header: 'Topic',
                sortValue: (topic) => topic.topic.toLowerCase(),
                cell: (topic) => (
                  <div className="flex items-center gap-2 font-medium">
                    <Hash className="size-4 text-muted-foreground" />
                    <span>{topic.topic}</span>
                  </div>
                ),
              },
              {
                key: 'mentions',
                header: 'Mentions',
                align: 'center',
                sortValue: (topic) => topic.count,
                cell: (topic) => formatNumber(topic.count),
              },
            ]}
          />
        </div>
      </div>
    </PlanFeatureGate>
  );
}

function UsageAnalyticsContent({ agentId }: { agentId: string }) {
  const typedAgentId = agentId as Id<'agents'>;
  const [timeRange, setTimeRange] = useState<CreditTimeRange>('period');

  return (
    <PlanFeatureGate featureKey="agent_usage" featureName="AI Agent Usage">
      <div className="flex flex-col gap-4">
        <PlanUsageCard />
        <div className="flex flex-col gap-6">
          <CreditUsagePanel
            agentId={typedAgentId}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
          />
          <CreditSpendTable agentId={typedAgentId} timeRange={timeRange} />
        </div>
      </div>
    </PlanFeatureGate>
  );
}

function UsageAnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <CreditUsagePanelSkeleton />
      <CreditSpendTableSkeleton />
    </div>
  );
}

export default function AnalyticsPage() {
  const { agentId, section: rawSection } = useParams();
  const navigate = useNavigate();
  const [range, setRange] = useState<AnalyticsRange>('30d');
  const { can, isLoading: permissionsLoading } = usePermissions();
  const planAndUsage = useQuery(api.plans.getPlanAndUsage, {});
  const canReadAnalytics = !permissionsLoading && can(Permission.ANALYTICS_READ);

  const currentPlan = (planAndUsage?.plan ?? 'free') as PlanKey;
  const hasAgentUsage = Boolean(PLAN_CATALOG[currentPlan]?.features.agent_usage);
  const hasTeamAnalytics = Boolean(PLAN_CATALOG[currentPlan]?.features.team_analytics);
  const hasTopicAnalytics = Boolean(PLAN_CATALOG[currentPlan]?.features.topic_analytics);
  const defaultSection = getDefaultAnalyticsSection(currentPlan);

  const visibleSections = useMemo(() => {
    if (planAndUsage === undefined) {
      return ANALYTICS_SECTIONS;
    }

    return ANALYTICS_SECTIONS.filter((item) => {
      if (item.section === 'usage') {
        return hasAgentUsage;
      }
      if (item.section === 'team') {
        return hasTeamAnalytics;
      }
      return hasTopicAnalytics;
    });
  }, [planAndUsage, hasAgentUsage, hasTeamAnalytics, hasTopicAnalytics]);

  const section: AnalyticsSection =
    rawSection === 'topics'
      ? 'topics'
      : rawSection === 'usage' || rawSection === 'agent'
        ? 'usage'
        : 'team';

  if (rawSection === 'agent' && agentId) {
    return <Navigate to={`/dashboard/${agentId}/analytics/usage`} replace />;
  }

  if (
    rawSection &&
    rawSection !== 'team' &&
    rawSection !== 'topics' &&
    rawSection !== 'usage' &&
    rawSection !== 'agent'
  ) {
    return <Navigate to={`/dashboard/${agentId}/analytics/${defaultSection}`} replace />;
  }

  if (planAndUsage !== undefined && section === 'team' && !hasTeamAnalytics) {
    return <Navigate to={`/dashboard/${agentId}/analytics/${defaultSection}`} replace />;
  }

  if (
    planAndUsage !== undefined &&
    section === 'topics' &&
    !hasTopicAnalytics
  ) {
    const fallbackSection = hasTeamAnalytics ? 'team' : defaultSection;
    return <Navigate to={`/dashboard/${agentId}/analytics/${fallbackSection}`} replace />;
  }

  if (planAndUsage !== undefined && section === 'usage' && !hasAgentUsage) {
    const fallbackSection = hasTeamAnalytics ? 'team' : hasTopicAnalytics ? 'topics' : defaultSection;
    return <Navigate to={`/dashboard/${agentId}/analytics/${fallbackSection}`} replace />;
  }

  const activeSection =
    visibleSections.find((item) => item.section === section) ??
    ANALYTICS_SECTIONS.find((item) => item.section === section)!;

  if (!permissionsLoading && !canReadAnalytics) {
    return (
      <div className="flex w-full flex-col gap-8">
        <AccessDenied />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-8">
      <div className="grid gap-8 lg:grid-cols-[252px_1fr]">
        <AnalyticsSectionNav
          items={visibleSections.map((item) => ({
            id: item.section,
            label: item.label,
            icon: item.icon,
          }))}
          activeId={section}
          onSelect={(nextSection) =>
            navigate(`/dashboard/${agentId}/analytics/${nextSection}`)
          }
        />

        <div className="flex min-w-0 flex-col gap-8">
          {permissionsLoading ? (
            <>
              <AnalyticsSectionHeaderSkeleton />
              {section === 'team' ? (
                <TeamAnalyticsSkeleton />
              ) : section === 'topics' ? (
                <TopicsAnalyticsSkeleton />
              ) : (
                <UsageAnalyticsSkeleton />
              )}
            </>
          ) : (
            <>
              <AnalyticsSectionHeader
                title={activeSection.title}
                description={activeSection.description}
                action={
                  section === 'usage' ? undefined : (
                    <AnalyticsRangeToggle
                      value={range}
                      options={RANGE_OPTIONS}
                      onChange={setRange}
                    />
                  )
                }
              />

              {section === 'team' ? (
                <TeamAnalyticsContent range={range} />
              ) : section === 'topics' ? (
                <TopicsAnalyticsContent range={range} />
              ) : agentId ? (
                <UsageAnalyticsContent agentId={agentId} />
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
