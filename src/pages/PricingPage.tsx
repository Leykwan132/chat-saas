import { useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import { useAuth } from '@/partnerAuth/AppAuthProvider';
import { usePostHog } from '@posthog/react';
import { api } from '../../convex/_generated/api';
import { Spinner } from '@/components/ui/spinner';
import { SiteHeader } from '@/components/SiteHeader';
import { toast } from 'sonner';
import {
  type BillingInterval,
  type PlanKey,
} from '../../shared/planCatalog';
import {
  EnterprisePlanAction,
  SubscriptionPlanActionButton,
  SubscriptionPlanPicker,
} from '@/components/SubscriptionPlanPicker';
import { PlanSelectionLayout } from '@/components/pricing/PlanSelectionLayout';
import { PlanComparisonTable } from '@/components/pricing/PlanComparisonTable';
import { PricingFaqSection } from '@/components/pricing/PricingFaqSection';
import { SiteFooter } from '@/components/SiteFooter';
import { POST_LOGIN_REDIRECT } from '../constants';
import { whiteLabelApi } from '@/lib/whiteLabelApi';

export default function PricingPage() {
  const { user, signUp } = useAuth();
  const posthog = usePostHog();
  const hasSession = Boolean(user);
  const billingBlocked = useQuery(whiteLabelApi.billing.isBillingBlockedForCurrentWorkspace, hasSession ? {} : 'skip');
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [submitting, setSubmitting] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanKey | null>(null);

  const createCheckoutSession = useAction(api.stripe.createCheckout);
  const createFreeCheckout = useAction(api.freeCheckout.create);

  const returnTo = { state: { returnTo: POST_LOGIN_REDIRECT } };

  const handlePlanSelect = async (plan: PlanKey) => {
    if (billingBlocked) {
      toast.error('Billing is managed by your partner.');
      return;
    }
    if (submitting) return;

    posthog?.capture('plan_selected', { plan, billing_interval: billingInterval });

    if (!hasSession) {
      void signUp(returnTo);
      return;
    }

    setSubmitting(true);
    setSelectedPlan(plan);

    try {
      if (plan === 'free') {
        toast.loading('Redirecting to checkout…');
        const session = await createFreeCheckout({
          cancelPath: '/pricing',
          interval: billingInterval,
        });
        if (session?.url) {
          window.location.assign(session.url);
        } else {
          throw new Error('Failed to start checkout');
        }
      } else {
        posthog?.capture('checkout_initiated', { plan, billing_interval: billingInterval });
        const session = await createCheckoutSession({
          plan,
          interval: billingInterval,
          mode: 'subscription',
          orgId: 'personal',
          cancelPath: '/pricing',
        });
        if (session?.url) {
          window.location.assign(session.url);
        } else {
          throw new Error('Failed to start checkout');
        }
      }
    } catch (err) {
      posthog?.captureException(err);
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
      setSelectedPlan(null);
    }
  };

  return (
    <div className="min-h-[100svh] bg-zinc-50 dark:bg-[#060606] font-sans text-zinc-900 dark:text-zinc-100 antialiased selection:bg-zinc-200 dark:selection:bg-zinc-800 selection:text-zinc-900 dark:selection:text-zinc-50 flex flex-col justify-between">
      <SiteHeader />

      <main className="flex flex-1 flex-col items-center px-5 py-32 sm:px-6 sm:py-40">
        {billingBlocked ? <div className="w-full max-w-xl rounded-xl border p-6 text-center"><h1 className="text-xl font-semibold">Billing is managed by your partner</h1><p className="mt-2 text-sm text-muted-foreground">Your workspace plan and credits are provided through your partner portal.</p></div> :
        <div className="flex w-full max-w-[96rem] flex-col gap-28 sm:gap-32">
          <PlanSelectionLayout>
            <SubscriptionPlanPicker
              variant="pricing"
              enterpriseLayout="column"
              includeEnterprise
              billingInterval={billingInterval}
              onBillingIntervalChange={setBillingInterval}
              disabled={submitting}
              renderPlanAction={(p) => {
                if (p.isEnterprise) {
                  return <EnterprisePlanAction label="Contact our sales" />;
                }

                return (
                  <SubscriptionPlanActionButton
                    planId={p.id}
                    emphasizeRecommended={p.id === 'growth'}
                    disabled={submitting}
                    loading={submitting && selectedPlan === p.id}
                    label={
                      submitting && selectedPlan === p.id ? (
                        <Spinner className="size-3.5" />
                      ) : (
                        p.actionLabel
                      )
                    }
                    onClick={() => void handlePlanSelect(p.id)}
                  />
                );
              }}
            />
          </PlanSelectionLayout>

          <PricingFaqSection />

          <PlanComparisonTable
            id="pricing-comparison"
            className="scroll-mt-28"
          />
        </div>
        }
      </main>

      <SiteFooter />
    </div>
  );
}
