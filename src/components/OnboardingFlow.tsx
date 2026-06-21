import { forwardRef, useRef, useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useMutation, useAction, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Spinner } from '@/components/ui/spinner';
import { AnimatedBeam } from '@/components/ui/animated-beam';
import { AnimatedGridPattern } from '@/components/ui/animated-grid-pattern';
import { AnimatedList } from '@/components/ui/animated-list';
import { BlurFade } from '@/components/ui/blur-fade';
import {
  AnimatedSpan,
  Terminal as TerminalWindow,
  TypingAnimation,
} from '@/components/ui/terminal';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Check,
  CornerDownLeft,
  Banknote,
  Bot,
  MessageSquare,
  Terminal as TerminalIcon,
  Globe,
  Target,
  Rocket,
  User,
  type LucideIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SiInstagram, SiMessenger, SiWhatsapp } from 'react-icons/si';
import { cn } from '@/lib/utils';
import {
  type BillingInterval,
  type PlanKey,
} from '../../shared/planCatalog';
import {
  EnterprisePlanAction,
  SubscriptionPlanActionButton,
  SubscriptionPlanPicker,
} from '@/components/SubscriptionPlanPicker';

type Step = 1 | 2 | 3 | 4;

const useCaseOptions: Array<{
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  iconClass: string;
}> = [
  {
    id: 'Support',
    label: 'Support',
    description: 'Answer customer questions instantly',
    icon: MessageSquare,
    iconClass: 'bg-teal-500/10 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400',
  },
  {
    id: 'Sales',
    label: 'Sales',
    description: 'Qualify leads and book demos',
    icon: Banknote,
    iconClass: 'bg-amber-500/10 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400',
  },
  {
    id: 'Knowledge',
    label: 'Knowledge',
    description: 'Search docs and company files',
    icon: Bot,
    iconClass: 'bg-indigo-500/10 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400',
  },
  {
    id: 'Automation',
    label: 'Automation',
    description: 'Run multi-step agent workflows',
    icon: TerminalIcon,
    iconClass: 'bg-violet-500/10 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400',
  },
  {
    id: 'Leads',
    label: 'Leads',
    description: 'Capture and nurture prospects',
    icon: Target,
    iconClass: 'bg-rose-500/10 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
  },
  {
    id: 'Onboarding',
    label: 'Onboarding',
    description: 'Guide new users step by step',
    icon: Rocket,
    iconClass: 'bg-sky-500/10 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400',
  },
];

