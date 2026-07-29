import type { PlanKey } from '../../../shared/planCatalog';

export type PlanSelectionResult =
  | 'ignore'
  | 'warn_free_downgrade'
  | 'portal'
  | 'checkout';
export type AdjustPlanView = 'closed' | 'picker' | 'free_downgrade_warning';
export type AdjustPlanViewAction =
  | 'open'
  | 'warn_free_downgrade'
  | 'go_back'
  | 'close';
export type PlanEntrySurface =
  | 'credit_meter'
  | 'plan_settings'
  | 'usage_card'
  | 'locked_feature'
  | 'plan_limit';

export function resolvePlanSelection({
  currentPlan,
  selectedPlan,
  subscriptionStatus,
}: {
  currentPlan: PlanKey;
  selectedPlan: PlanKey;
  subscriptionStatus: string | null | undefined;
}): PlanSelectionResult {
  if (selectedPlan === currentPlan) {
    return 'ignore';
  }
  if (selectedPlan === 'free') {
    return 'warn_free_downgrade';
  }
  if (
    !subscriptionStatus ||
    subscriptionStatus === 'canceled' ||
    subscriptionStatus === 'cancelled'
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
  if (action === 'warn_free_downgrade') {
    return 'free_downgrade_warning';
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

export function resolvePlanEntryLabel(surface: PlanEntrySurface): string {
  if (surface === 'credit_meter') {
    return 'Upgrade';
  }
  if (surface === 'plan_settings' || surface === 'usage_card') {
    return 'Adjust plan';
  }
  return 'Change plan';
}
