import { useState } from 'react';
import { Coins, Plus } from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

const DEFAULT_CREDITS = 500;

export function CreditMeter() {
  const balance = useQuery(api.credits.getBalance);
  const topUpMutation = useMutation(api.credits.topUp);
  const [isToppingUp, setIsToppingUp] = useState(false);

  const credits = balance?.credits ?? 0;
  const pct = Math.min(100, Math.round((credits / DEFAULT_CREDITS) * 100));

  const barColor =
    pct <= 10
      ? 'bg-red-500'
      : pct <= 30
      ? 'bg-amber-400'
      : 'bg-primary';

  const textColor =
    pct <= 10
      ? 'text-red-500'
      : pct <= 30
      ? 'text-amber-500'
      : 'text-muted-foreground';

  const handleTopUp = async () => {
    try {
      setIsToppingUp(true);
      await topUpMutation();
    } catch (error) {
      console.error('Failed to top up:', error);
    } finally {
      setIsToppingUp(false);
    }
  };

  return (
    <div className="group-data-[collapsible=icon]:hidden px-3 py-2">
      <div className="rounded-lg border border-border/60 bg-sidebar-accent/40 px-3 py-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Coins className="size-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Credits</span>
          </div>
          <span className={`text-xs font-semibold tabular-nums ${textColor}`}>
            {balance === undefined ? '…' : `${credits} / ${DEFAULT_CREDITS}`}
          </span>
        </div>
        <Progress
          value={balance === undefined ? 0 : pct}
          className={`h-1.5 [&>[data-slot=progress-indicator]]:${barColor}`}
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground truncate">
            {balance === undefined
              ? 'Loading…'
              : credits <= 0
              ? 'Out of credits'
              : pct <= 10
              ? 'Almost out of credits'
              : pct <= 30
              ? 'Credits running low'
              : credits > DEFAULT_CREDITS
              ? `${credits} credits active`
              : `${DEFAULT_CREDITS - credits} credits used`}
          </p>
          {balance !== undefined && (
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
