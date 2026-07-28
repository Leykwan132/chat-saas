import { toast } from 'sonner';
import type { NavigateFunction } from 'react-router';

export const DEFAULT_PLAN_PATH = '/workspace/settings?section=plan';

type CanCreateOrgTeamResult = {
  allowed: boolean;
  reason: string | null;
  requiresPlanUpgrade: boolean;
} | undefined;

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
      label: 'Manage plan',
      onClick: () => navigate(planPath),
    },
  });
}

export function isTeamCreationUpgradeRequired(canCreateOrgTeam: CanCreateOrgTeamResult) {
  return (
    canCreateOrgTeam !== undefined &&
    !canCreateOrgTeam.allowed &&
    canCreateOrgTeam.requiresPlanUpgrade
  );
}

export function handleCreateTeamGate(
  canCreateOrgTeam: CanCreateOrgTeamResult,
  onAllowed: () => void,
  navigate: NavigateFunction,
  planPath = DEFAULT_PLAN_PATH,
  openManagePlan?: () => void,
) {
  if (canCreateOrgTeam === undefined) return;

  if (canCreateOrgTeam.allowed) {
    onAllowed();
    return;
  }

  if (canCreateOrgTeam.requiresPlanUpgrade) {
    if (openManagePlan) {
      openManagePlan();
    } else {
      showTeamCreationUpgradeToast(navigate, planPath);
    }
    return;
  }

  toast.message(canCreateOrgTeam.reason ?? 'You cannot create a team right now.');
}
