import { useState } from 'react';
import { Coins, Plus } from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import { useAuth } from '@workos-inc/authkit-react';
import { api } from '../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export function CreditMeter() {
  const { organizationId, isLoading: isAuthLoading } = useAuth();
  const billingOrgId = organizationId ?? null;
  const planAndUsage = useQuery(
    api.plans.getPlanAndUsage,
    isAuthLoading ? 'skip' : { orgId: billingOrgId },
  );
  const topUpMutation = useMutation(api.credits.topUp);
  const [isToppingUp, setIsToppingUp] = useState(false);

  const isLoading = isAuthLoading || planAndUsage === undefined;
  const credits = planAndUsage?.credits ?? 0;
  const monthlyAllowance = planAndUsage?.planConfig.monthlyCredits ?? 0;
  const pct =
    monthlyAllowance > 0
      ? Math.min(100, Math.round((credits / monthlyAllowance) * 100))
      : 0;

  const handleTopUp = async () => {
    try {
      setIsToppingUp(true);
      await topUpMutation({ orgId: billingOrgId });
    } catch (error) {
      console.error('Failed to top up:', error);
    } finally {
      setIsToppingUp(false);
    }
  };

  const usedThisMonth = Math.max(0, monthlyAllowance - credits);

  const statusText = isLoading
    ? 'Loading…'
    : !planAndUsage
    ? 'Unavailable'
    : credits <= 0
    ? 'Out of credits'
    : pct <= 10
    ? 'Almost out of credits'
    : pct <= 30
    ? 'Credits running low'
    : credits > monthlyAllowance
    ? `${credits.toLocaleString()} credits active`
    : usedThisMonth === 0
    ? '100% available'
    : `${usedThisMonth.toLocaleString()} used this month`;

  return (
    <div className="group-data-[collapsible=icon]:hidden px-3 py-2">
      <div className="rounded-lg border border-border/60 bg-sidebar-accent/40 px-3 py-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Coins className="size-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Credits</span>
          </div>
          <span
            className={cn(
              'text-xs font-semibold tabular-nums',
              !isLoading && pct <= 10 && 'text-red-500',
              !isLoading && pct > 10 && pct <= 30 && 'text-amber-500',
              (isLoading || pct > 30) && 'text-muted-foreground',
            )}
          >
            {isLoading
              ? '…'
              : `${credits.toLocaleString()} / ${monthlyAllowance.toLocaleString()}`}
          </span>
        </div>
        <Progress
          value={isLoading ? 0 : pct}
          className={cn(
            'h-1.5',
            !isLoading && pct <= 10 && '[&>[data-slot=progress-indicator]]:bg-red-500',
            !isLoading && pct > 10 && pct <= 30 && '[&>[data-slot=progress-indicator]]:bg-amber-400',
            !isLoading && pct > 30 && '[&>[data-slot=progress-indicator]]:bg-primary',
          )}
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground truncate">{statusText}</p>
          {!isLoading && planAndUsage && (
            <Button
              variant="outline"
              size="xs"
              className="text-[10px] h-5 px-1.5 shrink-0 gap-0.5"
              onClick={handleTopUp}
              disabled={isToppingUp}
            >
              {isToppingUp ? (
                '…'
              ) : (
                <>
                  <Plus className="size-2.5" />
                  <span>Top up</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
