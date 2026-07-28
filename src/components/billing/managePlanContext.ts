import { createContext, useContext } from 'react';

export type ManagePlanContextValue = {
  openManagePlan: () => void;
  isManagePlanLoading: boolean;
};

export const ManagePlanContext = createContext<
  ManagePlanContextValue | undefined
>(undefined);

export function useManagePlan() {
  const context = useContext(ManagePlanContext);
  if (!context) {
    throw new Error('useManagePlan must be used within ManagePlanProvider');
  }
  return context;
}
