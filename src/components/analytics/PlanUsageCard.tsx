import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery } from 'convex/react';
import { useAuth } from '@workos-inc/authkit-react';
import { Coins, Info } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

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
      <CardContent className="px-6 py-5">
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
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </div>
          {action}
        </div>
        <div className="mt-5">{children}</div>
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
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <p className="shrink-0 truncate text-sm tabular-nums">
          <span className="text-2xl font-semibold tracking-tight">
            {remaining.toLocaleString()}
          </span>
          <span className="text-muted-foreground"> of {total.toLocaleString()} credits</span>
        </p>
      </div>
      <Progress value={progressValue} className={cn('h-2.5', progressClassName)} />
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
    <div className="space-y-6">
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-7 w-32" />
      </div>
      <Skeleton className="h-2.5 w-full rounded-full" />
    </div>
  );
}

export function PlanUsageCard() {
  const navigate = useNavigate();
  const { agentId } = useParams();
  const { isLoading: isAuthLoading } = useAuth();
  const planAndUsage = useQuery(
    api.plans.getPlanAndUsage,
    isAuthLoading ? 'skip' : {},
  );

  const isLoading = isAuthLoading || planAndUsage === undefined;
  const monthlyCredits = planAndUsage?.monthlyCredits ?? 0;
  const purchasedCredits = planAndUsage?.purchasedCredits ?? 0;
  const purchasedCreditsGranted = planAndUsage?.purchasedCreditsGranted ?? 0;
  const monthlyAllowance = planAndUsage?.monthlyAllowance ?? 0;
  const planPct = planProgressValue(monthlyCredits, monthlyAllowance);
  const topUpPct = topUpProgressValue(purchasedCredits, purchasedCreditsGranted);
  const planName = planAndUsage?.planConfig.name ?? 'Free';

  const goToPlan = () => {
    const base = agentId ? `/dashboard/${agentId}/settings` : '/workspace/settings';
    navigate(`${base}?section=plan#plan-add-ons`);
  };

  return (
    <div className="w-full max-w-md">
      <CompactBalanceCard
        title={isLoading ? 'Plan' : `${planName} plan`}
        description={
          isLoading ? 'Loading plan…' : `You are on ${planName} plan`
        }
        infoTooltip="Usage will reset every month"
        action={
          !isLoading && planAndUsage?.canManageBilling ? (
            <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={goToPlan}>
              <Coins className="size-3.5" />
              More credits
            </Button>
          ) : undefined
        }
      >
        {isLoading ? (
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
  );
}
