import { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { useAuth } from '@workos-inc/authkit-react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Bot, AlertCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { cn } from '@/lib/utils';
import { CreditUsageChart } from '@/components/CreditUsageChart';

const ALL_AGENTS = 'all';

export function UsageTab() {
  const { organizationId, isLoading: isAuthLoading } = useAuth();
  const billingOrgId = organizationId ?? null;
  const [selectedAgent, setSelectedAgent] = useState<string>(ALL_AGENTS);

  const usage = useQuery(
    api.credits.getUsageDashboard,
    isAuthLoading
      ? 'skip'
      : {
          orgId: billingOrgId,
          agentId:
            selectedAgent === ALL_AGENTS
              ? undefined
              : (selectedAgent as Id<'agents'>),
        },
  );

  const maxAgentUsage = useMemo(() => {
    if (!usage?.agentUsage.length) {
      return 0;
    }
    return Math.max(...usage.agentUsage.map((row) => row.creditsUsed));
  }, [usage?.agentUsage]);

  if (isAuthLoading || usage === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-96 w-full rounded-2xl" />
        <Skeleton className="h-10 w-56 rounded-lg" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  if (!usage) {
    return (
      <Empty className="border bg-muted/20">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <AlertCircle />
          </EmptyMedia>
          <EmptyTitle>Unable to load usage</EmptyTitle>
          <EmptyDescription>
            Your usage data is not available yet. Refresh the page or try again in a moment.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const { credits, totalUsedThisPeriod, agentUsage, periodStartMs, periodEndMs, dailyUsage, chartConfig } =
    usage;

  return (
    <div className="space-y-8">
      <CreditUsageChart
        credits={credits}
        totalUsedThisPeriod={totalUsedThisPeriod}
        periodStartMs={periodStartMs}
        periodEndMs={periodEndMs}
        dailyUsage={dailyUsage}
        chartConfig={chartConfig}
      />

      <div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold tracking-tight">Usage by agent</h3>
            <p className="text-sm text-muted-foreground mt-1">
              See which agents consumed the most credits this billing period.
            </p>
          </div>
          <Select value={selectedAgent} onValueChange={setSelectedAgent}>
            <SelectTrigger size="sm" className="w-full sm:w-[220px]">
              <SelectValue placeholder="Filter by agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_AGENTS}>All agents</SelectItem>
              {usage.agents.map((agent) => (
                <SelectItem key={agent._id} value={agent._id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {agentUsage.length === 0 ? (
          <Empty className="border bg-muted/20 py-10">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Bot />
              </EmptyMedia>
              <EmptyTitle>No usage yet</EmptyTitle>
              <EmptyDescription>
                Credit usage will appear here once your agents start handling conversations.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-[0_4px_24px_-4px_rgba(0,0,0,0.02)]">
            <div className="divide-y divide-border">
              {agentUsage.map((row, index) => {
                const barPct =
                  maxAgentUsage > 0 ? Math.round((row.creditsUsed / maxAgentUsage) * 100) : 0;
                return (
                  <div key={row.agentId ?? 'unassigned'} className="px-6 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-medium text-muted-foreground w-5 shrink-0">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{row.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {row.creditsUsed.toLocaleString()} credits
                          </p>
                        </div>
                      </div>
                      {index === 0 && row.creditsUsed > 0 && selectedAgent === ALL_AGENTS && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground shrink-0">
                          Most used
                        </span>
                      )}
                    </div>
                    <Progress
                      value={barPct}
                      className={cn('mt-3 h-1.5', index === 0 && barPct > 0 && '[&>[data-slot=progress-indicator]]:bg-primary')}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
