import { useQuery } from 'convex/react';
import { Link } from 'react-router';
import { Coins } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import { NumberTicker } from '@/components/ui/number-ticker';
import { cn } from '@/lib/utils';

export function TokenSpendTicker({ className }: { className?: string }) {
  const aggregates = useQuery(api.agentUsage.getLifetimeModelUsage);

  // If loading or error, default to 0. It will animate up when the query finishes.
  const totalTokens = aggregates
    ? aggregates.reduce((sum, item) => sum + item.totalTokens, 0)
    : 0;

  return (
    <Link
      to="/leaderboard"
      className={cn(
        "group flex items-center gap-2 rounded-full border border-border/60 bg-muted/20 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm transition-all duration-300 hover:bg-muted/50 hover:border-muted-foreground/30 dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:bg-white/[0.05]",
        className
      )}
      title="View Model Usage Leaderboard"
    >
      <div className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300">
        <Coins className="size-3" />
      </div>
      <div className="flex items-center gap-1">
        <span>Token Spend:</span>
        <span className="font-semibold text-foreground tracking-wide tabular-nums">
          <NumberTicker value={totalTokens} />
        </span>
      </div>
    </Link>
  );
}
