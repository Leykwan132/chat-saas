import { Plus } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { useQuery } from 'convex/react';
import { useAuth } from '@workos-inc/authkit-react';
import { api } from '../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

function topUpProgressValue(remaining: number, granted: number) {
  if (granted <= 0) {
    return remaining > 0 ? 100 : 0;
  }
  return Math.min(100, Math.round((remaining / granted) * 100));
}

const TOP_UP_PROGRESS_CLASS = '[&>[data-slot=progress-indicator]]:bg-green-600';

function usePlanTopUpPath() {
  const { agentId } = useParams();
  const base = agentId ? `/dashboard/${agentId}/account` : '/workspace/account';
  return `${base}?section=plan#plan-add-ons`;
}

export function CreditMeter() {
  const navigate = useNavigate();
  const planTopUpPath = usePlanTopUpPath();
  const { organizationId, isLoading: isAuthLoading } = useAuth();
  const billingOrgId = organizationId ?? null;
  const planAndUsage = useQuery(
    api.plans.getPlanAndUsage,
    isAuthLoading ? 'skip' : { orgId: billingOrgId },
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

  const goToTopUp = () => {
    navigate(planTopUpPath);
  };

  return (
    <div className="group-data-[collapsible=icon]:hidden px-3 py-2">
      <div className="rounded-lg border border-border/60 bg-sidebar-accent/40 px-3 py-2.5 space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Credits</span>
            <span
              className={cn(
                'text-xs font-semibold tabular-nums',
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
              'h-1.5',
              !isLoading && monthlyPct <= 10 && '[&>[data-slot=progress-indicator]]:bg-red-500',
              !isLoading && monthlyPct > 10 && monthlyPct <= 30 && '[&>[data-slot=progress-indicator]]:bg-amber-400',
              !isLoading && monthlyPct > 30 && '[&>[data-slot=progress-indicator]]:bg-primary',
            )}
          />
        </div>

        {!isLoading && hasTopUps ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Top ups</span>
              <span className="text-xs font-medium tabular-nums text-muted-foreground">
                {purchasedCredits.toLocaleString()} / {purchasedCreditsGranted.toLocaleString()}
              </span>
            </div>
            <Progress
              value={topUpPct}
              className={cn('h-1.5', TOP_UP_PROGRESS_CLASS)}
            />
          </div>
        ) : null}

        {!isLoading && planAndUsage ? (
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="w-full text-[10px] h-6 gap-0.5"
            onClick={goToTopUp}
          >
            <Plus className="size-2.5" />
            <span>Top up</span>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
