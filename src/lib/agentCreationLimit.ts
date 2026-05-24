import { toast } from 'sonner';
import type { NavigateFunction } from 'react-router';

export function showAgentLimitToast(navigate: NavigateFunction) {
  toast.error('Agent limit reached', {
    description: 'Upgrade to create more agents.',
    icon: null,
    action: {
      label: 'Upgrade',
      onClick: () => navigate('/workspace/account?section=plan'),
    },
  });
}
