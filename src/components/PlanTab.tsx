import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { useQuery, useAction } from 'convex/react';
import { useAuth } from '@workos-inc/authkit-react';
import { api } from '../../convex/_generated/api';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  EXTRA_CREDITS_PACK_AMOUNT,
  EXTRA_CREDITS_PACK_NOTE,
  formatExtraCreditsPackPrice,
} from '../../shared/planCatalog';
import { AdjustPlanDialog } from '@/components/AdjustPlanDialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Coins, AlertCircle, ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function PlanTab() {
  const { isLoading: isAuthLoading } = useAuth();
  const { pathname } = useLocation();
  const planReturnPath = `${pathname}?section=plan`;
  const planAndUsage = useQuery(
    api.plans.getPlanAndUsage,
    isAuthLoading ? 'skip' : {},
  );

  const createCheckout = useAction(api.stripe.createCheckout);
  const createPortal = useAction(api.stripe.createPortal);

  const [plansDialogOpen, setPlansDialogOpen] = useState(false);
  const [isCreditsLoading, setIsCreditsLoading] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);

  useEffect(() => {
    if (window.location.hash !== '#plan-add-ons') {
      return;
    }
    document.getElementById('plan-add-ons')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, []);

  if (isAuthLoading || planAndUsage === undefined) {
    return (
      <div className="space-y-6 max-w-xl">
        <Skeleton className="h-36 w-full max-w-md rounded-xl" />
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
    }

    try {
      const session = await createCheckout({
        plan: isCredits ? undefined : (planKey ?? undefined),
        interval: isCredits ? undefined : 'monthly',
        mode,
        cancelPath: planReturnPath,
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
      }
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
    <div className="space-y-8 max-w-xl">
      {/* Current plan */}
      <div className="rounded-xl border border-border bg-card p-5 max-w-md">
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

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            size="sm"
            onClick={() => setPlansDialogOpen(true)}
          >
            Adjust plan
          </Button>
          {plan !== 'free' ? (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto gap-1.5 px-0 text-muted-foreground"
              onClick={() => void handlePortal()}
              disabled={isPortalLoading}
            >
              {isPortalLoading ? (
                <Spinner className="size-3.5" />
              ) : (
                <ExternalLink className="size-3.5" />
              )}
              Billing portal
            </Button>
          ) : null}
        </div>
      </div>

      {/* Add-ons */}
      <div id="plan-add-ons" className="scroll-mt-6">
        <h3 className="text-sm font-semibold text-foreground">Add-ons</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          One-time purchases on top of your subscription.
        </p>
        <div className="mt-4 flex flex-wrap gap-4">
          <Card className="w-full max-w-[17.5rem] overflow-hidden rounded-xl border border-border bg-card py-0 shadow-none ring-0">
            <CardHeader className="rounded-none px-5 pt-5 pb-4">
              <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Coins className="size-3.5 text-muted-foreground" />
                {EXTRA_CREDITS_PACK_AMOUNT.toLocaleString()} credits
              </p>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-4xl font-normal tracking-tight text-foreground">
                  {formatExtraCreditsPackPrice()}
                </span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                {EXTRA_CREDITS_PACK_NOTE}
              </p>
            </CardHeader>
            <CardFooter className="rounded-none border-t border-border/60 px-5 pb-5 pt-4">
              <Button
                type="button"
                variant="secondary"
                className="h-9 w-full rounded-lg text-sm font-medium"
                onClick={() => handleCheckout(null, 'payment')}
                disabled={isCreditsLoading}
              >
                {isCreditsLoading ? <Spinner className="size-3.5" /> : 'Top Up Now'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      <AdjustPlanDialog
        open={plansDialogOpen}
        onOpenChange={setPlansDialogOpen}
        planReturnPath={planReturnPath}
      />
    </div>
  );
}
