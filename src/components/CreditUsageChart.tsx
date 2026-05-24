import { useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';
import { useQuery } from 'convex/react';
import { useAuth } from '@workos-inc/authkit-react';
import { Coins, Info } from 'lucide-react';
import { api } from '../../convex/_generated/api';
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
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  buildFakeUsageChartData,
  FAKE_MONTHLY_ALLOWANCE,
  FAKE_MONTHLY_CREDITS_REMAINING,
  FAKE_PURCHASED_CREDITS,
  FAKE_PURCHASED_CREDITS_GRANTED,
  getFakeBillingPeriodLabel,
  getUsageMetricDescription,
  USAGE_METRIC_OPTIONS,
  USAGE_TIME_RANGE_OPTIONS,
  type UsageGroupBy,
  type UsageMetric,
  type UsageTimeRange,
} from '@/lib/fakeUsageData';

function planProgressValue(remaining: number, allowance: number) {
  if (allowance <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((remaining / allowance) * 100));
}

function topUpProgressValue(remaining: number, granted: number) {
  if (granted <= 0) {
    return remaining > 0 ? 100 : 0;
  }
  return Math.min(100, Math.round((remaining / granted) * 100));
}

const TOP_UP_PROGRESS_CLASS = '[&>[data-slot=progress-indicator]]:bg-green-600';

const balanceCardClassName =
  'overflow-hidden rounded-xl py-0 shadow-none ring-1 ring-border/70';

function CompactBalanceCard({
  title,
  description,
  infoTooltip,
  action,
  children,
}: {
  title: string;
  description: string;
  infoTooltip?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className={balanceCardClassName}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <CardTitle className="text-lg font-semibold">{title}</CardTitle>
              {infoTooltip ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={infoTooltip}
                    >
                      <Info className="size-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent sideOffset={6}>{infoTooltip}</TooltipContent>
                </Tooltip>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          </div>
          {action}
        </div>
        <div className="mt-4">{children}</div>
      </CardContent>
    </Card>
  );
}

function CreditUsageRow({
  title,
  remaining,
  total,
  progressValue,
  progressClassName,
}: {
  title: string;
  remaining: number;
  total: number;
  progressValue: number;
  progressClassName?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <p className="shrink-0 truncate text-sm tabular-nums">
          <span className="text-xl font-semibold tracking-tight">
            {remaining.toLocaleString()}
          </span>
          <span className="text-muted-foreground"> of {total.toLocaleString()} credits</span>
        </p>
      </div>
      <Progress value={progressValue} className={cn('h-1.5', progressClassName)} />
    </div>
  );
}

function PlanUsageBody({
  monthlyCredits,
  monthlyAllowance,
  purchasedCredits,
  purchasedCreditsGranted,
  monthlyProgressValue,
  monthlyProgressClassName,
  topUpProgressPct,
}: {
  monthlyCredits: number;
  monthlyAllowance: number;
  purchasedCredits: number;
  purchasedCreditsGranted: number;
  monthlyProgressValue: number;
  monthlyProgressClassName?: string;
  topUpProgressPct: number;
}) {
  return (
    <div className="space-y-4">
      <CreditUsageRow
        title="Credits"
        remaining={monthlyCredits}
        total={monthlyAllowance}
        progressValue={monthlyProgressValue}
        progressClassName={monthlyProgressClassName}
      />
      {purchasedCredits > 0 ? (
        <CreditUsageRow
          title="Top-ups"
          remaining={purchasedCredits}
          total={purchasedCreditsGranted}
          progressValue={topUpProgressPct}
          progressClassName={TOP_UP_PROGRESS_CLASS}
        />
      ) : null}
    </div>
  );
}

function BalanceCardSkeleton() {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-6 w-32" />
      </div>
      <Skeleton className="h-1.5 w-full rounded-full" />
    </div>
  );
}

