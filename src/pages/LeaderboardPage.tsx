import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Spinner } from '@/components/ui/spinner';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { NumberTicker } from '@/components/ui/number-ticker';
import { Highlighter } from '@/components/ui/highlighter';
import { Trophy, Astroid } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { ModelIcon } from '@lobehub/icons';

type LifetimeModelUsageRow = {
  model: string;
  totalTokens: number;
};

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

// Utility: Format token count (e.g. 3.12T, 1.25B, 850K)
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



// Utility: Parse raw model slugs to pretty display names using backend labels
function getCleanModelName(model: string, supportedModels?: any[]): string {
  if (supportedModels) {
    const found = supportedModels.find(m => m.value === model);
    if (found) return found.label;
  }
  
  const baseName = model.split('/').pop() || model;
  return baseName.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
}

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

function buildModelColorMap(models: string[]): Map<string, string> {
  const colorMap = new Map<string, string>();
  models.forEach((model, index) => {
    colorMap.set(model, MODEL_CHART_COLORS[index % MODEL_CHART_COLORS.length]);
  });
  return colorMap;
}

// Custom tooltip matching mockup: lists model names, token counts (sorted desc), and a total
const CustomTooltip = ({ active, payload, label, topModels, supportedModels, modelColorMap }: any) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  // Retrieve the full data object of the hovered month
  const monthData = payload[0].payload;
  if (!monthData) return null;

  // Extract model tokens list
  const modelEntries = [];
  
  // 1. Add top models
  if (topModels) {
    for (const m of topModels) {
      const tokens = Number(monthData[m]) || 0;
      if (tokens > 0) {
        modelEntries.push({
          key: m,
          name: getCleanModelName(m, supportedModels),
          value: tokens,
          color: modelColorMap.get(m) ?? '#71717a',
        });
      }
    }
  }

  // 2. Add others
  const othersTokens = Number(monthData.others) || 0;
  if (othersTokens > 0) {
    modelEntries.push({
      key: 'others',
      name: 'Others',
      value: othersTokens,
      color: '#71717a',
    });
  }

  // Sort model entries by value descending
  modelEntries.sort((a, b) => b.value - a.value);

  // Total tokens for this month (prompt + completion)
  const total = Number(monthData.prompt || 0) + Number(monthData.completion || 0);

  return (
    <div className="grid min-w-48 items-start gap-2 rounded-xl bg-white dark:bg-zinc-950 px-3 py-2.5 text-xs text-zinc-950 dark:text-zinc-50 shadow-xl ring-1 ring-black/5 dark:ring-white/10 animate-fade-in border border-zinc-200/50 dark:border-white/[0.08]">
      <div className="rounded bg-zinc-900 px-2 py-1 text-[10px] font-semibold text-white w-max select-none">
        {label}
      </div>

      <div className="flex flex-col gap-1.5 mt-1">
        {modelEntries.map((entry) => (
          <div key={entry.key} className="flex w-full items-center justify-between gap-3 leading-none">
            <div className="flex items-center gap-2 min-w-0">
              <div 
                className="h-2.5 w-1 shrink-0 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="truncate text-zinc-500 dark:text-zinc-400 font-medium">
                {entry.name}
              </span>
            </div>
            <span className="shrink-0 font-mono font-semibold text-zinc-900 dark:text-white tabular-nums">
              {formatTokens(entry.value)}
            </span>
          </div>
        ))}
      </div>

      <div className="h-px bg-zinc-100 dark:bg-white/[0.06] my-1" />

      <div className="flex items-center justify-between gap-3 font-semibold text-zinc-900 dark:text-white leading-none">
        <span>Total</span>
        <span className="font-mono">{formatTokens(total)}</span>
      </div>
    </div>
  );
};

