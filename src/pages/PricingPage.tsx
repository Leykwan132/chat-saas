import { useState } from 'react';
import { useAction } from 'convex/react';
import { useAuth } from '@workos-inc/authkit-react';
import { Link } from 'react-router';
import { api } from '../../convex/_generated/api';
import { Spinner } from '@/components/ui/spinner';
import { ModeToggle } from '@/components/mode-toggle';
import { toast } from 'sonner';
import {
  ChevronDown,
  ArrowRight,
} from 'lucide-react';
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
  const { user, signIn, signUp } = useAuth();
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

  const onSignIn = () => void signIn(returnTo);
  const onSignUp = () => void signUp(returnTo);

  return (
    <div className="min-h-[100svh] bg-zinc-50 dark:bg-[#060606] font-sans text-zinc-900 dark:text-zinc-100 antialiased selection:bg-black/10 dark:selection:bg-white/20 selection:text-zinc-950 dark:selection:text-white flex flex-col justify-between">
      
      {/* ─── NAVIGATION BAR ─── */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-zinc-200 dark:border-white/[0.06] bg-white/75 dark:bg-[#060606]/75 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5 sm:px-6">
          <Link to="/" className="flex items-center gap-2 text-[15px] font-medium tracking-tight text-zinc-900 dark:text-white">
            <img src="/icon.svg" className="size-6 dark:invert" />
            Kilobot
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-zinc-600 dark:text-zinc-400 md:flex">
            <Link to="/#product" className="inline-flex items-center gap-1 transition-colors hover:text-zinc-900 dark:hover:text-white">
              Product <ChevronDown className="size-3" />
            </Link>
            <Link to="/#resources" className="inline-flex items-center gap-1 transition-colors hover:text-zinc-900 dark:hover:text-white">
              Resources <ChevronDown className="size-3" />
            </Link>
            <Link to="/#enterprise" className="transition-colors hover:text-zinc-900 dark:hover:text-white">
              Enterprise
            </Link>
            <Link to="/pricing" className="transition-colors text-zinc-900 dark:text-white font-medium">
              Pricing
            </Link>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <ModeToggle />
            {hasSession ? (
              <Link
                to={POST_LOGIN_REDIRECT}
                className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white px-3.5 py-2 text-sm font-medium dark:text-[#050505] dark:shadow-[0_0_24px_rgba(255,255,255,0.16)] transition-opacity hover:opacity-90"
              >
                Dashboard
                <ArrowRight className="size-4" />
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onSignIn}
                  className="rounded-md px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={onSignUp}
                  className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white px-3.5 py-2 text-sm font-medium dark:text-[#050505] dark:shadow-[0_0_24px_rgba(255,255,255,0.16)] transition-opacity hover:opacity-90"
                >
                  Get started
                  <ArrowRight className="size-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ─── PRICING MAIN CONTAINER ─── */}
      <main className="flex flex-1 flex-col items-center justify-center px-5 py-32 sm:px-6 sm:py-40">
        <div className="flex w-full max-w-6xl flex-col gap-8">
          <h1 className="text-center text-4xl sm:text-5xl font-bold tracking-tight">
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
