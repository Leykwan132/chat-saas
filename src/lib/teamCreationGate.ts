import { toast } from 'sonner';
import type { NavigateFunction } from 'react-router';
import { resolvePlanEntryLabel } from '@/components/billing/adjustPlanFlow';

export const DEFAULT_PLAN_PATH = '/workspace/settings?section=plan';

export type CanCreateOrgTeamResult = {
  allowed: boolean;
  reason: string | null;
  requiresPlanUpgrade: boolean;
} | undefined;

export type TeamCreationGateDecision =
  | 'loading'
  | 'allowed'
  | 'upgrade'
  | 'blocked';

export function resolveTeamCreationGate(
  result: CanCreateOrgTeamResult,
): TeamCreationGateDecision {
  if (result === undefined) return 'loading';
  if (result.allowed) return 'allowed';
  return result.requiresPlanUpgrade ? 'upgrade' : 'blocked';
}

export function getPlanPathFromReturnTo(returnTo: string) {
  if (returnTo.includes('section=')) {
    return returnTo.replace(/section=[^&]+/, 'section=plan');
  }

  return `${returnTo}${returnTo.includes('?') ? '&' : '?'}section=plan`;
}

export function showTeamCreationUpgradeToast(
  navigate: NavigateFunction,
  planPath = DEFAULT_PLAN_PATH,
) {
  toast.message('Paid plan required', {
    description: 'Upgrade your account to create shared teams.',
    action: {
      label: resolvePlanEntryLabel('plan_limit'),
      onClick: () => navigate(planPath),
    },
  });
}

export function isTeamCreationUpgradeRequired(canCreateOrgTeam: CanCreateOrgTeamResult) {
  return resolveTeamCreationGate(canCreateOrgTeam) === 'upgrade';
}

export function handleCreateTeamGate(
  canCreateOrgTeam: CanCreateOrgTeamResult,
  onAllowed: () => void,
  navigate: NavigateFunction,
  planPath = DEFAULT_PLAN_PATH,
  openUpgradeModal?: () => void,
) {
  const decision = resolveTeamCreationGate(canCreateOrgTeam);

  if (decision === 'loading') return;

  if (decision === 'allowed') {
    onAllowed();
    return;
  }

  if (decision === 'upgrade') {
    if (openUpgradeModal) {
      openUpgradeModal();
    } else {
      showTeamCreationUpgradeToast(navigate, planPath);
    }
    return;
  }

  toast.message(canCreateOrgTeam?.reason ?? 'You cannot create a team right now.');
}