export function CreditUsageChart() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { organizationId, isLoading: isAuthLoading } = useAuth();
  const billingOrgId = organizationId ?? null;
  const planAndUsage = useQuery(
    api.plans.getPlanAndUsage,
    isAuthLoading ? 'skip' : { orgId: billingOrgId },
  );

  const [groupBy, setGroupBy] = useState<UsageGroupBy>('model');
  const [timeRange, setTimeRange] = useState<UsageTimeRange>('30d');
  const [metric, setMetric] = useState<UsageMetric>('cumulative');

  const { series, rows } = useMemo(
    () => buildFakeUsageChartData(groupBy, timeRange, metric),
    [groupBy, timeRange, metric],
  );

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    for (const item of series) {
      config[item.key] = {
        label: item.label,
        theme: item.theme,
      };
    }
    return config;
  }, [series]);

  const isBalanceLoading = isAuthLoading || planAndUsage === undefined;
  const monthlyCredits = planAndUsage?.monthlyCredits ?? FAKE_MONTHLY_CREDITS_REMAINING;
  const purchasedCredits = planAndUsage?.purchasedCredits ?? FAKE_PURCHASED_CREDITS;
  const purchasedCreditsGranted =
    planAndUsage?.purchasedCreditsGranted ?? FAKE_PURCHASED_CREDITS_GRANTED;
  const monthlyAllowance = planAndUsage?.monthlyAllowance ?? FAKE_MONTHLY_ALLOWANCE;
  const planPct = planProgressValue(monthlyCredits, monthlyAllowance);
  const topUpPct = topUpProgressValue(purchasedCredits, purchasedCreditsGranted);
  const planName = planAndUsage?.planConfig.name ?? 'Free';

  const goToPlan = () => {
    navigate(`${pathname}?section=plan#plan-add-ons`);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <CompactBalanceCard
          title="Plan usage"
          description={
            isBalanceLoading ? 'Loading plan…' : `You are on ${planName} plan`
          }
          infoTooltip="Usage will reset every month"
          action={
            !isBalanceLoading ? (
              <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={goToPlan}>
                <Coins className="size-3.5" />
                More credits
              </Button>
            ) : undefined
          }
        >
          {isBalanceLoading ? (
            <BalanceCardSkeleton />
          ) : (
            <PlanUsageBody
              monthlyCredits={monthlyCredits}
              monthlyAllowance={monthlyAllowance}
              purchasedCredits={purchasedCredits}
              purchasedCreditsGranted={purchasedCreditsGranted}
              monthlyProgressValue={planPct}
              monthlyProgressClassName={cn(
                planPct <= 10 && '[&>[data-slot=progress-indicator]]:bg-red-500',
                planPct > 10 && planPct <= 30 && '[&>[data-slot=progress-indicator]]:bg-amber-400',
              )}
              topUpProgressPct={topUpPct}
            />
          )}
        </CompactBalanceCard>
      </div>

      <Card className="overflow-hidden rounded-2xl py-0 shadow-none ring-1 ring-border/70">
        <CardHeader className="flex flex-col gap-4 border-b px-6 pt-6 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold">Your usage</CardTitle>
            <CardDescription>
              {getUsageMetricDescription(metric)} across this billing period (
              {getFakeBillingPeriodLabel()})
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Select value={metric} onValueChange={(value) => setMetric(value as UsageMetric)}>
              <SelectTrigger size="sm" className="w-[140px]">
                <SelectValue placeholder="Metric" />
              </SelectTrigger>
              <SelectContent>
                {USAGE_METRIC_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={timeRange} onValueChange={(value) => setTimeRange(value as UsageTimeRange)}>
              <SelectTrigger size="sm" className="w-[150px]">
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                {USAGE_TIME_RANGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={groupBy} onValueChange={(value) => setGroupBy(value as UsageGroupBy)}>
              <SelectTrigger size="sm" className="w-[140px]">
                <SelectValue placeholder="Group by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agent">Agent</SelectItem>
                <SelectItem value="model">Model</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="px-6 py-6 sm:px-8 sm:py-8">
          <ChartContainer
            key={`${groupBy}-${timeRange}-${metric}`}
            config={chartConfig}
            className="aspect-auto h-[380px] w-full"
          >
            <AreaChart
              accessibilityLayer
              data={rows}
              margin={{ left: 8, right: 16, top: 12, bottom: 8 }}
            >
              <defs>
                {series.map((item) => (
                  <linearGradient
                    key={item.key}
                    id={`fill-${item.key}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={`var(--color-${item.key})`}
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor={`var(--color-${item.key})`}
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={28}
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
                width={52}
                tickFormatter={(value) => value.toLocaleString()}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    className="w-[220px]"
                    indicator="dot"
                    labelFormatter={(value) => {
                      const date = new Date(`${value}T00:00:00.000Z`);
                      return date.toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      });
                    }}
                  />
                }
              />
              {series.map((item) => (
                <Area
                  key={item.key}
                  dataKey={item.key}
                  type="natural"
                  stackId="usage"
                  stroke={`var(--color-${item.key})`}
                  fill={`url(#fill-${item.key})`}
                  strokeWidth={2}
                />
              ))}
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
