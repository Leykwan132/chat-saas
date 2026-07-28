import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '@workos-inc/authkit-react';
import { useAction, useQuery } from 'convex/react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type {
  BillingInterval,
  PlanKey,
} from '../../../shared/planCatalog';
import {
  AdjustPlanContext,
  type AdjustPlanContextValue,
} from './adjustPlanContext';
import {
  buildAdjustPlanReturnPath,
  resolveAdjustPlanView,
  resolvePlanSelection,
  type AdjustPlanView,
} from './adjustPlanFlow';
import { AdjustPlanPickerDialog } from './AdjustPlanPickerDialog';
import { TeamFreePlanWarningDialog } from './TeamFreePlanWarningDialog';
import {
  openBillingPortalInNewWindow,
  openBillingPortalNavigation,
} from './billingPortalNavigation';

type PaidPlanKey = Exclude<PlanKey, 'free'>;

export function AdjustPlanProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const planAndUsage = useQuery(
    api.plans.getPlanAndUsage,
    isAuthLoading || !user ? 'skip' : {},
  );
  const createPortal = useAction(api.stripe.createPortal);
  const createCheckout = useAction(api.stripe.createCheckout);
  const [view, setView] = useState<AdjustPlanView>('closed');
  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>('monthly');
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);

  const returnPath = useCallback(
    () =>
      buildAdjustPlanReturnPath(
        window.location.pathname,
        window.location.search,
      ),
    [],
  );

  const openPortal = useCallback(
    async (
      selectedPlan: PlanKey,
      target: 'same_tab' | 'new_tab' = 'same_tab',
    ) => {
      if (loadingPlan) return;
      setLoadingPlan(selectedPlan);
      try {
        const portalReturnPath = returnPath();
        if (target === 'new_tab') {
          await openBillingPortalInNewWindow({
            createPortal,
            returnPath: portalReturnPath,
            openWindow: () => window.open('about:blank', '_blank'),
          });
        } else {
          await openBillingPortalNavigation({
            createPortal,
            returnPath: portalReturnPath,
            assign: (url) => window.location.assign(url),
          });
        }
      } catch (error: unknown) {
        console.error('Portal error:', error);
        toast.error(
          error instanceof Error
            ? error.message
            : 'Failed to open customer portal.',
        );
      } finally {
        setLoadingPlan(null);
      }
    },
    [createPortal, loadingPlan, returnPath],
  );

  const openCheckout = useCallback(
    async (selectedPlan: PaidPlanKey) => {
      if (loadingPlan) return;
      setLoadingPlan(selectedPlan);
      try {
        const session = await createCheckout({
          plan: selectedPlan,
          interval: billingInterval,
          mode: 'subscription',
          cancelPath: returnPath(),
        });
        if (!session?.url) {
          toast.error('Could not initiate checkout.');
          return;
        }
        window.location.assign(session.url);
      } catch (error: unknown) {
        console.error('Checkout error:', error);
        toast.error(
          error instanceof Error
            ? error.message
            : 'Failed to start checkout.',
        );
      } finally {
        setLoadingPlan(null);
      }
    },
    [billingInterval, createCheckout, loadingPlan, returnPath],
  );

  const openAdjustPlan = useCallback(() => {
    if (!planAndUsage) {
      toast.error('Your billing profile is not available yet.');
      return;
    }
    if (!planAndUsage.canManageBilling) {
      toast.error('Only the workspace owner can adjust this plan.');
      return;
    }
    setView((current) => resolveAdjustPlanView(current, 'open'));
  }, [planAndUsage]);

  const openBillingPortal = useCallback(() => {
    if (!planAndUsage) {
      toast.error('Your billing profile is not available yet.');
      return;
    }
    if (!planAndUsage.canManageBilling) {
      toast.error('Only the workspace owner can manage billing.');
      return;
    }
    void openPortal(planAndUsage.plan, 'new_tab');
  }, [openPortal, planAndUsage]);

  const selectPlan = useCallback(
    (selectedPlan: PlanKey) => {
      if (!planAndUsage) return;
      const result = resolvePlanSelection({
        currentPlan: planAndUsage.plan,
        selectedPlan,
        isTeam: planAndUsage.isTeam,
        subscriptionStatus: planAndUsage.stripeSubscriptionStatus,
      });
      if (result === 'ignore') return;
      if (result === 'warn_team_free') {
        setView((current) =>
          resolveAdjustPlanView(current, 'warn_team_free'),
        );
        return;
      }
      if (result === 'checkout' && selectedPlan !== 'free') {
        void openCheckout(selectedPlan);
        return;
      }
      void openPortal(selectedPlan);
    },
    [openCheckout, openPortal, planAndUsage],
  );

  const contextValue = useMemo<AdjustPlanContextValue>(
    () => ({
      openAdjustPlan,
      openBillingPortal,
      isAdjustPlanLoading: loadingPlan !== null,
    }),
    [loadingPlan, openAdjustPlan, openBillingPortal],
  );

  return (
    <AdjustPlanContext.Provider value={contextValue}>
      {children}
      <AdjustPlanPickerDialog
        open={view === 'picker'}
        onOpenChange={(open) => {
          if (!open && !loadingPlan) {
            setView((current) => resolveAdjustPlanView(current, 'close'));
          }
        }}
        currentPlan={planAndUsage?.plan ?? 'free'}
        billingInterval={billingInterval}
        onBillingIntervalChange={setBillingInterval}
        loadingPlan={loadingPlan}
        onSelectPlan={selectPlan}
      />
      <TeamFreePlanWarningDialog
        open={view === 'team_free_warning'}
        loading={loadingPlan !== null}
        onOpenChange={(open) => {
          if (!open && !loadingPlan) {
            setView((current) => resolveAdjustPlanView(current, 'close'));
          }
        }}
        onGoBack={() =>
          setView((current) => resolveAdjustPlanView(current, 'go_back'))
        }
        onContinue={() => void openPortal('free')}
      />
    </AdjustPlanContext.Provider>
  );
}
