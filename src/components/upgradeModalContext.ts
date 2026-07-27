import { createContext, useContext } from 'react';

export type UpgradeScenario =
  | 'free_to_starter'
  | 'starter_to_growth'
  | 'growth_to_business';

export type UpgradeModalContextType = {
  openUpgradeModal: (scenario?: UpgradeScenario) => void;
  closeUpgradeModal: () => void;
};

export const UpgradeModalContext = createContext<
  UpgradeModalContextType | undefined
>(undefined);

export function useUpgradeModal() {
  const context = useContext(UpgradeModalContext);
  if (!context) {
    throw new Error('useUpgradeModal must be used within an UpgradeModalProvider');
  }
  return context;
}
