import { useState } from 'react';
import { useQuery } from 'convex/react';
import { useAuth } from '@workos-inc/authkit-react';
import { api } from '../../convex/_generated/api';
import { PlanUsageCard } from '@/components/analytics/PlanUsageCard';
import { CreditUsagePanel, type CreditTimeRange } from '@/components/analytics/CreditUsagePanel';
import { Skeleton } from '@/components/ui/skeleton';

export default function WorkspaceUsagePage() {
  const { isLoading: isAuthLoading } = useAuth();
  const [timeRange, setTimeRange] = useState<CreditTimeRange>('period');

  const usageInfo = useQuery(
    api.creditUsageAnalytics.getWorkspaceAndAccountUsage,
    isAuthLoading ? 'skip' : {},
  );

  const isLoading = isAuthLoading || usageInfo === undefined;

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="space-y-1.5">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-[180px] w-full max-w-md rounded-xl" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  if (!usageInfo) {
    return (
      <div className="text-sm text-muted-foreground py-6">
        Unable to load workspace usage.
      </div>
    );
  }

  const { workspaceId, workspaceName } = usageInfo;

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in mt-4">
      {/* Title */}
      <div>
        <h1 className="font-title text-3xl font-normal tracking-tight">{workspaceName} Usage</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor credit spend and resource consumption for this workspace.
        </p>
      </div>

      {/* Plan Details & Balance */}
      <PlanUsageCard />

      {/* Workspace daily credit usage graph (breakdown by agent) */}
      <CreditUsagePanel
        scope="workspace"
        workspaceId={workspaceId}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
      />

    </div>
  );
}
