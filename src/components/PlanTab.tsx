import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { useQuery, useAction } from 'convex/react';
import { useAuth } from '@workos-inc/authkit-react';
import { api } from '../../convex/_generated/api';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import type { ExtraCreditsPackId } from '../../shared/planCatalog';
import { AdjustPlanDialog } from '@/components/AdjustPlanDialog';
import { PlanAddOnsSection } from '@/components/billing/PlanAddOnsSection';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { AlertCircle, ExternalLink } from 'lucide-react';
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
  const [loadingCreditsPackId, setLoadingCreditsPackId] = useState<ExtraCreditsPackId | null>(null);
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
    periodEndMs,
  } = planAndUsage;

  const handleCreditsCheckout = async (extraCreditsPackId: ExtraCreditsPackId) => {
    setLoadingCreditsPackId(extraCreditsPackId);
    try {
      const session = await createCheckout({
        mode: 'payment',
        extraCreditsPackId,
        cancelPath: planReturnPath,
      });
      if (session?.url) {
        window.location.assign(session.url);
      } else {
        toast.error('Could not initiate checkout. Please try again.');
      }
    } catch (error: unknown) {
      console.error('Checkout error:', error);
      const message = error instanceof Error ? error.message : 'An error occurred initiating checkout.';
      toast.error(message);
    } finally {
      setLoadingCreditsPackId(null);
    }
  };

  const handlePortal = async () => {
    setIsPortalLoading(true);
    try {
      const session = await createPortal({
        returnPath: planReturnPath,
      });
      if (session?.url) {
        window.location.assign(session.url);
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
    <div className="space-y-8 max-w-5xl">
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
          {periodEndMs && (
            <>
              <span className="text-muted-foreground/40" aria-hidden>
                ·
              </span>
              <span>
                Credits reset {new Date(periodEndMs).toLocaleDateString()}
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

      <PlanAddOnsSection
        loadingCreditsPackId={loadingCreditsPackId}
        onCreditsCheckout={(extraCreditsPackId) => void handleCreditsCheckout(extraCreditsPackId)}
      />

      <AdjustPlanDialog
        open={plansDialogOpen}
        onOpenChange={setPlansDialogOpen}
        planReturnPath={planReturnPath}
      />
    </div>
  );
}