// Skeleton loading layout for the leaderboard page
const LeaderboardSkeleton = () => {
  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      {/* 2. Chart Card Skeleton */}
      <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <Skeleton className="size-5 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-[320px] w-full mt-2" />
      </div>

      {/* 3. Standings Card Skeleton */}
      <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] p-6 flex flex-col gap-5">
        <div className="border-b border-zinc-150 dark:border-white/[0.06] pb-4">
          <div className="flex items-center gap-2">
            <Skeleton className="size-6 rounded" />
            <Skeleton className="h-5 w-28" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-3">
          {/* Left list skeleton */}
          <div className="flex flex-col gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-3.5 w-full">
                  <Skeleton className="h-5 w-4 rounded" />
                  <Skeleton className="size-9 rounded-full" />
                  <div className="flex flex-col gap-1.5 w-1/3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
          
          {/* Right list skeleton */}
          <div className="flex flex-col gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-3.5 w-full">
                  <Skeleton className="h-5 w-4 rounded" />
                  <Skeleton className="size-9 rounded-full" />
                  <div className="flex flex-col gap-1.5 w-1/3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function LeaderboardPage() {
  const aggregates = useQuery(api.agentUsage.getLifetimeModelUsage);
  const monthlyAggregates = useQuery(api.agentUsage.getMonthlyUsageAggregates);
  const supportedModels = useQuery(api.llm.modelPricing.listEnabled);

  // Calculate totals
  const totalTokens = aggregates ? aggregates.reduce((sum, item) => sum + item.totalTokens, 0) : 0;

  const [showAll, setShowAll] = useState(false);

  // Split list into left and right columns
  const displayList = aggregates ? (showAll ? aggregates : aggregates.slice(0, 10)) : [];
  const firstHalf = displayList.slice(0, Math.ceil(displayList.length / 2));
  const secondHalf = displayList.slice(Math.ceil(displayList.length / 2));

  // Extract topModels keys and data list
  const chartData = monthlyAggregates?.data || [];
  const topModels = monthlyAggregates?.topModels || [];
  const modelColorMap = buildModelColorMap(topModels);

  // Prepare chart config dynamically based on topModels
  const chartConfig = {
    others: {
      label: "Others",
      color: "#71717a",
    },
    ...Object.fromEntries(
      topModels.map((model) => [
        model,
        {
          label: getCleanModelName(model, supportedModels),
          color: modelColorMap.get(model) ?? '#71717a',
        },
      ])
    ),
  } satisfies ChartConfig;

  const renderRankingRow = (item: LifetimeModelUsageRow, rank: number) => {
    const cleanName = getCleanModelName(item.model, supportedModels);
    const parts = item.model.split('/');
    const provider = parts.length > 1 ? parts[0] : 'openrouter';

    return (
      <div 
        key={item.model} 
        className="flex items-center justify-between py-4 border-b border-zinc-100 dark:border-white/[0.04] last:border-0 hover:bg-zinc-50/50 dark:hover:bg-white/[0.01] px-3 rounded-lg transition-all duration-200"
      >
        {/* Left column: Rank, Logo, Name & Provider */}
        <div className="flex items-center gap-3.5 min-w-0">
          <span className="text-base font-semibold text-zinc-400 dark:text-zinc-500 w-6 text-left tabular-nums shrink-0">
            {rank}.
          </span>
          <div className="size-9 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-white/[0.08] flex items-center justify-center shrink-0">
            <ModelLogo model={item.model} />
          </div>
          <div className="min-w-0 flex flex-col leading-tight">
            <span className="font-semibold text-[14px] text-zinc-900 dark:text-white truncate">
              {cleanName}
            </span>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              by <span className="font-medium text-zinc-600 dark:text-zinc-300">{provider}</span>
            </span>
          </div>
        </div>

        {/* Right column: Value */}
        <div className="flex flex-col items-end shrink-0">
          <span className="text-sm font-light text-zinc-500 dark:text-zinc-400">
            {formatTokens(item.totalTokens)} tokens
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-[100svh] bg-zinc-50 dark:bg-[#060606] font-sans text-zinc-900 dark:text-zinc-100 antialiased selection:bg-zinc-200 dark:selection:bg-zinc-800 selection:text-zinc-900 dark:selection:text-zinc-50 flex flex-col justify-between">
      <SiteHeader />
 
      {/* ─── LEADERBOARD CONTENT ─── */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-5 pt-20 pb-12 sm:px-6 sm:pt-24 sm:pb-16">
        <div className="flex flex-col gap-6">
 
          {/* Header Description */}
          <div className="animate-fade-in text-center flex flex-col items-center justify-center gap-2 py-32">
            <h1 className="m-0 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-white sm:text-4xl">
              Model Leaderboard
            </h1>
            <div className="flex items-center justify-center gap-1.5 text-sm sm:text-base font-medium text-zinc-500 dark:text-zinc-400 mt-1 min-h-[28px]">
              {aggregates === undefined || monthlyAggregates === undefined ? (
                <Skeleton className="h-5 w-48 rounded animate-pulse" />
              ) : (
                <>
                  <span>Total Token Spend:</span>
                  <Highlighter 
                    action="underline" 
                    color="#6366f1" 
                    strokeWidth={2} 
                    animationDuration={1200}
                    padding={2}
                  >
                    <span className="text-base sm:text-lg font-bold text-zinc-950 dark:text-white tabular-nums">
                      <NumberTicker value={totalTokens} />
                    </span>
                  </Highlighter>
                  <span>tokens</span>
                </>
              )}
            </div>
          </div>
 
          {aggregates === undefined || monthlyAggregates === undefined ? (
            <LeaderboardSkeleton />
          ) : (
            <>

              {/* Token Distribution Bar Chart */}
              <Card className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] shadow-none overflow-hidden animate-fade-in py-0">
                <CardHeader className="border-b border-zinc-200 dark:border-white/[0.06] bg-zinc-50/50 dark:bg-white/[0.01] px-5 py-4! flex flex-row items-center gap-2.5">
                  <Astroid className="size-5 text-zinc-950 dark:text-white shrink-0" />
                  <CardTitle className="text-base font-semibold leading-none">Top Models</CardTitle>
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
                            const parts = value.split(" ");
                            if (parts.length === 2) {
                              return `${parts[0].slice(0, 3)} '${parts[1].slice(-2)}`;
                            }
                            return value;
                          }}
                        />
                        <YAxis
                          stroke="var(--color-foreground-muted)"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          tickFormatter={(value) => formatTokens(value as number, false)}
                        />
                        <ChartTooltip cursor={false} content={<CustomTooltip topModels={topModels} supportedModels={supportedModels} modelColorMap={modelColorMap} />} />
                        {topModels.map((model) => (
                          <Bar 
                            key={model}
                            name={getCleanModelName(model, supportedModels)} 
                            dataKey={model} 
                            stackId="a" 
                            fill={modelColorMap.get(model) ?? '#71717a'} 
                            barSize={24}
                          />
                        ))}
                        <Bar 
                          name="Others" 
                          dataKey="others" 
                          stackId="a" 
                          fill="#71717a" 
                          radius={[4, 4, 0, 0]} 
                          barSize={24}
                        />
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

              {/* ─── CUSTOM TWO-COLUMN LLM LEADERBOARD STANDINGS ─── */}
              <Card className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] shadow-none p-5 sm:p-6 animate-fade-in flex flex-col gap-4">
                
                {/* Standings Header */}
                <div className="border-b border-zinc-150 dark:border-white/[0.06] pb-4">
                  <div className="flex items-center gap-2">
                    <Trophy className="size-5.5 text-zinc-500 fill-zinc-500/10" />
                    <span className="text-lg font-semibold text-zinc-900 dark:text-white leading-none">Ranking</span>
                  </div>
                </div>

                {/* Two-Column Layout */}
                {aggregates.length === 0 ? (
                  <div className="flex p-8 items-center justify-center text-sm text-muted-foreground">
                    No usage recorded yet.
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-1">
                      {/* Left Column */}
                      <div className="flex flex-col divide-y divide-zinc-100 dark:divide-white/[0.04]">
                        {firstHalf.map((item, index) => renderRankingRow(item, index + 1))}
                      </div>

                      {/* Right Column */}
                      <div className="flex flex-col divide-y divide-zinc-100 dark:divide-white/[0.04]">
                        {secondHalf.map((item, index) => renderRankingRow(item, firstHalf.length + index + 1))}
                      </div>
                    </div>

                    {/* Toggle Show More / Show Less */}
                    {aggregates.length > 10 && (
                      <div className="flex justify-center pt-2">
                        <button
                          type="button"
                          onClick={() => setShowAll(!showAll)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors py-1.5 px-3.5 rounded-md hover:bg-zinc-100 dark:hover:bg-white/[0.04] border border-zinc-200/50 dark:border-white/[0.06] cursor-pointer"
                        >
                          {showAll ? "Show less" : "Show more"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </Card>

              {/* ─── SUPPORTED MODELS ACCORDION ─── */}
              <Accordion type="single" collapsible className="w-full animate-fade-in">
                <AccordionItem value="supported-models" className="border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden bg-white dark:bg-white/[0.02]">
                  <AccordionTrigger className="hover:no-underline px-5 py-4 flex items-center justify-between text-sm sm:text-base font-semibold text-zinc-900 dark:text-white">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-0.5 text-sm font-bold font-mono rounded-full bg-zinc-100 dark:bg-white/[0.08] text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-white/[0.08]">
                        {supportedModels?.length || 0}
                      </span>
                      <span>Supported LLM Models</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-5 pb-5">
                    {supportedModels === undefined ? (
                      <div className="flex py-6 justify-center">
                        <Spinner className="h-5 w-5 text-muted-foreground" />
                      </div>
                    ) : supportedModels.length === 0 ? (
                      <div className="text-sm text-muted-foreground py-2">
                        No supported models configured.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                        {supportedModels.map((m) => (
                          <div 
                            key={m.value}
                            className="flex items-center gap-3 p-3 rounded-lg border border-zinc-100 dark:border-white/[0.04] bg-zinc-50/30 dark:bg-white/[0.005] hover:bg-zinc-50 dark:hover:bg-white/[0.01] transition-colors duration-200"
                          >
                            <div className="size-8 rounded-full bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-white/[0.08] flex items-center justify-center shrink-0">
                              <ModelLogo model={m.value} size={20} />
                            </div>
                            <div className="min-w-0 flex flex-col leading-tight">
                              <span className="font-semibold text-[13px] text-zinc-900 dark:text-white truncate">
                                {m.label}
                              </span>
                              <span className="text-[10px] text-zinc-500 mt-0.5">
                                by <span className="font-medium text-zinc-600 dark:text-zinc-300">{m.chef}</span>
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </>
          )}
 
        </div>
      </main>
 
      <SiteFooter />
    </div>
  );
}
