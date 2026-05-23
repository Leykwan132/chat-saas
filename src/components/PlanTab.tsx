import { useState } from 'react';
import { useLocation } from 'react-router';
import { useQuery, useAction } from 'convex/react';
import { useAuth } from '@workos-inc/authkit-react';
import { api } from '../../convex/_generated/api';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  EXTRA_CREDITS_PACK_AMOUNT,
  EXTRA_CREDITS_PACK_RM,
  getPlanChangeActionLabel,
  type BillingInterval,
  type PlanKey,
} from '../../shared/planCatalog';
import {
  SubscriptionPlanActionButton,
  SubscriptionPlanPicker,
} from '@/components/SubscriptionPlanPicker';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Coins, ExternalLink, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function PlanTab() {
  const { organizationId, isLoading: isAuthLoading } = useAuth();
  const { pathname } = useLocation();
  const planReturnPath = `${pathname}?section=plan`;
  const billingOrgId = organizationId ?? null;
  const planAndUsage = useQuery(
    api.plans.getPlanAndUsage,
    isAuthLoading ? 'skip' : { orgId: billingOrgId },
  );

  const createCheckout = useAction(api.stripe.createCheckout);
  const createPortal = useAction(api.stripe.createPortal);

  const [plansDialogOpen, setPlansDialogOpen] = useState(false);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [loadingPlanKey, setLoadingPlanKey] = useState<string | null>(null);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [isCreditsLoading, setIsCreditsLoading] = useState(false);

  if (isAuthLoading || planAndUsage === undefined) {
    return (
      <div className="space-y-6 max-w-xl">
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    );
  }

  if (!planAndUsage) {
    return (
      <Empty className="border bg-muted/20">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <AlertCircle />
          </EmptyMedia>
          <EmptyTitle>Unable to load plan</EmptyTitle>
          <EmptyDescription>
            Your billing profile is not available yet. Refresh the page or try again in a moment.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const {
    plan,
    planConfig,
    stripeSubscriptionCurrentPeriodEnd,
  } = planAndUsage;

  const handleCheckout = async (planKey: string | null, mode: 'subscription' | 'payment') => {
    const isCredits = mode === 'payment';
    if (isCredits) {
      setIsCreditsLoading(true);
    } else {
      setLoadingPlanKey(planKey);
    }

    try {
      const session = await createCheckout({
        plan: isCredits ? undefined : (planKey ?? undefined),
        interval: isCredits ? undefined : billingInterval,
        mode,
        orgId: billingOrgId,
      });
      if (session && session.url) {
        window.location.href = session.url;
      } else {
        toast.error('Could not initiate checkout. Please try again.');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || 'An error occurred initiating checkout.');
    } finally {
      if (isCredits) {
        setIsCreditsLoading(false);
      } else {
        setLoadingPlanKey(null);
      }
    }
  };

  const handlePortal = async () => {
    setIsPortalLoading(true);
    try {
      const session = await createPortal({
        orgId: billingOrgId,
        returnPath: planReturnPath,
      });
      if (session && session.url) {
        window.location.href = session.url;
      } else {
        toast.error('Could not load billing portal.');
      }
    } catch (error: any) {
      console.error('Portal error:', error);
      toast.error(error.message || 'Failed to open customer portal.');
    } finally {
      setIsPortalLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-xl">
      {/* Current plan */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <h3 className="text-xl font-semibold tracking-tight text-foreground">
            {planConfig.name}
          </h3>
          <Badge variant="secondary" className="rounded-md px-2 py-0 text-[11px] font-medium">
            Current
          </Badge>
        </div>

        <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
          <span>{planConfig.price}</span>
          {stripeSubscriptionCurrentPeriodEnd && plan !== 'free' && (
            <>
              <span className="text-muted-foreground/40" aria-hidden>
                ·
              </span>
              <span>
                Renews {new Date(stripeSubscriptionCurrentPeriodEnd).toLocaleDateString()}
              </span>
            </>
          )}
        </p>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-5"
          onClick={() => setPlansDialogOpen(true)}
        >
          Adjust plan
        </Button>
      </div>

      {/* Add-ons */}
      <div>
        <h3 className="text-sm font-semibold text-foreground">Add-ons</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          One-time purchases on top of your subscription.
        </p>
        <div className="mt-4 rounded-xl border border-border bg-card p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40">
                <Coins className="size-4 text-muted-foreground" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-foreground">Extra credits</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  {EXTRA_CREDITS_PACK_AMOUNT.toLocaleString()} credits · RM{EXTRA_CREDITS_PACK_RM} one-time
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => handleCheckout(null, 'payment')}
              disabled={isCreditsLoading}
            >
              {isCreditsLoading ? 'Loading…' : 'Buy credits'}
            </Button>
          </div>
        </div>
      </div>

      {/* Subscription plans dialog */}
      <Dialog open={plansDialogOpen} onOpenChange={setPlansDialogOpen}>
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[min(90vh,920px)] w-[calc(100%-2rem)] flex-col gap-5 overflow-hidden px-6 py-8 sm:max-w-6xl sm:px-10 sm:py-10"
        >
          <DialogHeader className="shrink-0 items-center text-center">
            <DialogTitle className="text-2xl font-bold tracking-tight sm:text-3xl">
              Choose your plan
            </DialogTitle>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-1 pb-2 sm:px-2">
            <SubscriptionPlanPicker
              billingInterval={billingInterval}
              onBillingIntervalChange={setBillingInterval}
              currentPlanId={plan as PlanKey}
              disabled={loadingPlanKey !== null || isPortalLoading}
              renderPlanAction={(planCard) => {
                const isCurrent = plan === planCard.id;
                const isFreeDowngrade = planCard.id === 'free';
                const isLoading = isFreeDowngrade
                  ? isPortalLoading
                  : loadingPlanKey === planCard.id;
                const label = isLoading
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
                    emphasizeRecommended={false}
                    label={label}
                    disabled={loadingPlanKey !== null || isPortalLoading}
                    loading={isLoading}
                    onClick={() =>
                      isFreeDowngrade
                        ? void handlePortal()
                        : void handleCheckout(planCard.id, 'subscription')
                    }
                  />
                );
              }}
            />
          </div>

          {plan !== 'free' && (
            <div className="flex shrink-0 justify-end border-t border-border/60 px-1 pt-6 sm:px-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground"
                onClick={() => void handlePortal()}
                disabled={isPortalLoading}
              >
                {isPortalLoading ? (
                  <Spinner className="size-3.5" />
                ) : (
                  <ExternalLink className="size-3.5" />
                )}
                Manage billing portal
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
