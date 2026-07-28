import { useAdjustPlan } from './adjustPlanContext';

export function useManagePlan() {
  const { openAdjustPlan, isAdjustPlanLoading } = useAdjustPlan();
  return {
    openManagePlan: openAdjustPlan,
    isManagePlanLoading: isAdjustPlanLoading,
  };
}