export function OnboardingFlow() {
  const completeOnboarding = useMutation(api.users.completeOnboarding);
  const createCheckout = useAction(api.stripe.createCheckout);
  const createStripeCustomer = useAction(api.stripe.createStripeCustomer);
  const currentUser = useQuery(api.users.currentUser);

  const [step, setStep] = useState<Step>(1);
  const [role, setRole] = useState('');
  const [useCases, setUseCases] = useState<string[]>([]);
  const [channels, setChannels] = useState<string[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PlanKey | null>(null);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (currentUser?.onboardingAnswers) {
      setRole(currentUser.onboardingAnswers.role || '');
      setUseCases(currentUser.onboardingAnswers.useCase || []);
      setChannels(currentUser.onboardingAnswers.channels || []);
      setSelectedPlan((currentUser.plan as PlanKey) || null);
      setStep(4);
    }
  }, [currentUser]);

  useEffect(() => {
    if (step >= 4 || submitting) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || event.defaultPrevented) return;
      if (event.target instanceof HTMLTextAreaElement) return;

      if (step === 1 && role) {
        event.preventDefault();
        setStep(2);
      } else if (step === 2 && useCases.length > 0) {
        event.preventDefault();
        setStep(3);
      } else if (step === 3 && channels.length > 0) {
        event.preventDefault();
        setStep(4);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [step, role, useCases, channels, submitting]);

  if (currentUser === undefined) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-background">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  const roles = [
    { id: 'Founder', label: 'Founder', sub: 'Building the business from scratch' },
    { id: 'Product Manager', label: 'Product Manager', sub: 'Defining features & roadmap' },
    { id: 'Support Specialist', label: 'Support / Ops', sub: 'Helping customers, resolving issues' },
    { id: 'Software Developer', label: 'Engineer', sub: 'Writing code, integrating APIs' },
    { id: 'Other', label: 'Other', sub: 'Something else entirely' },
  ];

  const channelOptions = [
    { id: 'WhatsApp', label: 'WhatsApp', icon: SiWhatsapp },
    { id: 'Instagram', label: 'Instagram', icon: SiInstagram },
    { id: 'Facebook Messenger', label: 'Messenger', icon: SiMessenger },
    { id: 'Web Widget/API', label: 'Web / API', icon: Globe },
  ];

  const toggleUseCase = (id: string) =>
    setUseCases((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));

  const toggleChannel = (id: string) =>
    setChannels((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));

  const pillButtonClass = (active: boolean) =>
    cn(
      'inline-flex w-full items-center justify-center gap-3 rounded-full border px-6 py-4 text-base font-semibold transition-all duration-150',
      active
        ? 'border-foreground bg-foreground text-background shadow-md'
        : 'border-border bg-card hover:border-foreground/30 hover:bg-accent/40',
    );

  const pillGridClass = 'grid min-h-[13.5rem] grid-cols-2 grid-rows-3 gap-3 sm:gap-4';

  const backButtonClass = (disabled: boolean) =>
    cn(
      'flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all',
      disabled
        ? 'border-border/20 text-muted-foreground/20 cursor-not-allowed'
        : 'border-border hover:bg-accent text-foreground cursor-pointer',
    );

  const nextButtonClass = (enabled: boolean) =>
    cn(
      'flex min-w-[5.5rem] items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-all',
      enabled
        ? 'cursor-pointer bg-foreground text-background hover:bg-foreground/90'
        : 'cursor-not-allowed bg-secondary text-muted-foreground',
    );

  const handleNext = () => { if (step < 4) setStep((p) => (p + 1) as Step); };
  const handleBack = () => {
    if (step > 1 && !submitting) setStep((p) => (p - 1) as Step);
  };

  const handleComplete = async (planKey: PlanKey) => {
    setSubmitting(true);
    try {
      await completeOnboarding({ role, useCase: useCases, channels, plan: planKey });
      toast.success('Workspace created!');
      if (planKey === 'free') {
        toast.loading('Setting up billing account…');
        await createStripeCustomer({ orgId: 'personal' });
        window.location.replace('/workspace');
      } else {
        toast.loading('Redirecting to checkout…');
        const session = await createCheckout({
          plan: planKey,
          interval: billingInterval,
          mode: 'subscription',
          orgId: 'personal',
          cancelPath: '/onboarding',
        });
        if (session?.url) window.location.href = session.url;
        else throw new Error('Failed to start checkout');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  };



  const slideStepMotion = {
    initial: { opacity: 0, x: 16 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -16 },
    transition: { duration: 0.22 },
  };

  const fadeInMotion = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.2 },
  };

  return (
    <div className="flex min-h-[100svh] flex-col bg-background">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-zinc-200 bg-white/75 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#060606]/75">
        <div className="mx-auto flex h-14 max-w-7xl items-center px-5 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-2 text-[15px] text-zinc-900 transition-opacity hover:opacity-80 dark:text-white"
          >
            <img src="/icon.svg" className="size-6 dark:invert" alt="Kilobot" />
            <span className="font-title font-semibold text-[16px] tracking-normal">Kilobot</span>
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 w-full flex-1 overflow-hidden pt-14">

      {/* ── LEFT: Questions ── */}
      <div
        className={cn(
          'relative flex min-w-0 flex-1 flex-col',
          step !== 4 && 'border-r border-border/50',
        )}
      >

        {/* Form content */}
        <div className="flex flex-1 flex-col justify-center px-8 sm:px-14 md:px-20 py-12">
          <div className={cn('mx-auto w-full', step === 4 ? 'max-w-[96rem]' : 'max-w-lg')}>
            {step === 4 ? (
              <motion.div {...fadeInMotion} className="flex flex-col gap-8">
                <div className="flex flex-col gap-5">
                  <h1 className="font-title text-center text-3xl font-semibold tracking-tight sm:text-4xl">
                    Choose your plan
                  </h1>

                  <SubscriptionPlanPicker
                  variant="pricing"
                  density="compact"
                  enterpriseLayout="column"
                  includeEnterprise
                  billingInterval={billingInterval}
                  onBillingIntervalChange={setBillingInterval}
                  disabled={submitting}
                  renderPlanAction={(p) => {
                    if (p.isEnterprise) {
                      return (
                        <EnterprisePlanAction label="Contact our sales" />
                      );
                    }

                    return (
                    <SubscriptionPlanActionButton
                      planId={p.id}
                      disabled={submitting}
                      loading={submitting && selectedPlan === p.id}
                      label={
                        submitting && selectedPlan === p.id ? (
                          <Spinner className="size-3.5" />
                        ) : (
                          p.actionLabel
                        )
                      }
                      onClick={() => {
                        setSelectedPlan(p.id);
                        void handleComplete(p.id);
                      }}
                    />
                    );
                  }}
                />
                </div>

                <div className="flex items-center justify-start">
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={submitting}
                    className={backButtonClass(submitting)}
                  >
                    <ArrowLeft className="size-4" />
                    Back
                  </button>
                </div>
              </motion.div>
            ) : (
            <AnimatePresence mode="wait">

              {/* ── STEP 1: Role ── */}
              {step === 1 && (
                <motion.div key="s1" {...slideStepMotion} className="flex flex-col gap-8">
                  <div className="flex flex-col gap-2">
                    <BlurFade delay={0.05}>
                      <h1 className="text-3xl font-semibold tracking-tight">What's your role?</h1>
                    </BlurFade>
                    <BlurFade delay={0.08}>
                      <p className="text-sm text-muted-foreground">We'll personalise your workspace defaults around this.</p>
                    </BlurFade>
                  </div>

                  <div className="flex flex-col gap-2">
                    {roles.map((r, i) => {
                      const active = role === r.id;
                      return (
                        <BlurFade key={r.id} delay={0.25 + i * 0.05}>
                          <button
                            type="button"
                            onClick={() => setRole(r.id)}
                            className={cn(
                              'group flex w-full items-center justify-between rounded-xl border px-5 py-3.5 text-left transition-all duration-150',
                              active
                                ? 'border-foreground bg-foreground text-background shadow-md'
                                : 'border-border bg-card hover:border-foreground/30 hover:bg-accent/40'
                            )}
                          >
                            <div>
                              <p className={cn('text-sm font-semibold', active ? 'text-background' : 'text-foreground')}>{r.label}</p>
                              <p className={cn('text-xs mt-0.5', active ? 'text-background/70' : 'text-muted-foreground')}>{r.sub}</p>
                            </div>
                            {active && <Check className="size-4 shrink-0 text-background" />}
                          </button>
                        </BlurFade>
                      );
                    })}
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={!role}
                      className={nextButtonClass(Boolean(role))}
                    >
                      Enter
                      <CornerDownLeft className="size-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── STEP 2: Use Case ── */}
              {step === 2 && (
                <motion.div key="s2" {...slideStepMotion} className="flex flex-col gap-8">
                  <div className="flex flex-col gap-2">
                    <BlurFade delay={0.05}><h1 className="text-3xl font-semibold tracking-tight">Use cases?</h1></BlurFade>
                    <BlurFade delay={0.08}><p className="text-sm text-muted-foreground">Pick all that apply — we'll load the right templates.</p></BlurFade>
                  </div>

                  <div className={pillGridClass}>
                    {useCaseOptions.map((u, i) => {
                      const Icon = u.icon;
                      const active = useCases.includes(u.id);
                      return (
                        <BlurFade key={u.id} delay={0.25 + i * 0.05}>
                          <button
                            type="button"
                            onClick={() => toggleUseCase(u.id)}
                            className={pillButtonClass(active)}
                          >
                            <Icon className="size-5 shrink-0" />
                            {u.label}
                          </button>
                        </BlurFade>
                      );
                    })}
                  </div>

                  {/* Next — inline, bottom-right */}
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleBack}
                      disabled={submitting}
                      className={backButtonClass(submitting)}
                    >
                      <ArrowLeft className="size-4" />
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={useCases.length === 0}
                      className={nextButtonClass(useCases.length > 0)}
                    >
                      Enter
                      <CornerDownLeft className="size-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── STEP 3: Channels ── */}
              {step === 3 && (
                <motion.div key="s3" {...slideStepMotion} className="flex flex-col gap-8">
                  <div className="flex flex-col gap-2">
                    <BlurFade delay={0.05}><h1 className="text-3xl font-semibold tracking-tight">Which channels?</h1></BlurFade>
                    <BlurFade delay={0.08}><p className="text-sm text-muted-foreground">Pick all that apply — you can always add more later.</p></BlurFade>
                  </div>

                  <div className={pillGridClass}>
                    {channelOptions.map((c, i) => {
                      const Icon = c.icon;
                      const active = channels.includes(c.id);
                      return (
                        <BlurFade key={c.id} delay={0.25 + i * 0.05}>
                          <button
                            type="button"
                            onClick={() => toggleChannel(c.id)}
                            className={pillButtonClass(active)}
                          >
                            <Icon className="size-5 shrink-0" />
                            {c.label}
                          </button>
                        </BlurFade>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleBack}
                      disabled={submitting}
                      className={backButtonClass(submitting)}
                    >
                      <ArrowLeft className="size-4" />
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={channels.length === 0}
                      className={nextButtonClass(channels.length > 0)}
                    >
                      Enter
                      <CornerDownLeft className="size-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            )}
          </div>
        </div>


      </div>

      {step !== 4 && (
        <div className="relative hidden w-[40%] shrink-0 overflow-hidden bg-background lg:flex lg:flex-col lg:items-center lg:justify-center lg:p-10">
          <AnimatedGridPattern
            width={40}
            height={40}
            maxOpacity={0.3}
            className="[mask-image:radial-gradient(600px_circle_at_center,white,transparent)] opacity-60 dark:opacity-30"
          />

          <div className="relative z-10 w-full max-w-lg">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="right-1" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="w-full">
                  <RoleSetupTerminal role={role} />
                </motion.div>
              )}
              {step === 2 && (
                <motion.div key="right-2" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="w-full">
                  <UseCaseShowcase />
                </motion.div>
              )}
              {step === 3 && (
                <motion.div key="right-3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="w-full">
                  <ChannelBeamShowcase selected={channels} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

// ── Right-side showcase sub-components ──────────────────────────────────────

function RoleSetupTerminal({ role }: { role: string }) {
  return (
    <TerminalWindow className="w-full">
      <TypingAnimation>&gt; kilobot setup</TypingAnimation>

      <AnimatedSpan className="text-green-600 dark:text-green-400">
        ✔ Account connected
      </AnimatedSpan>

      <AnimatedSpan className="text-green-600 dark:text-green-400">
        ✔ AI agents ready for customer chats
      </AnimatedSpan>

      <AnimatedSpan className="text-green-600 dark:text-green-400">
        ✔ WhatsApp, Instagram, and Messenger prepared
      </AnimatedSpan>

      <AnimatedSpan className="text-green-600 dark:text-green-400">
        ✔ Knowledge base connected
      </AnimatedSpan>

      <AnimatedSpan className="text-blue-600 dark:text-blue-400">
        ℹ 500 free credits added
      </AnimatedSpan>

      <AnimatedSpan className="text-blue-600/80 dark:text-blue-400/80">
        Enough to see if this actually works
      </AnimatedSpan>

      <AnimatedSpan className={role ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}>
        {role
          ? `✔ Role set: ${role}`
          : '⏳ Pick your role on the left'}
      </AnimatedSpan>

      <TypingAnimation className="text-muted-foreground">
        {role
          ? 'Setup complete. Hit next when you are ready.'
          : 'Choose the role that best matches what you do.'}
      </TypingAnimation>
    </TerminalWindow>
  );
}

function UseCaseShowcase() {
  return (
    <div className="flex w-full flex-col">
      <AnimatedList delay={1200} className="w-full gap-3">
        {useCaseOptions.map((item) => (
          <UseCaseCard key={item.id} item={item} />
        ))}
      </AnimatedList>
    </div>
  );
}

function UseCaseCard({ item }: { item: (typeof useCaseOptions)[number] }) {
  const Icon = item.icon;

  return (
    <figure
      className="relative mx-auto min-h-fit w-full max-w-[400px] overflow-hidden rounded-2xl border border-border/60 bg-card p-4 shadow-sm"
    >
      <div className="flex flex-row items-center gap-3">
        <div
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-xl',
            item.iconClass,
          )}
        >
          <Icon className="size-[18px]" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex flex-col overflow-hidden">
          <figcaption className="truncate text-sm font-semibold text-foreground">
            {item.label}
          </figcaption>
          <p className="truncate text-sm text-muted-foreground">{item.description}</p>
        </div>
      </div>
    </figure>
  );
}

const BeamCircle = forwardRef<
  HTMLDivElement,
  { className?: string; children?: React.ReactNode; selected?: boolean }
>(({ className, children, selected }, ref) => (
  <div
    ref={ref}
    className={cn(
      'z-10 flex size-12 items-center justify-center rounded-full border-2 bg-white p-3 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)] transition-all',
      selected ? 'border-foreground ring-2 ring-foreground/20' : 'border-border',
      className,
    )}
  >
    {children}
  </div>
));
BeamCircle.displayName = 'BeamCircle';

function ChannelBeamShowcase({ selected }: { selected: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const kilobotRef = useRef<HTMLDivElement>(null);
  const whatsappRef = useRef<HTMLDivElement>(null);
  const instagramRef = useRef<HTMLDivElement>(null);
  const messengerRef = useRef<HTMLDivElement>(null);
  const webRef = useRef<HTMLDivElement>(null);

  const isSelected = (id: string) => selected.includes(id);
  const beamOpacity = (id: string) => (selected.length === 0 || isSelected(id) ? 0.2 : 0.08);

  return (
    <div
      ref={containerRef}
      className="relative flex h-[500px] w-full items-center justify-center overflow-hidden p-6"
    >
      <div className="flex size-full max-w-lg flex-row items-stretch justify-between gap-10">
        <div className="flex flex-col justify-center">
          <BeamCircle ref={userRef} className="size-14 p-3.5">
            <User className="size-6 text-foreground" strokeWidth={2} />
          </BeamCircle>
        </div>

        <div className="flex flex-col justify-center">
          <BeamCircle ref={kilobotRef} className="size-16 p-3">
            <img src="/icon.svg" alt="Kilobot" className="size-full" />
          </BeamCircle>
        </div>

        <div className="flex flex-col justify-center gap-3">
          <BeamCircle ref={whatsappRef} selected={isSelected('WhatsApp')} className="size-16 p-3.5">
            <SiWhatsapp className="size-7 shrink-0 text-[#25D366]" />
          </BeamCircle>
          <BeamCircle ref={instagramRef} selected={isSelected('Instagram')} className="size-16 p-3.5">
            <SiInstagram className="size-7 shrink-0 text-[#E4405F]" />
          </BeamCircle>
          <BeamCircle ref={messengerRef} selected={isSelected('Facebook Messenger')} className="size-16 p-3.5">
            <SiMessenger className="size-7 shrink-0 text-[#0866FF]" />
          </BeamCircle>
          <BeamCircle ref={webRef} selected={isSelected('Web Widget/API')} className="size-16 p-3.5">
            <Globe className="size-7 shrink-0 text-foreground" />
          </BeamCircle>
        </div>
      </div>

      <AnimatedBeam
        containerRef={containerRef}
        fromRef={userRef}
        toRef={kilobotRef}
        duration={3}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={kilobotRef}
        toRef={whatsappRef}
        duration={3}
        pathOpacity={beamOpacity('WhatsApp')}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={kilobotRef}
        toRef={instagramRef}
        duration={3}
        pathOpacity={beamOpacity('Instagram')}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={kilobotRef}
        toRef={messengerRef}
        duration={3}
        pathOpacity={beamOpacity('Facebook Messenger')}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={kilobotRef}
        toRef={webRef}
        duration={3}
        pathOpacity={beamOpacity('Web Widget/API')}
      />
    </div>
  );
}
