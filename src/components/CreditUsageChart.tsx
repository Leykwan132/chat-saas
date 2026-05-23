import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type DailyUsageRow = Record<string, number | string>;

type ChartSeriesConfig = {
  key: string;
  label: string;
  color: string;
};

type CreditUsageChartProps = {
  credits: number;
  totalUsedThisPeriod: number;
  periodStartMs: number;
  periodEndMs: number;
  dailyUsage: DailyUsageRow[];
  chartConfig: ChartSeriesConfig[];
};

const TOTAL_SERIES = 'total';

export function CreditUsageChart({
  credits,
  totalUsedThisPeriod,
  periodStartMs,
  periodEndMs,
  dailyUsage,
  chartConfig,
}: CreditUsageChartProps) {
  const [activeSeries, setActiveSeries] = useState<string>(TOTAL_SERIES);

  const rechartsConfig = useMemo(() => {
    const config: ChartConfig = {
      credits: { label: 'Credits' },
    };
    for (const series of chartConfig) {
      config[series.key] = {
        label: series.label,
        color: series.color,
      };
    }
    return config;
  }, [chartConfig]);

  const agentSeries = useMemo(
    () => chartConfig.filter((series) => series.key !== TOTAL_SERIES),
    [chartConfig],
  );

  const visibleSeries = useMemo(() => {
    if (activeSeries === TOTAL_SERIES) {
      return agentSeries.length > 0 ? agentSeries : [{ key: TOTAL_SERIES, label: 'Total usage', color: 'var(--chart-1)' }];
    }
    const selected = chartConfig.find((series) => series.key === activeSeries);
    return selected ? [selected] : [{ key: TOTAL_SERIES, label: 'Total usage', color: 'var(--chart-1)' }];
  }, [activeSeries, agentSeries, chartConfig]);

  const periodLabel = `${new Date(periodStartMs).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })} – ${new Date(periodEndMs).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;

  return (
    <Card className="overflow-hidden py-0">
      <CardHeader className="flex flex-col items-stretch border-b p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-4 sm:py-6">
          <CardTitle>Your usage</CardTitle>
          <CardDescription>
            Credit usage per day across this billing period ({periodLabel})
          </CardDescription>
        </div>
        <div className="flex border-t sm:border-t-0 sm:border-l">
          <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-4 sm:px-8 sm:py-6">
            <span className="text-xs text-muted-foreground">Current balance</span>
            <span className="text-lg leading-none font-bold tabular-nums sm:text-3xl">
              {credits.toLocaleString()}
            </span>
          </div>
          <div className="flex flex-1 flex-col justify-center gap-1 border-l px-6 py-4 sm:px-8 sm:py-6">
            <span className="text-xs text-muted-foreground">Total usage</span>
            <span className="text-lg leading-none font-bold tabular-nums sm:text-3xl">
              {totalUsedThisPeriod.toLocaleString()}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-2 pb-6 pt-4 sm:px-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Group by</span>
            <Select value={activeSeries} onValueChange={setActiveSeries}>
              <SelectTrigger size="sm" className="w-[200px]">
                <SelectValue placeholder="Select agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TOTAL_SERIES}>All agents</SelectItem>
                {agentSeries.map((series) => (
                  <SelectItem key={series.key} value={series.key}>
                    {series.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <ChartContainer config={rechartsConfig} className="aspect-auto h-[280px] w-full">
          <LineChart
            accessibilityLayer
            data={dailyUsage}
            margin={{ left: 4, right: 12, top: 8 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(`${value}T00:00:00.000Z`);
                return date.toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                });
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={48}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[180px]"
                  labelFormatter={(value) => {
                    const date = new Date(`${value}T00:00:00.000Z`);
                    return date.toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });
                  }}
                  formatter={(value) => (
                    <span className="font-mono tabular-nums">
                      {typeof value === 'number' ? value.toLocaleString() : String(value)} credits
                    </span>
                  )}
                />
              }
            />
            {activeSeries === TOTAL_SERIES && agentSeries.length > 0 ? (
              <>
                {visibleSeries.map((series) => (
                  <Line
                    key={series.key}
                    dataKey={series.key}
                    type="monotone"
                    stroke={`var(--color-${series.key})`}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
                {chartConfig.some((series) => series.key === 'other') && (
                  <Line
                    dataKey="other"
                    type="monotone"
                    stroke="var(--color-other)"
                    strokeWidth={2}
                    dot={false}
                  />
                )}
                <ChartLegend content={<ChartLegendContent />} />
              </>
            ) : (
              <Line
                dataKey={activeSeries === TOTAL_SERIES ? TOTAL_SERIES : visibleSeries[0]?.key ?? TOTAL_SERIES}
                type="monotone"
                stroke={`var(--color-${activeSeries === TOTAL_SERIES ? TOTAL_SERIES : visibleSeries[0]?.key ?? TOTAL_SERIES})`}
                strokeWidth={2}
                dot={false}
              />
            )}
          </LineChart>
        </ChartContainer>

        {agentSeries.length > 0 && (
          <div className="mt-4 hidden flex-wrap gap-2 sm:flex">
            {agentSeries.map((series, index) => (
              <button
                key={series.key}
                type="button"
                onClick={() => setActiveSeries(series.key)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors',
                  activeSeries === series.key
                    ? 'border-foreground/20 bg-muted/60 text-foreground'
                    : 'border-transparent text-muted-foreground hover:bg-muted/40',
                )}
              >
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: series.color }}
                />
                {series.label}
                {index === 0 && (
                  <span className="text-[10px] uppercase tracking-wide opacity-70">Most used</span>
                )}
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
