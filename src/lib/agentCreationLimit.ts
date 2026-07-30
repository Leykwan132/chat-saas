import { toast } from 'sonner';
import type { NavigateFunction } from 'react-router';
import { resolvePlanEntryLabel } from '@/components/billing/adjustPlanFlow';

export function showAgentLimitToast(navigate: NavigateFunction) {
  toast.error('Agent limit reached', {
    description: 'Upgrade to create more agents.',
    icon: null,
    action: {
      label: resolvePlanEntryLabel('plan_limit'),
      onClick: () => navigate('/workspace/settings?section=plan'),
    },
  });
}
