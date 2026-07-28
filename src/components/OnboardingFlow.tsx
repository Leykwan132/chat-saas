import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAction, useMutation, useQuery } from 'convex/react';
import { usePostHog } from '@posthog/react';
import { AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type {
  BillingInterval,
  PlanKey,
} from '../../shared/planCatalog';
import { AnimatedGridPattern } from '@/components/ui/animated-grid-pattern';
import { Spinner } from '@/components/ui/spinner';
import {
  ChannelsStep,
  RoleStep,
  UseCaseStep,
} from '@/components/onboarding/OnboardingQuestionSteps';
import { OnboardingPlanStep } from '@/components/onboarding/OnboardingPlanStep';
import { OnboardingShowcase } from '@/components/onboarding/OnboardingShowcases';
import { ReferralCodeStep } from '@/components/onboarding/ReferralCodeStep';
import type { OnboardingStep } from '@/components/onboarding/onboardingOptions';
import { mapBackendError } from '@/lib/errorMapping';
import {
  isProductFeatureEnabled,
  useEnableReferralProgram,
} from '@/lib/posthogFeatureFlags';
import { cn } from '@/lib/utils';

export function OnboardingFlow() {
  const completeOnboarding = useMutation(api.users.completeOnboarding);
  const createCheckout = useAction(api.stripe.createCheckout);
  const createFreeCheckout = useAction(api.freeCheckout.create);
  const currentUser = useQuery(api.users.currentUser);
  const posthog = usePostHog();
  const referralProgramState = useEnableReferralProgram();
  const referralProgramEnabled =
    isProductFeatureEnabled(referralProgramState);
  const [step, setStep] = useState<OnboardingStep>(1);
  const [role, setRole] = useState('');
  const [useCases, setUseCases] = useState<string[]>([]);
  const [channels, setChannels] = useState<string[]>([]);
  const [referralCode, setReferralCode] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<PlanKey | null>(null);
  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>('monthly');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!currentUser?.onboardingAnswers) {
      return;
    }
    setRole(currentUser.onboardingAnswers.role || '');
    setUseCases(currentUser.onboardingAnswers.useCase || []);
    setChannels(currentUser.onboardingAnswers.channels || []);
    setSelectedPlan((currentUser.plan as PlanKey) || null);
    setStep(5);
  }, [currentUser]);

  useEffect(() => {
    if (referralProgramState === false && step === 4) {
      setReferralCode('');
      setStep(5);
    }
  }, [referralProgramState, step]);

  useEffect(() => {
    if (step >= 4 || submitting) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key !== 'Enter' ||
        event.defaultPrevented ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (step === 1 && role) {
        event.preventDefault();
        setStep(2);
      } else if (step === 2 && useCases.length > 0) {
        event.preventDefault();
        setStep(3);
      } else if (step === 3 && channels.length > 0) {
        event.preventDefault();
        setStep(referralProgramEnabled ? 4 : 5);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    channels,
    referralProgramEnabled,
    role,
    step,
    submitting,
    useCases,
  ]);

  if (currentUser === undefined || referralProgramState === undefined) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-background">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  const toggleSelection = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    setter((previous) =>
      previous.includes(value)
        ? previous.filter((item) => item !== value)
        : [...previous, value],
    );
  };

  const finishBilling = async (planKey: PlanKey) => {
    if (planKey === 'free') {
      toast.loading('Redirecting to checkout…');
      const session = await createFreeCheckout({
        cancelPath: '/onboarding',
      });
      if (!session?.url) {
        throw new Error('Failed to start checkout');
      }
      window.location.href = session.url;
      return;
    }
    toast.loading('Redirecting to checkout…');
    const session = await createCheckout({
      plan: planKey,
      interval: billingInterval,
      mode: 'subscription',
      orgId: 'personal',
      cancelPath: '/onboarding',
    });
    if (!session?.url) {
      throw new Error('Failed to start checkout');
    }
    window.location.href = session.url;
  };

  const handleComplete = async (planKey: PlanKey) => {
    setSubmitting(true);
    const submittedReferralCode =
      referralProgramEnabled && referralCode ? referralCode : undefined;
    try {
      const result = await completeOnboarding({
        role,
        useCase: useCases,
        channels,
        referralCode: submittedReferralCode,
      });
      if (result.referralRewardCredits) {
        posthog?.capture('referral_claimed', {
          referral_code: submittedReferralCode,
          reward_credits: result.referralRewardCredits,
        });
      }
      toast.success(
        result.referralRewardCredits
          ? `${result.referralRewardCredits.toLocaleString()} referral credits added`
          : 'Workspace created!',
      );
    } catch (error) {
      const mappedError = mapBackendError(error, 'Referral code error');
      if (submittedReferralCode) {
        posthog?.capture('referral_claim_failed', {
          referral_code: submittedReferralCode,
          reason: mappedError.title,
        });
      }
      setStep(referralProgramEnabled ? 4 : 5);
      setSubmitting(false);
      toast.error(mappedError.message);
      return;
    }

    try {
      await finishBilling(planKey);
    } catch (error) {
      setSubmitting(false);
      toast.error(error instanceof Error ? error.message : 'Something went wrong');
    }
  };

  const handleBack = () => {
    if (step > 1 && !submitting) {
      setStep((current) =>
        current === 5 && !referralProgramEnabled
          ? 3
          : ((current - 1) as OnboardingStep),
      );
    }
  };

  return (
    <div className="flex min-h-[100svh] flex-col bg-background">
      <header className="fixed inset-x-0 top-0 z-50 border-b bg-background/75 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center px-5 sm:px-6">
          <Link to="/" className="flex items-center gap-2 text-[15px]">
            <img src="/icon.svg" className="size-6 dark:invert" alt="Kilobot" />
            <span className="font-title text-[16px] font-semibold">Kilobot</span>
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 w-full flex-1 overflow-hidden pt-14">
        <main
          className={cn(
            'relative flex min-w-0 flex-1 flex-col',
            step !== 5 && 'border-r border-border/50',
          )}
        >
          <div className="flex flex-1 flex-col justify-center px-8 py-12 sm:px-14 md:px-20">
            <div className={cn('mx-auto w-full', step === 5 ? 'max-w-[96rem]' : 'max-w-lg')}>
              {step === 5 ? (
                <OnboardingPlanStep
                  billingInterval={billingInterval}
                  selectedPlan={selectedPlan}
                  submitting={submitting}
                  onBillingIntervalChange={setBillingInterval}
                  onSelectPlan={(plan) => {
                    setSelectedPlan(plan);
                    void handleComplete(plan);
                  }}
                  onBack={handleBack}
                />
              ) : (
                <AnimatePresence mode="wait">
                  {step === 1 ? (
                    <RoleStep role={role} onChange={setRole} onNext={() => setStep(2)} />
                  ) : null}
                  {step === 2 ? (
                    <UseCaseStep
                      selected={useCases}
                      onToggle={(value) => toggleSelection(value, setUseCases)}
                      onBack={handleBack}
                      onNext={() => setStep(3)}
                    />
                  ) : null}
                  {step === 3 ? (
                    <ChannelsStep
                      selected={channels}
                      onToggle={(value) => toggleSelection(value, setChannels)}
                      onBack={handleBack}
                      onNext={() =>
                        setStep(referralProgramEnabled ? 4 : 5)
                      }
                    />
                  ) : null}
                  {step === 4 ? (
                    <ReferralCodeStep
                      code={referralCode}
                      onChange={setReferralCode}
                      onBack={handleBack}
                      onContinue={() => {
                        posthog?.capture('referral_code_applied', {
                          referral_code: referralCode,
                        });
                        setStep(5);
                      }}
                      onSkip={() => {
                        posthog?.capture('referral_code_skipped');
                        setReferralCode('');
                        setStep(5);
                      }}
                    />
                  ) : null}
                </AnimatePresence>
              )}
            </div>
          </div>
        </main>

        {step !== 5 ? (
          <aside className="relative hidden w-[40%] shrink-0 overflow-hidden bg-background p-10 lg:flex lg:items-center lg:justify-center">
            <AnimatedGridPattern
              width={40}
              height={40}
              maxOpacity={0.3}
              className="[mask-image:radial-gradient(600px_circle_at_center,white,transparent)] opacity-60 dark:opacity-30"
            />
            <div className="relative z-10 w-full max-w-lg">
              <OnboardingShowcase
                step={step}
                role={role}
                channels={channels}
              />
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
