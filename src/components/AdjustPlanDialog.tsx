import { useState } from 'react';
import { useQuery, useAction } from 'convex/react';
import { useAuth } from '@workos-inc/authkit-react';
import { api } from '../../convex/_generated/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import {
  getPlanChangeActionLabel,
  type BillingInterval,
  type PlanKey,
} from '../../shared/planCatalog';
import {
  EnterprisePlanAction,
  SubscriptionPlanActionButton,
  SubscriptionPlanPicker,
} from '@/components/SubscriptionPlanPicker';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type AdjustPlanDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planReturnPath: string;
};

export function AdjustPlanDialog({
  open,
  onOpenChange,
  planReturnPath,
}: AdjustPlanDialogProps) {
  const { isLoading: isAuthLoading } = useAuth();
  const planAndUsage = useQuery(
    api.plans.getPlanAndUsage,
    isAuthLoading ? 'skip' : {},
  );

  const createCheckout = useAction(api.stripe.createCheckout);
  const createPortal = useAction(api.stripe.createPortal);

  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [loadingPlanKey, setLoadingPlanKey] = useState<string | null>(null);
  const [isPortalLoading, setIsPortalLoading] = useState(false);

  const plan = planAndUsage?.plan ?? 'free';
  const isLoading = isAuthLoading || planAndUsage === undefined;

  const handleCheckout = async (planKey: string | null, mode: 'subscription' | 'payment') => {
    setLoadingPlanKey(planKey);

    try {
      const session = await createCheckout({
        plan: planKey ?? undefined,
        interval: billingInterval,
        mode,
        cancelPath: planReturnPath,
      });
      if (session?.url) {
        window.location.href = session.url;
      } else {
        toast.error('Could not initiate checkout. Please try again.');
      }
    } catch (error: unknown) {
      console.error('Checkout error:', error);
      const message = error instanceof Error ? error.message : 'An error occurred initiating checkout.';
      toast.error(message);
    } finally {
      setLoadingPlanKey(null);
    }
  };

  const handlePortal = async () => {
    setIsPortalLoading(true);
    try {
      const session = await createPortal({
        returnPath: planReturnPath,
      });
      if (session?.url) {
        window.location.href = session.url;
      } else {
        toast.error('Could not load billing portal.');
      }
    } catch (error: unknown) {
      console.error('Portal error:', error);
      const message = error instanceof Error ? error.message : 'Failed to open customer portal.';
      toast.error(message);
    } finally {
      setIsPortalLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          'fixed inset-0 z-50 m-0 flex h-svh w-svw max-w-none translate-none transform-none flex-col overflow-hidden',
          'top-0 left-0 rounded-none border-0 bg-background p-0 shadow-none ring-0',
          'sm:top-0 sm:left-0 sm:max-w-none',
          'data-open:zoom-in-100 data-closed:zoom-out-100',
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col justify-start px-4 pt-12 pb-8 sm:px-8 sm:pt-16 sm:pb-10">
          <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-5">
            <DialogHeader className="shrink-0 items-center text-center">
              <DialogTitle className="font-title text-3xl font-semibold tracking-tight sm:text-4xl">
                Choose your plan
              </DialogTitle>
            </DialogHeader>

            {isLoading ? (
              <div className="flex min-h-[12rem] items-center justify-center">
                <Spinner className="size-6 text-muted-foreground" />
              </div>
            ) : (
              <SubscriptionPlanPicker
                variant="pricing"
                density="compact"
                enterpriseLayout="column"
                includeEnterprise
                billingInterval={billingInterval}
                onBillingIntervalChange={setBillingInterval}
                currentPlanId={plan as PlanKey}
                disabled={loadingPlanKey !== null || isPortalLoading}
                renderPlanAction={(planCard) => {
                  if (planCard.isEnterprise) {
                    return (
                      <EnterprisePlanAction label="Contact our sales" />
                    );
                  }

                  const isCurrent = plan === planCard.id;
                  const isFreeDowngrade = planCard.id === 'free';
                  const isPlanLoading = isFreeDowngrade
                    ? isPortalLoading
                    : loadingPlanKey === planCard.id;
                  const label = isPlanLoading
                    ? 'Loading…'
                    : getPlanChangeActionLabel(
                        plan as PlanKey,
                        planCard.id,
                        planCard.actionLabel,
                      );

                  if (isCurrent) {
                    return (
                      <SubscriptionPlanActionButton
                        planId={planCard.id}
                        emphasizeRecommended={false}
                        isCurrentPlan
                        label="Current plan"
                        disabled
                        onClick={() => undefined}
                      />
                    );
                  }

                  return (
                    <SubscriptionPlanActionButton
                      planId={planCard.id}
                      emphasizeRecommended={planCard.id === 'growth'}
                      label={label}
                      disabled={loadingPlanKey !== null || isPortalLoading}
                      loading={isPlanLoading}
                      onClick={() =>
                        isFreeDowngrade
                          ? void handlePortal()
                          : void handleCheckout(planCard.id, 'subscription')
                      }
                    />
                  );
                }}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
