import type { PlanKey } from '../../../shared/planCatalog';

export type PlanSelectionResult =
  | 'ignore'
  | 'warn_team_free'
  | 'portal'
  | 'checkout';
export type AdjustPlanView = 'closed' | 'picker' | 'team_free_warning';
export type AdjustPlanViewAction =
  | 'open'
  | 'warn_team_free'
  | 'go_back'
  | 'close';

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

export function resolveAdjustPlanView(
  view: AdjustPlanView,
  action: AdjustPlanViewAction,
): AdjustPlanView {
  if (action === 'open' || action === 'go_back') {
    return 'picker';
  }
  if (action === 'warn_team_free') {
    return 'team_free_warning';
  }
  return view === 'closed' ? view : 'closed';
}

export function resolvePlanCardAction(
  currentPlan: PlanKey,
  plan: PlanKey,
  loadingPlan: PlanKey | null,
) {
  const isCurrent = currentPlan === plan;
  const loading = loadingPlan === plan;
  return {
    label: isCurrent ? 'Current plan' : 'Change plan',
    disabled: isCurrent || loadingPlan !== null,
    loading,
  } as const;
}
