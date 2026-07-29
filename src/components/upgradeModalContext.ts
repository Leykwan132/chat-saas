import { createContext, useContext } from 'react';
import type { UpgradeScenario } from './UpgradeModal';

export type UpgradeModalContextValue = {
  openUpgradeModal: (scenario?: UpgradeScenario) => void;
  closeUpgradeModal: () => void;
};

export const UpgradeModalContext =
  createContext<UpgradeModalContextValue | undefined>(undefined);

export function useUpgradeModal() {
  const context = useContext(UpgradeModalContext);
  if (!context) {
    throw new Error('useUpgradeModal must be used within UpgradeModalProvider');
  }
  return context;
}
