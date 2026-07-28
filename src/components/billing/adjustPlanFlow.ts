import type { PlanKey } from '../../../shared/planCatalog';

export type PlanSelectionResult =
  | 'ignore'
  | 'warn_team_free'
  | 'portal'
  | 'checkout';

export function resolvePlanSelection({
  currentPlan,
  selectedPlan,
  isTeam,
  subscriptionStatus,
}: {
  currentPlan: PlanKey;
  selectedPlan: PlanKey;
  isTeam: boolean;
  subscriptionStatus: string | null | undefined;
}): PlanSelectionResult {
  if (selectedPlan === currentPlan) {
    return 'ignore';
  }
  if (isTeam && selectedPlan === 'free') {
    return 'warn_team_free';
  }
  if (
    selectedPlan !== 'free' &&
    (!subscriptionStatus ||
      subscriptionStatus === 'canceled' ||
      subscriptionStatus === 'cancelled')
  ) {
    return 'checkout';
  }
  return 'portal';
}

export function buildAdjustPlanReturnPath(
  pathname: string,
  search: string,
): string {
  return `${pathname}${search}`;
}
