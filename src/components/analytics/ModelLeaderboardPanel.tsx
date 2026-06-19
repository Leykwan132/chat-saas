import { useState } from 'react';
import { Astroid, Trophy } from 'lucide-react';
import { ModelIcon } from '@lobehub/icons';
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { NumberTicker } from '@/components/ui/number-ticker';
import { Highlighter } from '@/components/ui/highlighter';
import { cn } from '@/lib/utils';

export type LifetimeModelUsageRow = {
  model: string;
  totalTokens: number;
};

export type MonthlyModelUsageAggregates = {
  topModels: string[];
  data: Array<Record<string, number | string>>;
};

type SupportedModelOption = {
  value: string;
  label: string;
  chef?: string;
};

const MODEL_CHART_COLORS = [
  '#06b6d4',
  '#f97316',
  '#3b82f6',
  '#d946ef',
  '#22c55e',
  '#a855f7',
  '#eab308',
  '#ef4444',
  '#14b8a6',
  '#6366f1',
  '#84cc16',
  '#ec4899',
] as const;

function formatTokens(num: number, decimals = true): string {
  if (num >= 1e12) {
    const val = num / 1e12;
    return (decimals ? val.toFixed(2) : val.toFixed(0)) + 'T';
  }
  if (num >= 1e9) {
    const val = num / 1e9;
    return (decimals ? val.toFixed(2) : val.toFixed(0)) + 'B';
  }
  if (num >= 1e6) {
    const val = num / 1e6;
    return (decimals ? val.toFixed(2) : val.toFixed(0)) + 'M';
  }
  if (num >= 1e3) {
    const val = num / 1e3;
    return (decimals && val % 1 !== 0 ? val.toFixed(1) : val.toFixed(0)) + 'K';
  }
  return num.toLocaleString();
}

export function getCleanModelName(
  model: string,
  supportedModels?: SupportedModelOption[],
): string {
  if (supportedModels) {
    const found = supportedModels.find((entry) => entry.value === model);
    if (found) return found.label;
  }

  const baseName = model.split('/').pop() || model;
  return baseName.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function ModelLogo({ model, size = 18 }: { model: string; size?: number }) {
  return (
    <ModelIcon
      model={model}
      size={size}
      type="color"
      className="select-none"
    />
  );
}

function buildModelColorMap(models: string[]): Map<string, string> {
  const colorMap = new Map<string, string>();
  models.forEach((model, index) => {
    colorMap.set(model, MODEL_CHART_COLORS[index % MODEL_CHART_COLORS.length]);
  });
  return colorMap;
}

function ModelUsageTooltip({
  active,
  payload,
  topModels,
  supportedModels,
  modelColorMap,
}: {
  active?: boolean;
  payload?: Array<{ payload?: Record<string, number | string> }>;
  topModels: string[];
  supportedModels?: SupportedModelOption[];
  modelColorMap: Map<string, string>;
}) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const monthData = payload[0]?.payload;
  if (!monthData) return null;

  const modelEntries = [];

  for (const model of topModels) {
    const tokens = Number(monthData[model]) || 0;
    if (tokens > 0) {
      modelEntries.push({
        key: model,
        name: getCleanModelName(model, supportedModels),
        value: tokens,
        color: modelColorMap.get(model) ?? '#71717a',
      });
    }
  }

  const othersTokens = Number(monthData.others) || 0;
  if (othersTokens > 0) {
    modelEntries.push({
      key: 'others',
      name: 'Others',
      value: othersTokens,
      color: '#71717a',
    });
  }

  modelEntries.sort((left, right) => right.value - left.value);
  const total = Number(monthData.prompt || 0) + Number(monthData.completion || 0);

  return (
    <div className="grid min-w-48 animate-fade-in items-start gap-2 rounded-xl border border-zinc-200/50 bg-white px-3 py-2.5 text-xs text-zinc-950 shadow-xl ring-1 ring-black/5 dark:border-white/[0.08] dark:bg-zinc-950 dark:text-zinc-50 dark:ring-white/10">
      <div className="w-max rounded bg-zinc-900 px-2 py-1 text-[10px] font-semibold text-white select-none">
        {String(monthData.month)}
      </div>
      <div className="mt-1 flex flex-col gap-1.5">
        {modelEntries.map((entry) => (
          <div key={entry.key} className="flex w-full items-center justify-between gap-3 leading-none">
            <div className="flex min-w-0 items-center gap-2">
              <div
                className="h-2.5 w-1 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="truncate font-medium text-zinc-500 dark:text-zinc-400">
                {entry.name}
              </span>
            </div>
            <span className="shrink-0 font-mono font-semibold text-zinc-900 tabular-nums dark:text-white">
              {formatTokens(entry.value)}
            </span>
          </div>
        ))}
      </div>
      <div className="my-1 h-px bg-zinc-100 dark:bg-white/[0.06]" />
      <div className="flex items-center justify-between gap-3 font-semibold leading-none text-zinc-900 dark:text-white">
        <span>Total</span>
        <span className="font-mono">{formatTokens(total)}</span>
      </div>
    </div>
  );
}

