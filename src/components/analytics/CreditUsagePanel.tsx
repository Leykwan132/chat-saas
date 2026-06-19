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
  type ChartConfig,
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

type CreditTimeRange = '7d' | '30d' | '90d' | 'period';
type CreditMetric = 'daily' | 'cumulative';

export type { CreditTimeRange };

const TIME_RANGE_OPTIONS: Array<{ value: CreditTimeRange; label: string }> = [
  { value: 'period', label: 'Billing period' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

const CHART_HEIGHT = 400;

const METRIC_OPTIONS: Array<{ value: CreditMetric; label: string }> = [
  { value: 'daily', label: 'Daily' },
  { value: 'cumulative', label: 'Cumulative' },
];

function formatPeriodLabel(startMs: number, endMs: number) {
  const start = new Date(startMs);
  const end = new Date(endMs);
  const formatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  });
  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

function formatDateLabel(date: string) {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function formatTooltipDateLabel(date: string) {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function buildModelChartConfig(
  series: Array<{ key: string; label: string; color: string }>,
): ChartConfig {
  return Object.fromEntries(
    series.map((item) => [
      item.key,
      {
        label: item.label,
        color: item.color,
      },
    ]),
  );
}

function buildModelChartRows(
  daily: Array<Record<string, number | string>>,
  seriesKeys: string[],
  metric: CreditMetric,
) {
  if (metric === 'daily') {
    return daily.map((row) => ({
      ...row,
      dateLabel: formatDateLabel(String(row.date)),
    }));
  }

  const runningTotals = Object.fromEntries(seriesKeys.map((key) => [key, 0]));

  return daily.map((row) => {
    const nextRow: Record<string, number | string> = {
      date: row.date,
      dateLabel: formatDateLabel(String(row.date)),
    };

    for (const key of seriesKeys) {
      runningTotals[key] += (row[key] as number | undefined) ?? 0;
      nextRow[key] = runningTotals[key];
    }

    return nextRow;
  });
}

export function CreditUsagePanel({
  agentId,
  timeRange,
  onTimeRangeChange,
}: {
  agentId: Id<'agents'>;
  timeRange: CreditTimeRange;
  onTimeRangeChange: (value: CreditTimeRange) => void;
}) {
  const [metric, setMetric] = useState<CreditMetric>('cumulative');
  const usage = useQuery(api.creditUsageAnalytics.getAgentCreditUsage, {
    agentId,
    timeRange,
  });

  const modelSeries = usage?.modelUsage.series ?? [];
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
                    )})`
                  : `No credit usage yet (${formatPeriodLabel(
                      usage.periodStartMs,
                      usage.periodEndMs,
                    )})`}
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
