import { createContext, useContext } from 'react';

export type AdjustPlanContextValue = {
  openAdjustPlan: () => void;
  isAdjustPlanLoading: boolean;
};

export const AdjustPlanContext = createContext<
  AdjustPlanContextValue | undefined
>(undefined);

export function useAdjustPlan() {
  const context = useContext(AdjustPlanContext);
  if (!context) {
    throw new Error('useAdjustPlan must be used within AdjustPlanProvider');
  }
  return context;
}
