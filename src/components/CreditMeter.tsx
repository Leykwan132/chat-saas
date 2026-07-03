import type { KeyboardEvent, MouseEvent } from 'react';
import { useState } from 'react';
import { CircleArrowUp, Plus } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { useQuery } from 'convex/react';
import { useAuth } from '@workos-inc/authkit-react';
import { api } from '../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AdjustPlanDialog } from '@/components/AdjustPlanDialog';
import { cn } from '@/lib/utils';

function topUpProgressValue(remaining: number, granted: number) {
  if (granted <= 0) {
    return remaining > 0 ? 100 : 0;
  }
  return Math.min(100, Math.round((remaining / granted) * 100));
}

const TOP_UP_PROGRESS_CLASS = '[&>[data-slot=progress-indicator]]:bg-green-600';

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
  const location = useLocation();
  const [adjustPlanOpen, setAdjustPlanOpen] = useState(false);
  const planReturnPath = `${location.pathname}${location.search}`;
  const analyticsUsagePath = useAnalyticsUsagePath();
  const planTopUpPath = useSettingsPath('plan', '#plan-add-ons');
  const { isLoading: isAuthLoading } = useAuth();
  const planAndUsage = useQuery(
    api.plans.getPlanAndUsage,
    isAuthLoading ? 'skip' : {},
  );

  const isLoading = isAuthLoading || planAndUsage === undefined;
  const monthlyCredits = planAndUsage?.monthlyCredits ?? 0;
  const purchasedCredits = planAndUsage?.purchasedCredits ?? 0;
  const purchasedCreditsGranted = planAndUsage?.purchasedCreditsGranted ?? 0;
  const monthlyAllowance = planAndUsage?.planConfig.monthlyCredits ?? 0;
  const monthlyPct =
    monthlyAllowance > 0
      ? Math.min(100, Math.round((monthlyCredits / monthlyAllowance) * 100))
      : 0;
  const topUpPct = topUpProgressValue(purchasedCredits, purchasedCreditsGranted);
  const hasTopUps = purchasedCredits > 0;
  const showUpgradePlan =
    !isLoading &&
    planAndUsage?.canManageBilling &&
    planAndUsage.plan !== 'business';

  const goToUpgradePlan = () => {
    setAdjustPlanOpen(true);
  };

  const goToTopUp = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    navigate(planTopUpPath);
  };

  const goToUsage = () => {
    navigate(analyticsUsagePath);
  };

  return (
    <div className="group-data-[collapsible=icon]:hidden px-[0.675rem] py-[0.45rem] space-y-[0.5625rem]">
      {showUpgradePlan ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={goToUpgradePlan}
            className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-transparent px-2 py-0.5 text-[10px] font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/40 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <CircleArrowUp className="size-2.5" />
            Upgrade plan
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
        className="rounded-lg border border-border/60 bg-sidebar-accent/40 px-[0.675rem] py-[0.5625rem] space-y-[0.675rem] cursor-pointer transition-colors hover:bg-sidebar-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="space-y-[0.45rem]">
          <div className="flex items-center justify-between">
            {!isLoading && planAndUsage?.plan ? (
              <Badge
                variant="secondary"
                className="h-[0.9rem] rounded px-[0.225rem] text-[8.1px] font-semibold uppercase bg-primary/10 text-primary border-none select-none tracking-wider"
              >
                {planAndUsage.plan}
              </Badge>
            ) : null}
            <span
              className={cn(
                'text-[0.675rem] font-semibold tabular-nums',
                (!isLoading && !planAndUsage?.plan) || isLoading ? 'ml-auto' : null,
                !isLoading && monthlyPct <= 10 && 'text-red-500',
                !isLoading && monthlyPct > 10 && monthlyPct <= 30 && 'text-amber-500',
                (isLoading || monthlyPct > 30) && 'text-muted-foreground',
              )}
            >
              {isLoading
                ? '…'
                : `${monthlyCredits.toLocaleString()} / ${monthlyAllowance.toLocaleString()}`}
            </span>
          </div>
          <Progress
            value={isLoading ? 0 : monthlyPct}
            className={cn(
              'h-[0.3375rem]',
              !isLoading && monthlyPct <= 10 && '[&>[data-slot=progress-indicator]]:bg-red-500',
              !isLoading && monthlyPct > 10 && monthlyPct <= 30 && '[&>[data-slot=progress-indicator]]:bg-amber-400',
              !isLoading && monthlyPct > 30 && '[&>[data-slot=progress-indicator]]:bg-primary',
            )}
          />
        </div>

        {!isLoading && hasTopUps ? (
          <div className="space-y-[0.45rem]">
            <div className="flex items-center justify-between">
              <span className="text-[0.675rem] font-medium text-muted-foreground">Add-on</span>
              <span className="text-[0.675rem] font-medium tabular-nums text-muted-foreground">
                {purchasedCredits.toLocaleString()} / {purchasedCreditsGranted.toLocaleString()}
              </span>
            </div>
            <Progress
              value={topUpPct}
              className={cn('h-[0.3375rem]', TOP_UP_PROGRESS_CLASS)}
            />
          </div>
        ) : null}

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

      <AdjustPlanDialog
        open={adjustPlanOpen}
        onOpenChange={setAdjustPlanOpen}
        planReturnPath={planReturnPath}
      />
    </div>
  );
}
