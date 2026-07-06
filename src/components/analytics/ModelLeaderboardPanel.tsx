import { useState } from 'react';
import { Astroid, Trophy } from 'lucide-react';
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
import {
  MODEL_USAGE_OTHERS_COLOR,
  modelUsageChartColor,
} from '../../../shared/modelUsageChartColors';
import { cn } from '@/lib/utils';
import {
  ModelLeaderboardSkeleton,
  ModelLogo,
  ModelUsageTooltip,
} from './ModelLeaderboardDisplay';
import {
  buildModelColorMap,
  formatTokens,
  getCleanModelName,
  type LifetimeModelUsageRow,
  type MonthlyModelUsageAggregates,
  type SupportedModelOption,
} from './modelLeaderboardUtils';

export { ModelLeaderboardSkeleton };

type ModelLeaderboardPanelProps = {
  aggregates?: LifetimeModelUsageRow[];
  monthlyAggregates?: MonthlyModelUsageAggregates;
  supportedModels?: SupportedModelOption[];
  isLoading?: boolean;
  className?: string;
};

export function ModelLeaderboardPanel({
  aggregates,
  monthlyAggregates,
  supportedModels,
  isLoading = false,
  className,
}: ModelLeaderboardPanelProps) {
  const [showAll, setShowAll] = useState(false);

  if (isLoading || aggregates === undefined || monthlyAggregates === undefined) {
    return <ModelLeaderboardSkeleton className={className} />;
  }

  const displayList = showAll ? aggregates : aggregates.slice(0, 10);
  const firstHalf = displayList.slice(0, Math.ceil(displayList.length / 2));
  const secondHalf = displayList.slice(Math.ceil(displayList.length / 2));
  const chartData = monthlyAggregates.data;
  const topModels = monthlyAggregates.topModels;
  const modelColorMap = buildModelColorMap(topModels, modelUsageChartColor);
  const chartConfig = {
    others: {
      label: 'Others',
      color: MODEL_USAGE_OTHERS_COLOR,
    },
    ...Object.fromEntries(
      topModels.map((model) => [
        model,
        {
          label: getCleanModelName(model, supportedModels),
          color: modelColorMap.get(model) ?? MODEL_USAGE_OTHERS_COLOR,
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
                    fill={modelColorMap.get(model) ?? MODEL_USAGE_OTHERS_COLOR}
                    maxBarSize={24}
                  />
                ))}
                <Bar
                  name="Others"
                  dataKey="others"
                  stackId="a"
                  fill={MODEL_USAGE_OTHERS_COLOR}
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
