import { useState } from 'react';
import { PlanFeatureGate } from '@/components/PlanFeatureGate';
import { PlanUsageCard } from '@/components/analytics/PlanUsageCard';
import {
  CreditUsagePanel,
  CreditUsagePanelSkeleton,
  type CreditTimeRange,
} from '@/components/analytics/CreditUsagePanel';
import { CreditSpendTable, CreditSpendTableSkeleton } from '@/components/analytics/CreditSpendTable';
import type { Id } from '../../../convex/_generated/dataModel';

export function UsageAnalyticsContent({ agentId }: { agentId: string }) {
  const typedAgentId = agentId as Id<'agents'>;
  const [timeRange, setTimeRange] = useState<CreditTimeRange>('period');

  return (
    <PlanFeatureGate featureKey="agent_usage" featureName="AI Agent Usage">
      <div className="flex flex-col gap-4">
        <PlanUsageCard />
        <div className="flex flex-col gap-6">
          <CreditUsagePanel
            agentId={typedAgentId}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
          />
          <CreditSpendTable agentId={typedAgentId} timeRange={timeRange} />
        </div>
      </div>
    </PlanFeatureGate>
  );
}

export function UsageAnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <CreditUsagePanelSkeleton />
      <CreditSpendTableSkeleton />
    </div>
  );
}
