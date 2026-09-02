import type { ReactNode } from 'react';
import { useQuery } from 'convex/react';
import { useAuth } from '@/partnerAuth/AppAuthProvider';
import { Info, Settings } from 'lucide-react';
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
import {
  buildCreditBalanceRows,
  type CreditBalanceRow,
} from '@/lib/creditBalanceRows';
import {
  additionalCreditProgressClass,
  referralCreditProgressClass,
} from '@/lib/creditProgressStyles';
import { useAdjustPlan } from '@/components/billing/adjustPlanContext';
import { resolvePlanEntryLabel } from '@/components/billing/adjustPlanFlow';

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
        <p className="inline-flex shrink-0 items-baseline gap-1.5 truncate tabular-nums">
          <span className="text-xl font-semibold tracking-tight">
            {remaining.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground">of {total.toLocaleString()} credits</span>
        </p>
      </div>
      <Progress value={progressValue} className={cn('h-2.5', progressClassName)} />
    </div>
  );
}

function PlanUsageBody({
  rows,
  monthlyProgressClassName,
}: {
  rows: CreditBalanceRow[];
  monthlyProgressClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      {rows.map((row) => (
        <CreditUsageRow
          key={row.key}
          title={row.label}
          remaining={row.remaining}
          total={row.granted}
          progressValue={topUpProgressValue(
            row.remaining,
            row.granted,
          )}
          progressClassName={
            row.key === 'plan'
              ? monthlyProgressClassName
              : row.key === 'additional'
                ? additionalCreditProgressClass
                : row.key === 'referral'
                  ? referralCreditProgressClass
                  : undefined
          }
        />
      ))}
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
  const { openAdjustPlan } = useAdjustPlan();
  const { isLoading: isAuthLoading } = useAuth();
  const planAndUsage = useQuery(
    api.plans.getPlanAndUsage,
    isAuthLoading ? 'skip' : {},
  );

  const isLoading = isAuthLoading || planAndUsage === undefined;
  const monthlyCredits = planAndUsage?.monthlyCredits ?? 0;
  const additionalCredits = planAndUsage?.additionalCredits ?? 0;
  const additionalCreditsGranted = planAndUsage?.additionalCreditsGranted ?? 0;
  const referralCredits = planAndUsage?.referralCredits ?? 0;
  const referralCreditsGranted = planAndUsage?.referralCreditsGranted ?? 0;
  const monthlyAllowance = planAndUsage?.monthlyAllowance ?? 0;
  const planPct = planProgressValue(monthlyCredits, monthlyAllowance);
  const planName = planAndUsage?.planConfig.name ?? 'Free';
  const periodEndMs = planAndUsage?.periodEndMs;
  const description = isLoading
    ? 'Loading plan…'
    : periodEndMs == null
      ? 'Credit reset date unavailable'
      : `Resets ${new Date(periodEndMs).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        })}`;
  const rows = buildCreditBalanceRows({
    monthlyRemaining: monthlyCredits,
    monthlyGranted: monthlyAllowance,
    additionalRemaining: additionalCredits,
    additionalGranted: additionalCreditsGranted,
    referralRemaining: referralCredits,
    referralGranted: referralCreditsGranted,
  });

  return (
    <div className="w-full max-w-md">
      <CompactBalanceCard
        title={isLoading ? 'Plan' : `${planName} plan`}
        description={description}
        infoTooltip="Usage will reset every month"
        action={
          !isLoading && planAndUsage?.canManageBilling ? (
            <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={openAdjustPlan}>
              <Settings className="size-3.5" />
              {resolvePlanEntryLabel('usage_card')}
            </Button>
          ) : undefined
        }
      >
        {isLoading ? (
          <BalanceCardSkeleton />
        ) : (
          <PlanUsageBody
            rows={rows}
            monthlyProgressClassName={cn(
              planPct <= 10 && '[&>[data-slot=progress-indicator]]:bg-red-500',
              planPct > 10 && planPct <= 30 && '[&>[data-slot=progress-indicator]]:bg-amber-400',
            )}
          />
        )}
      </CompactBalanceCard>
    </div>
  );
}
