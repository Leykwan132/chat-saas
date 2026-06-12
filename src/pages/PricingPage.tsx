import { useState } from 'react';
import { useAction } from 'convex/react';
import { useAuth } from '@workos-inc/authkit-react';
import { api } from '../../convex/_generated/api';
import { Spinner } from '@/components/ui/spinner';
import { SiteHeader } from '@/components/SiteHeader';
import { toast } from 'sonner';
import {
  type BillingInterval,
  type PlanKey,
} from '../../shared/planCatalog';
import {
  SubscriptionPlanActionButton,
  SubscriptionPlanPicker,
} from '@/components/SubscriptionPlanPicker';
import { SiteFooter } from '@/components/SiteFooter';
import { POST_LOGIN_REDIRECT } from '../constants';

export default function PricingPage() {
  const { user, signUp } = useAuth();
  const hasSession = Boolean(user);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [submitting, setSubmitting] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanKey | null>(null);

  const createCheckoutSession = useAction(api.stripe.createCheckout);
  const createStripeCustomer = useAction(api.stripe.createStripeCustomer);

  const returnTo = { state: { returnTo: POST_LOGIN_REDIRECT } };

  const handlePlanSelect = async (plan: PlanKey) => {
    if (submitting) return;
    
    if (!hasSession) {
      void signUp(returnTo);
      return;
    }

    setSubmitting(true);
    setSelectedPlan(plan);

    try {
      if (plan === 'free') {
        toast.loading('Setting up billing account…');
        await createStripeCustomer({ orgId: 'personal' });
        window.location.href = '/workspace';
      } else {
        const session = await createCheckoutSession({
          plan,
          interval: billingInterval,
          mode: 'subscription',
          orgId: 'personal',
          cancelPath: '/pricing',
        });
        if (session?.url) {
          window.location.href = session.url;
        } else {
          throw new Error('Failed to start checkout');
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
      setSelectedPlan(null);
    }
  };



  return (
    <div className="min-h-[100svh] bg-zinc-50 dark:bg-[#060606] font-sans text-zinc-900 dark:text-zinc-100 antialiased selection:bg-zinc-200 dark:selection:bg-zinc-800 selection:text-zinc-900 dark:selection:text-zinc-50 flex flex-col justify-between">
      <SiteHeader />

      {/* ─── PRICING MAIN CONTAINER ─── */}
      <main className="flex flex-1 flex-col items-center justify-center px-5 py-32 sm:px-6 sm:py-40">
        <div className="flex w-full max-w-6xl flex-col gap-8">
          <h1 className="text-center text-4xl font-semibold tracking-tight sm:text-5xl">
            Choose your plan
          </h1>

          <SubscriptionPlanPicker
            billingInterval={billingInterval}
            onBillingIntervalChange={setBillingInterval}
            disabled={submitting}
            renderPlanAction={(p) => (
              <SubscriptionPlanActionButton
                planId={p.id}
                emphasizeRecommended={false}
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
            )}
          />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
