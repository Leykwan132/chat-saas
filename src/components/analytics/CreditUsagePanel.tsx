import { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  buildModelChartConfig,
  buildModelChartRows,
  formatPeriodLabel,
  formatTooltipDateLabel,
  METRIC_OPTIONS,
  TIME_RANGE_OPTIONS,
  type CreditMetric,
  type CreditTimeRange,
} from '@/components/analytics/creditUsageChartModel';

export type { CreditTimeRange };

const CHART_HEIGHT = 400;

export function CreditUsagePanel({
  scope = 'agent',
  agentId,
  workspaceId,
  timeRange,
  onTimeRangeChange,
  workspaceOptions,
  selectedWorkspaceId,
  onWorkspaceChange,
}: {
  scope?: 'agent' | 'workspace' | 'account';
  agentId?: Id<'agents'>;
  workspaceId?: string;
  timeRange: CreditTimeRange;
  onTimeRangeChange: (value: CreditTimeRange) => void;
  workspaceOptions?: Array<{ id: string; name: string }>;
  selectedWorkspaceId?: string;
  onWorkspaceChange?: (value: string) => void;
}) {
  const [metric, setMetric] = useState<CreditMetric>('cumulative');

  const agentUsage = useQuery(
    api.creditUsageAnalytics.getAgentCreditUsage,
    scope === 'agent' && agentId ? { agentId, timeRange } : 'skip'
  );
  const workspaceUsage = useQuery(
    api.creditUsageAnalytics.getWorkspaceCreditUsage,
    scope === 'workspace' && typeof workspaceId === 'string' ? { workspaceId, timeRange } : 'skip'
  );
  const accountUsage = useQuery(
    api.creditUsageAnalytics.getAccountCreditUsage,
    scope === 'account' ? { timeRange } : 'skip'
  );

  const usage =
    scope === 'agent'
      ? agentUsage
      : scope === 'workspace'
        ? workspaceUsage
        : accountUsage;

  const modelSeries = useMemo(
    () => usage?.modelUsage.series ?? [],
    [usage],
  );
  const seriesKeys = useMemo(
    () => modelSeries.map((series) => series.key),
    [modelSeries],
  );

  const chartConfig = useMemo(
    () => buildModelChartConfig(modelSeries),
    [modelSeries],
  );

  const chartRows = useMemo(() => {
    if (!usage?.modelUsage.daily.length) {
      return [];
    }

    return buildModelChartRows(usage.modelUsage.daily, seriesKeys, metric);
  }, [metric, seriesKeys, usage]);

  const hasModelBreakdown = chartRows.length > 0 && modelSeries.length > 0;

  return (
    <Card className="overflow-hidden rounded-xl py-0 shadow-none ring-1 ring-border/70">
      <CardHeader className="flex flex-col gap-4 border-b px-6 pt-6 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold">Credit usage</CardTitle>
          <CardDescription>
            {usage === undefined
              ? 'Loading credit usage…'
              : usage === null
                ? 'Credit usage unavailable.'
                : usage.totalCreditsUsed > 0
                  ? `${usage.totalCreditsUsed.toLocaleString()} credits used (${formatPeriodLabel(
                      usage.periodStartMs,
                      usage.periodEndMs,
                      usage.timeZone,
                    )})`
                  : `No credit usage yet (${formatPeriodLabel(
                      usage.periodStartMs,
                      usage.periodEndMs,
                      usage.timeZone,
                    )})`}
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {workspaceOptions && onWorkspaceChange && (
            <Select
              value={selectedWorkspaceId === '' ? 'personal' : (selectedWorkspaceId ?? 'all')}
              onValueChange={(val) => onWorkspaceChange(val === 'personal' ? '' : val)}
            >
              <SelectTrigger size="sm" className="w-[180px]">
                <SelectValue placeholder="All Workspaces" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workspaces</SelectItem>
                {workspaceOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id || 'personal'}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select
            value={metric}
            onValueChange={(value) => setMetric(value as CreditMetric)}
          >
            <SelectTrigger size="sm">
              <SelectValue placeholder="Metric" />
            </SelectTrigger>
            <SelectContent>
              {METRIC_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={timeRange}
            onValueChange={(value) => onTimeRangeChange(value as CreditTimeRange)}
          >
            <SelectTrigger size="sm">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              {TIME_RANGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="px-6 py-8 sm:px-8 sm:py-10">
        {usage === undefined ? (
          <Skeleton className="h-[400px] w-full rounded-xl" />
        ) : !hasModelBreakdown ? (
          <div
            className="flex items-center justify-center text-sm text-muted-foreground"
            style={{ height: CHART_HEIGHT }}
          >
            No credit usage recorded for this range.
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto w-full"
            style={{ height: CHART_HEIGHT }}
          >
            <AreaChart
              accessibilityLayer
              data={chartRows}
              margin={{ left: 8, right: 16, top: 12, bottom: 8 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="dateLabel"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={28}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={52}
                tickFormatter={(value) => value.toLocaleString()}
              />
              <ChartTooltip
                cursor={false}
                content={(tooltipProps) => {
                  const filteredPayload = tooltipProps.payload?.filter(
                    (item) => Number(item.value) !== 0,
                  );

                  if (
                    !tooltipProps.active ||
                    !filteredPayload ||
                    filteredPayload.length === 0
                  ) {
                    return null;
                  }

                  return (
                    <ChartTooltipContent
                      active={tooltipProps.active}
                      payload={filteredPayload}
                      className="w-[240px]"
                      indicator="dot"
                      labelFormatter={(_, payload) => {
                        const date = payload?.[0]?.payload?.date as string | undefined;
                        if (!date) {
                          return '';
                        }
                        return formatTooltipDateLabel(date);
                      }}
                    />
                  );
                }}
              />
              {modelSeries.map((series) => (
                <Area
                  key={series.key}
                  name={series.label}
                  dataKey={series.key}
                  type="monotone"
                  stackId="models"
                  stroke={series.color}
                  fill={series.color}
                  fillOpacity={0.78}
                  strokeWidth={1.5}
                  isAnimationActive={false}
                />
              ))}
              <ChartLegend
                verticalAlign="bottom"
                align="center"
                content={<ChartLegendContent />}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function CreditUsagePanelSkeleton() {
  return (
    <Card className={cn('overflow-hidden rounded-xl py-0 shadow-none ring-1 ring-border/70')}>
      <CardHeader className="border-b px-6 pt-6 pb-5">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-2 h-4 w-56" />
      </CardHeader>
      <CardContent className="px-6 py-8 sm:px-8 sm:py-10">
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </CardContent>
    </Card>
  );
}
