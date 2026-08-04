import type { KeyboardEvent, MouseEvent } from 'react';
import { CircleArrowUp, Plus } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { useQuery } from 'convex/react';
import { useAuth } from '@workos-inc/authkit-react';
import { api } from '../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAdjustPlan } from '@/components/billing/adjustPlanContext';
import { resolvePlanEntryLabel } from '@/components/billing/adjustPlanFlow';
import { cn } from '@/lib/utils';
import { buildCreditBalanceRows } from '@/lib/creditBalanceRows';
import {
  additionalCreditProgressClass,
  referralCreditProgressClass,
} from '@/lib/creditProgressStyles';

function topUpProgressValue(remaining: number, granted: number) {
  if (granted <= 0) {
    return remaining > 0 ? 100 : 0;
  }
  return Math.min(100, Math.round((remaining / granted) * 100));
}

const METER_PROGRESS_CLASS = 'h-[4px] shrink-0';

function useSettingsPath(section: 'plan', hash?: string) {
  const { agentId } = useParams();
  const base = agentId ? `/dashboard/${agentId}/settings` : '/workspace/settings';
  const url = `${base}?section=${section}`;
  return hash ? `${url}${hash}` : url;
}

function useAnalyticsUsagePath() {
  const { agentId } = useParams();
  if (agentId) {
    return `/dashboard/${agentId}/analytics/usage`;
  }
  return '/workspace/settings?section=plan';
}

export function CreditMeter() {
  const navigate = useNavigate();
  const { openAdjustPlan } = useAdjustPlan();
  const analyticsUsagePath = useAnalyticsUsagePath();
  const planTopUpPath = useSettingsPath('plan', '#plan-add-ons');
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
  const monthlyAllowance = planAndUsage?.planConfig.monthlyCredits ?? 0;
  const monthlyPct =
    monthlyAllowance > 0
      ? Math.min(100, Math.round((monthlyCredits / monthlyAllowance) * 100))
      : 0;
  const creditRows = buildCreditBalanceRows({
    monthlyRemaining: monthlyCredits,
    monthlyGranted: monthlyAllowance,
    additionalRemaining: additionalCredits,
    additionalGranted: additionalCreditsGranted,
    referralRemaining: referralCredits,
    referralGranted: referralCreditsGranted,
  });
  const showManagePlan =
    !isLoading &&
    planAndUsage?.canManageBilling;

  const goToTopUp = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    navigate(planTopUpPath);
  };

  const goToUsage = () => {
    navigate(analyticsUsagePath);
  };

  return (
    <div className="group-data-[collapsible=icon]:hidden px-[0.675rem] py-[0.45rem] space-y-[0.5625rem]">
      {showManagePlan ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={openAdjustPlan}
            className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-transparent px-2 py-0.5 text-[10px] font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/40 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {resolvePlanEntryLabel('credit_meter')}
            <CircleArrowUp className="size-2.5" />
          </button>
        </div>
      ) : null}
      <div
        role="button"
        tabIndex={0}
        onClick={goToUsage}
        onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            goToUsage();
          }
        }}
        className="flex cursor-pointer flex-col gap-[0.675rem] rounded-lg border border-border/60 bg-sidebar-accent/40 px-[0.675rem] py-[0.5625rem] transition-colors hover:bg-sidebar-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {(isLoading ? creditRows.slice(0, 1) : creditRows).map((row) => {
          const progressValue =
            row.key === 'plan'
              ? monthlyPct
              : topUpProgressValue(row.remaining, row.granted);
          return (
            <div key={row.key} className="flex flex-col gap-[0.45rem]">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[0.675rem] font-medium text-muted-foreground">
                  {row.label}
                  {row.key === 'plan' && !isLoading && planAndUsage?.plan ? (
                    <Badge
                      variant="secondary"
                      className="h-[0.675rem] rounded border-none bg-primary/10 px-[0.225rem] text-[8.1px] font-semibold uppercase leading-none tracking-wider text-primary select-none"
                    >
                      {planAndUsage.plan}
                    </Badge>
                  ) : null}
                </span>
                <span
                  className={cn(
                    'text-[0.675rem] font-semibold tabular-nums',
                    row.key === 'plan' &&
                      !isLoading &&
                      monthlyPct <= 10 &&
                      'text-destructive',
                    row.key === 'plan' &&
                      !isLoading &&
                      monthlyPct > 10 &&
                      monthlyPct <= 30 &&
                      'text-muted-foreground',
                    (row.key !== 'plan' || isLoading || monthlyPct > 30) &&
                      'text-muted-foreground',
                  )}
                >
                  {isLoading
                    ? '…'
                    : `${row.remaining.toLocaleString()} / ${row.granted.toLocaleString()}`}
                </span>
              </div>
              <Progress
                value={isLoading ? 0 : progressValue}
                className={cn(
                  METER_PROGRESS_CLASS,
                  row.key === 'plan' &&
                    !isLoading &&
                    monthlyPct <= 10 &&
                    '[&>[data-slot=progress-indicator]]:bg-destructive',
                  row.key === 'additional' && additionalCreditProgressClass,
                  row.key === 'referral' && referralCreditProgressClass,
                )}
              />
            </div>
          );
        })}

        {!isLoading && planAndUsage?.canManageBilling ? (
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="h-[1.35rem] w-full text-[10px] leading-none"
            onClick={goToTopUp}
          >
            <Plus data-icon="inline-start" />
            Extra credits
          </Button>
        ) : null}
      </div>
    </div>
  );
}
