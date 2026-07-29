import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '@workos-inc/authkit-react';
import { useQuery } from 'convex/react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { PlanKey } from '../../shared/planCatalog';
import { useAdjustPlan } from '@/components/billing/adjustPlanContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { UpgradeCard, type UpgradeScenario } from '@/components/UpgradeModal';
import {
  UpgradeModalContext,
  type UpgradeModalContextValue,
} from '@/components/upgradeModalContext';
import { resolveUpgradeScenario } from '@/components/upgradeModalFlow';
import { UPGRADE_SCENARIOS } from '@/config/upgradeScenarios';

export function UpgradeModalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const planAndUsage = useQuery(
    api.plans.getPlanAndUsage,
    isAuthLoading || !user ? 'skip' : {},
  );
  const { openAdjustPlan } = useAdjustPlan();
  const [open, setOpen] = useState(false);
  const [scenario, setScenario] =
    useState<UpgradeScenario>('free_to_starter');

  const openUpgradeModal = useCallback(
    (requestedScenario?: UpgradeScenario) => {
      if (requestedScenario) {
        setScenario(requestedScenario);
        setOpen(true);
        return;
      }
      if (!planAndUsage) {
        toast.error('Your plan is not available yet.');
        return;
      }
      setScenario(resolveUpgradeScenario(planAndUsage.plan as PlanKey));
      setOpen(true);
    },
    [planAndUsage],
  );

  const closeUpgradeModal = useCallback(() => setOpen(false), []);

  const continueToAdjustPlan = useCallback(() => {
    setOpen(false);
    openAdjustPlan();
  }, [openAdjustPlan]);

  const contextValue = useMemo<UpgradeModalContextValue>(
    () => ({ openUpgradeModal, closeUpgradeModal }),
    [closeUpgradeModal, openUpgradeModal],
  );
  const config = UPGRADE_SCENARIOS[scenario];

  return (
    <UpgradeModalContext.Provider value={contextValue}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden rounded-3xl p-0 sm:max-w-lg">
          <DialogTitle className="sr-only">{config.title}</DialogTitle>
          <DialogDescription className="sr-only">
            {config.description}
          </DialogDescription>
          <UpgradeCard
            scenario={scenario}
            onUpgrade={continueToAdjustPlan}
          />
        </DialogContent>
      </Dialog>
    </UpgradeModalContext.Provider>
  );
}