export function ModelLeaderboardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex w-full flex-col gap-6 animate-fade-in', className)}>
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-white/[0.08] dark:bg-white/[0.02]">
        <div className="flex items-center gap-2.5">
          <Skeleton className="size-5 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="mt-4 h-[320px] w-full" />
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-white/[0.08] dark:bg-white/[0.02]">
        <Skeleton className="mb-4 h-5 w-28" />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

type ModelLeaderboardPanelProps = {
  aggregates?: LifetimeModelUsageRow[];
  monthlyAggregates?: MonthlyModelUsageAggregates;
  supportedModels?: SupportedModelOption[];
  isLoading?: boolean;
  compactHeader?: boolean;
  className?: string;
};

export function ModelLeaderboardPanel({
  aggregates,
  monthlyAggregates,
  supportedModels,
  isLoading = false,
  compactHeader = false,
  className,
}: ModelLeaderboardPanelProps) {
  const [showAll, setShowAll] = useState(false);

  if (isLoading || aggregates === undefined || monthlyAggregates === undefined) {
    return <ModelLeaderboardSkeleton className={className} />;
  }

  const totalTokens = aggregates.reduce((sum, item) => sum + item.totalTokens, 0);
  const displayList = showAll ? aggregates : aggregates.slice(0, 10);
  const firstHalf = displayList.slice(0, Math.ceil(displayList.length / 2));
  const secondHalf = displayList.slice(Math.ceil(displayList.length / 2));
  const chartData = monthlyAggregates.data;
  const topModels = monthlyAggregates.topModels;
  const modelColorMap = buildModelColorMap(topModels);
  const chartConfig = {
    others: {
      label: 'Others',
      color: '#71717a',
    },
    ...Object.fromEntries(
      topModels.map((model) => [
        model,
        {
          label: getCleanModelName(model, supportedModels),
          color: modelColorMap.get(model) ?? '#71717a',
        },
      ]),
    ),
  } satisfies ChartConfig;

  const renderRankingRow = (item: LifetimeModelUsageRow, rank: number) => {
    const cleanName = getCleanModelName(item.model, supportedModels);
    const parts = item.model.split('/');
    const provider = parts.length > 1 ? parts[0] : 'openrouter';

    return (
      <div
        key={item.model}
        className="flex items-center justify-between rounded-lg border-b border-zinc-100 px-3 py-4 transition-all duration-200 last:border-0 hover:bg-zinc-50/50 dark:border-white/[0.04] dark:hover:bg-white/[0.01]"
      >
        <div className="flex min-w-0 items-center gap-3.5">
          <span className="w-6 shrink-0 text-left text-base font-semibold text-zinc-400 tabular-nums dark:text-zinc-500">
            {rank}.
          </span>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-zinc-200/80 bg-white dark:border-white/[0.08] dark:bg-zinc-900">
            <ModelLogo model={item.model} />
          </div>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-[14px] font-semibold text-zinc-900 dark:text-white">
              {cleanName}
            </span>
            <span className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              by <span className="font-medium text-zinc-600 dark:text-zinc-300">{provider}</span>
            </span>
          </div>
        </div>
        <span className="shrink-0 text-sm font-light text-zinc-500 dark:text-zinc-400">
          {formatTokens(item.totalTokens)} tokens
        </span>
      </div>
    );
  };

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <div
        className={cn(
          'flex flex-col gap-2',
          compactHeader ? 'items-start' : 'items-center justify-center py-8 text-center',
        )}
      >
        <div
          className={cn(
            'flex min-h-[28px] items-center gap-1.5 text-sm font-medium text-zinc-500 dark:text-zinc-400 sm:text-base',
            compactHeader ? 'justify-start' : 'justify-center',
          )}
        >
          <span>Total token spend:</span>
          <Highlighter
            action="underline"
            color="#6366f1"
            strokeWidth={2}
            animationDuration={1200}
            padding={2}
          >
            <span className="text-base font-bold text-zinc-950 tabular-nums dark:text-white sm:text-lg">
              <NumberTicker value={totalTokens} />
            </span>
          </Highlighter>
          <span>tokens</span>
        </div>
      </div>

      <Card className="animate-fade-in overflow-hidden rounded-xl border border-zinc-200 bg-white py-0 shadow-none dark:border-white/[0.08] dark:bg-white/[0.02]">
        <CardHeader className="flex flex-row items-center gap-2.5 border-b border-zinc-200 bg-zinc-50/50 px-5 py-4! dark:border-white/[0.06] dark:bg-white/[0.01]">
          <Astroid className="size-5 shrink-0 text-zinc-950 dark:text-white" />
          <CardTitle className="text-base leading-none font-semibold">Top Models</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          {chartData.length === 0 ? (
            <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
              No usage recorded yet.
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[320px] w-full">
              <BarChart accessibilityLayer data={chartData} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" opacity={0.4} />
                <XAxis
                  dataKey="month"
                  stroke="var(--color-foreground-muted)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  tickFormatter={(value) => {
                    const parts = String(value).split(' ');
                    if (parts.length === 2) {
                      return `${parts[0]!.slice(0, 3)} '${parts[1]!.slice(-2)}`;
                    }
                    return String(value);
                  }}
                />
                <YAxis
                  stroke="var(--color-foreground-muted)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => formatTokens(Number(value), false)}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ModelUsageTooltip
                      topModels={topModels}
                      supportedModels={supportedModels}
                      modelColorMap={modelColorMap}
                    />
                  }
                />
                {topModels.map((model) => (
                  <Bar
                    key={model}
                    name={getCleanModelName(model, supportedModels)}
                    dataKey={model}
                    stackId="a"
                    fill={modelColorMap.get(model) ?? '#71717a'}
                    maxBarSize={24}
                  />
                ))}
                <Bar
                  name="Others"
                  dataKey="others"
                  stackId="a"
                  fill="#71717a"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card className="animate-fade-in flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-none sm:p-6 dark:border-white/[0.08] dark:bg-white/[0.02]">
        <div className="border-b border-zinc-150 pb-4 dark:border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Trophy className="size-5.5 fill-zinc-500/10 text-zinc-500" />
            <span className="text-lg leading-none font-semibold text-zinc-900 dark:text-white">
              Ranking
            </span>
          </div>
        </div>

        {aggregates.length === 0 ? (
          <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
            No usage recorded yet.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-x-12 gap-y-1 lg:grid-cols-2">
              <div className="flex flex-col divide-y divide-zinc-100 dark:divide-white/[0.04]">
                {firstHalf.map((item, index) => renderRankingRow(item, index + 1))}
              </div>
              <div className="flex flex-col divide-y divide-zinc-100 dark:divide-white/[0.04]">
                {secondHalf.map((item, index) =>
                  renderRankingRow(item, firstHalf.length + index + 1),
                )}
              </div>
            </div>

            {aggregates.length > 10 ? (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setShowAll((current) => !current)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-zinc-200/50 px-3.5 py-1.5 text-xs font-semibold text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:border-white/[0.06] dark:text-zinc-400 dark:hover:bg-white/[0.04] dark:hover:text-white"
                >
                  {showAll ? 'Show less' : 'Show more'}
                </button>
              </div>
            ) : null}
          </div>
        )}
      </Card>
    </div>
  );
}
