import { useState } from 'react';
import { useQuery } from 'convex/react';
import { useAuth } from '@workos-inc/authkit-react';
import { api } from '../../convex/_generated/api';
import { Skeleton } from '@/components/ui/skeleton';
import { PlanUsageCard } from './analytics/PlanUsageCard';
import { CreditUsagePanel, type CreditTimeRange } from './analytics/CreditUsagePanel';

export function AccountUsageTab() {
  const { isLoading: isAuthLoading } = useAuth();
  const [timeRange, setTimeRange] = useState<CreditTimeRange>('period');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('all');

  const usage = useQuery(
    api.creditUsageAnalytics.getWorkspaceAndAccountUsage,
    isAuthLoading ? 'skip' : {},
  );

  const isLoading = isAuthLoading || usage === undefined;

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl animate-fade-in">
        <Skeleton className="h-[180px] rounded-xl" />
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    );
  }

  if (!usage) {
    return (
      <div className="text-sm text-muted-foreground py-6 animate-fade-in">
        No usage data available for this account.
      </div>
    );
  }

  const workspaceOptions = usage.breakdown.map((item) => ({
    id: item.workspaceId,
    name: item.name,
  }));

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      {/* Plan Details & Balance */}
      <PlanUsageCard />

      {/* Credit Usage Chart with Workspace filter */}
      <CreditUsagePanel
        scope={selectedWorkspaceId === 'all' ? 'account' : 'workspace'}
        workspaceId={selectedWorkspaceId === 'all' ? undefined : selectedWorkspaceId}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        workspaceOptions={workspaceOptions}
        selectedWorkspaceId={selectedWorkspaceId}
        onWorkspaceChange={setSelectedWorkspaceId}
      />
    </div>
  );
}

