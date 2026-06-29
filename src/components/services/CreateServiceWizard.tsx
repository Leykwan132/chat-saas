import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useMutation } from 'convex/react';
import {
  ArrowLeft,
  Check,
  CornerDownLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { AnimatedList } from '@/components/ui/animated-list';
import { AnimatedGridPattern } from '@/components/ui/animated-grid-pattern';
import { BlurFade } from '@/components/ui/blur-fade';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import {
  AnimatedSpan,
  Terminal as TerminalWindow,
  TypingAnimation,
} from '@/components/ui/terminal';
import { TypingAnimation as LoopingTypingAnimation } from '@/components/ui/typing-animation';
import { cn } from '@/lib/utils';
import {
  SERVICE_SECTION_COPY,
  ServiceAssignmentFields,
  ServiceDataCollectionFields,
  ServiceDetailsFields,
  ServiceTimingFields,
} from '@/components/services/serviceFormShared';
import { DataCollectFieldIcon } from '@/components/services/DataCollectFieldIcon';
import {
  assignmentLabel,
  buildServiceMutationArgs,
  DEFAULT_SERVICE_FORM,
  fieldTypePreview,
  type ServiceForm,
  type TeamUserOption,
} from '@/lib/serviceForm';

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const STEP_COPY: Record<1 | 2 | 3 | 4, { title: string; subtitle: string }> = {
  1: SERVICE_SECTION_COPY.details,
  2: SERVICE_SECTION_COPY.timing,
  3: SERVICE_SECTION_COPY.data,
  4: SERVICE_SECTION_COPY.assignment,
};

const CREATING_SERVICE_PHRASES = [
  'Setting up your service…',
  'Configuring booking rules…',
  'Preparing availability checks…',
  'Connecting to your agent…',
  'Almost ready…',
];

interface CreateServiceWizardProps {
  agentId: Id<'agents'>;
  teamUserOptions: TeamUserOption[];
}

export function CreateServiceWizard({
  agentId,
  teamUserOptions,
}: CreateServiceWizardProps) {
  const navigate = useNavigate();
  const createService = useMutation(api.appointmentBooking.services.createService);
  const updateService = useMutation(api.appointmentBooking.services.updateService);

  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<ServiceForm>(DEFAULT_SERVICE_FORM);
  const [error, setError] = useState<string | null>(null);
  const [creatingPhase, setCreatingPhase] = useState(0);
  const [createdServiceId, setCreatedServiceId] = useState<Id<'appointmentServices'> | null>(null);
  const createStartedRef = useRef(false);

  const backHref = `/dashboard/${agentId}/services`;
  const trimmedName = form.name.trim();

  const slideStepMotion = {
    initial: { opacity: 0, x: 16 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -16 },
    transition: { duration: 0.22 },
  };

  const backButtonClass = (disabled: boolean) =>
    cn(
      'flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all',
      disabled
        ? 'cursor-not-allowed border-border/20 text-muted-foreground/20'
        : 'cursor-pointer border-border text-foreground hover:bg-accent',
    );

  const nextButtonClass = (enabled: boolean) =>
    cn(
      'flex min-w-[5.5rem] items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-all',
      enabled
        ? 'cursor-pointer bg-foreground text-background hover:bg-foreground/90'
        : 'cursor-not-allowed bg-secondary text-muted-foreground',
    );

  const goToNextStep = () => {
    if (step === 1 && trimmedName) setStep(2);
    else if (step === 2) setStep(3);
    else if (step === 3) setStep(4);
    else if (step === 4) setStep(5);
  };

  useEffect(() => {
    if (step < 2 || step > 4) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA' || target.tagName === 'A') return;
      if (target.closest('[role="dialog"], [role="listbox"]')) return;
      if (target.tagName === 'BUTTON' && (target as HTMLButtonElement).type !== 'submit') return;
      e.preventDefault();
      setStep((current) => (current < 4 ? ((current + 1) as Step) : current));
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [step]);

  useEffect(() => {
    if (step !== 5 || createStartedRef.current) return;
    createStartedRef.current = true;
    setError(null);
    setCreatingPhase(0);

    const timers = [
      window.setTimeout(() => setCreatingPhase(1), 700),
      window.setTimeout(() => setCreatingPhase(2), 1400),
      window.setTimeout(() => {
        void (async () => {
          if (!trimmedName) {
            setError('Service name is required');
            setStep(1);
            createStartedRef.current = false;
            return;
          }

          try {
            const serviceId = await createService({
              agentId,
              name: trimmedName,
            });
            await updateService({
              serviceId,
              ...buildServiceMutationArgs({ ...form, name: trimmedName }),
            });
            setCreatedServiceId(serviceId);
            setCreatingPhase(3);
            toast.success(`"${trimmedName}" created successfully`);
            window.setTimeout(() => setStep(6), 700);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to create service');
            setStep(4);
            createStartedRef.current = false;
          }
        })();
      }, 2100),
    ];

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when entering step 5
  }, [step]);

  const headerStepLabel =
    step === 5 ? 'Creating service…' : step === 6 ? null : `Step ${step} of 4`;

  const contentMaxWidth =
    step === 5 ? 'max-w-2xl' : step >= 2 && step <= 4 ? 'max-w-lg' : 'max-w-md';

  return (
    <div className="flex min-h-[100svh] flex-col bg-background">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-zinc-200 bg-white/75 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#060606]/75">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5 sm:px-6">
          <Link
            to={backHref}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <ArrowLeft className="size-4" />
            Services
          </Link>
          {headerStepLabel ? (
            <span className="text-xs font-medium text-muted-foreground">{headerStepLabel}</span>
          ) : null}
        </div>
      </header>

      <div className="flex min-h-0 w-full flex-1 overflow-hidden pt-14">
        <div
          className={cn(
            'relative flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto',
            step !== 5 && step !== 6 && 'border-r border-border/50',
          )}
        >
          <div
            className={cn(
              'flex min-h-0 flex-1 flex-col px-8 sm:px-14 md:px-20',
              step === 6 ? 'items-center justify-center py-8' : 'justify-center py-12',
            )}
          >
            <div
              className={cn(
                step === 6 ? 'flex w-full justify-center' : cn('mx-auto w-full', contentMaxWidth),
              )}
            >
              {step === 5 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col items-center gap-10 text-center"
                >
                  <div className="flex flex-col gap-3">
                    <h1 className="min-h-10 pb-0.5 text-3xl leading-normal font-semibold tracking-tight sm:text-4xl md:text-5xl">
                      <LoopingTypingAnimation
                        words={CREATING_SERVICE_PHRASES}
                        loop
                        as="span"
                        startOnView={false}
                        showCursor={false}
                        typeSpeed={45}
                        deleteSpeed={28}
                        pauseDelay={1800}
                        className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl"
                      />
                    </h1>
                    <p className="text-base text-muted-foreground sm:text-lg">
                      Setting up {trimmedName || 'your service'} — this only takes a moment.
                    </p>
                  </div>
                  <CreatingProgressList phase={creatingPhase} />
                  {error ? (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      {error}
                    </div>
                  ) : null}
                </motion.div>
              ) : step === 6 && createdServiceId ? (
                <ServiceCreatedSuccessPanel
                  serviceName={trimmedName}
                  onBack={() => navigate(backHref)}
                />
              ) : (
                <>
                  {error ? (
                    <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      {error}
                    </div>
                  ) : null}

                  <AnimatePresence mode="wait">
                    {step === 1 ? (
                      <motion.form
                        key="s1"
                        {...slideStepMotion}
                        className="flex flex-col gap-8"
                        onSubmit={(e) => {
                          e.preventDefault();
                          goToNextStep();
                        }}
                      >
                        <StepHeading step={1} />
                        <ServiceDetailsFields form={form} setForm={setForm} />

                        <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2.5">
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            <span className="font-medium text-foreground">Note: </span>
                            Be as accurate as possible, as this will affect the performance of the AI.
                          </p>
                        </div>

                        <div className="flex items-center justify-between">
                          <Link to={backHref} className={backButtonClass(false)}>
                            <ArrowLeft className="size-4" />
                            Back
                          </Link>
                          <button
                            type="submit"
                            disabled={!trimmedName}
                            className={nextButtonClass(Boolean(trimmedName))}
                          >
                            Enter
                            <CornerDownLeft className="size-4" />
                          </button>
                        </div>
                      </motion.form>
                    ) : null}

                    {step === 2 ? (
                      <motion.form
                        key="s2"
                        {...slideStepMotion}
                        className="flex flex-col gap-8"
                        onSubmit={(e) => {
                          e.preventDefault();
                          goToNextStep();
                        }}
                      >
                        <StepHeading step={2} />

                        <div className="flex w-full flex-col gap-6">
                          <ServiceTimingFields form={form} setForm={setForm} />

                          <WizardStepNav
                            onBack={() => setStep(1)}
                            backButtonClass={backButtonClass}
                            nextButtonClass={nextButtonClass}
                            canContinue
                          />
                        </div>
                      </motion.form>
                    ) : null}

                    {step === 3 ? (
                      <motion.form
                        key="s3"
                        {...slideStepMotion}
                        className="flex flex-col gap-8"
                        onSubmit={(e) => {
                          e.preventDefault();
                          goToNextStep();
                        }}
                      >
                        <StepHeading step={3} />

                        <div className="flex w-full flex-col gap-6">
                          <ServiceDataCollectionFields form={form} setForm={setForm} />

                          <WizardStepNav
                            onBack={() => setStep(2)}
                            backButtonClass={backButtonClass}
                            nextButtonClass={nextButtonClass}
                            canContinue
                          />
                        </div>
                      </motion.form>
                    ) : null}

                    {step === 4 ? (
                      <motion.form
                        key="s4"
                        {...slideStepMotion}
                        className="flex flex-col gap-8"
                        onSubmit={(e) => {
                          e.preventDefault();
                          goToNextStep();
                        }}
                      >
                        <StepHeading step={4} />

                        <div className="flex w-full flex-col gap-6">
                          <ServiceAssignmentFields
                            form={form}
                            setForm={setForm}
                            teamUserOptions={teamUserOptions}
                          />

                          <div className="flex items-center justify-between rounded-xl border border-border p-4">
                            <div>
                              <h3 className="text-sm font-semibold text-foreground">Enable right away</h3>
                              <p className="text-xs text-muted-foreground">
                                Offer this service in chat immediately after creation.
                              </p>
                            </div>
                            <Switch
                              checked={form.isActive}
                              onCheckedChange={(checked) =>
                                setForm((prev) => ({ ...prev, isActive: checked }))
                              }
                              className="data-[state=checked]:bg-emerald-600"
                            />
                          </div>

                          <WizardStepNav
                            onBack={() => setStep(3)}
                            backButtonClass={backButtonClass}
                            nextButtonClass={nextButtonClass}
                            canContinue
                            submitLabel="Create service"
                          />
                        </div>
                      </motion.form>
                    ) : null}
                  </AnimatePresence>
                </>
              )}
            </div>
          </div>
        </div>

        <div
          className={cn(
            'relative hidden w-[40%] shrink-0 overflow-hidden bg-background lg:flex lg:flex-col lg:items-center lg:justify-center lg:p-10',
            step === 6 && 'lg:hidden',
          )}
        >
          <AnimatedGridPattern
            width={40}
            height={40}
            maxOpacity={0.3}
            className="[mask-image:radial-gradient(600px_circle_at_center,white,transparent)] opacity-60 dark:opacity-30"
          />

          <div className="relative z-10 w-full max-w-lg">
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div
                  key="right-1"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                  className="w-full"
                >
                  <NameSetupTerminal name={form.name} />
                </motion.div>
              ) : null}
              {step === 2 ? (
                <motion.div
                  key="right-2"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                  className="w-full"
                >
                  <TimingSetupTerminal form={form} />
                </motion.div>
              ) : null}
              {step === 3 ? (
                <motion.div
                  key="right-3"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                  className="mx-auto w-full max-w-xs"
                >
                  <DataCollectionPreview form={form} />
                </motion.div>
              ) : null}
              {step === 4 ? (
                <motion.div
                  key="right-4"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                  className="w-full"
                >
                  <AssignmentSetupTerminal form={form} />
                </motion.div>
              ) : null}
              {step === 5 ? (
                <motion.div
                  key="right-5"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                  className="w-full"
                >
                  <CreatingTerminal name={trimmedName} phase={creatingPhase} />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepHeading({ step }: { step: 1 | 2 | 3 | 4 }) {
  const copy = STEP_COPY[step];

  return (
    <div className="flex flex-col gap-2">
      <BlurFade delay={0.02}>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{copy.title}</h1>
      </BlurFade>
      {copy.subtitle ? (
        <BlurFade delay={0.05}>
          <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
        </BlurFade>
      ) : null}
    </div>
  );
}

function CreatingProgressList({ phase }: { phase: number }) {
  const items = [
    { label: 'Creating service', done: phase >= 1 },
    { label: 'Applying booking rules', done: phase >= 2 },
    { label: 'Connecting to your agent', done: phase >= 3 },
    { label: 'Service ready', done: phase >= 3 },
  ];

  return (
    <ul className="mx-auto flex w-fit flex-col gap-4">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-4 text-base sm:text-lg">
          <span
            className={cn(
              'flex size-8 items-center justify-center rounded-full border',
              item.done
                ? 'border-foreground bg-foreground text-background'
                : 'border-border text-muted-foreground',
            )}
          >
            {item.done ? <Check className="size-4" /> : <Spinner className="size-4" />}
          </span>
          <span className={item.done ? 'text-foreground' : 'text-muted-foreground'}>
            {item.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ServiceCreatedSuccessPanel({
  serviceName,
  onBack,
}: {
  serviceName: string;
  onBack: () => void;
}) {
  const displayName = serviceName.trim() || 'this service';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.22 }}
      className="flex max-w-xl flex-col items-center gap-6 text-center"
    >
      <LoopingTypingAnimation
        as="h1"
        startOnView={false}
        showCursor={false}
        typeSpeed={45}
        className="whitespace-nowrap text-2xl font-semibold tracking-normal sm:text-4xl md:text-5xl"
      >
        Your service is ready.
      </LoopingTypingAnimation>

      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        Your AI is ready to book {displayName} for your customers.
      </p>

      <Button type="button" className="h-10 shrink-0 gap-2 px-4" onClick={onBack}>
        <ArrowLeft className="size-4 shrink-0" />
        Back to Services
      </Button>
    </motion.div>
  );
}

function NameSetupTerminal({ name }: { name: string }) {
  const displayName = name.trim() || 'Your Service';

  return (
    <TerminalWindow className="w-full">
      <TypingAnimation>&gt; kilobot services create</TypingAnimation>
      <AnimatedSpan className="text-green-600 dark:text-green-400">✔ Agent ready</AnimatedSpan>
      <AnimatedSpan
        className={
          name.trim() ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
        }
      >
        {name.trim() ? `✔ Name set: ${displayName}` : '⏳ Waiting for service name…'}
      </AnimatedSpan>
      <AnimatedSpan className="text-muted-foreground">
        {name.trim()
          ? 'Next up — configure booking rules.'
          : 'Give your service a name.'}
      </AnimatedSpan>
    </TerminalWindow>
  );
}

function TimingSetupTerminal({ form }: { form: ServiceForm }) {
  const displayName = form.name.trim() || 'Your Service';

  return (
    <TerminalWindow className="w-full">
      <TypingAnimation>&gt; kilobot configure timing</TypingAnimation>
      <AnimatedSpan className="text-green-600 dark:text-green-400">✔ Service: {displayName}</AnimatedSpan>
      <AnimatedSpan className="text-green-600 dark:text-green-400">
        ✔ Duration: {form.durationMinutes} min
      </AnimatedSpan>
      <AnimatedSpan className="text-green-600 dark:text-green-400">
        ✔ Gap: {form.bufferMinutes} min
      </AnimatedSpan>
      <AnimatedSpan className="text-green-600 dark:text-green-400">
        {form.preferredTimeEnabled
          ? `✔ Priority times: ${form.preferredTimes.join(', ')}`
          : '○ No priority times set'}
      </AnimatedSpan>
      <TypingAnimation className="text-muted-foreground">Press Enter to continue.</TypingAnimation>
    </TerminalWindow>
  );
}

function DataCollectionPreview({ form }: { form: ServiceForm }) {
  const fieldItems = form.fields
    .filter((field) => field.label.trim())
    .map((field, index) => ({
      id: `${field.key}-${index}`,
      label: field.label.trim(),
      typeLabel: fieldTypePreview(field),
      type: field.type,
    }));

  const listKey = fieldItems.map((item) => item.id).join('|') || 'empty';

  return (
    <div className="w-full">
      {fieldItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-3 py-5 text-center text-sm text-muted-foreground">
          No fields selected yet
        </div>
      ) : (
        <AnimatedList key={listKey} delay={400} className="w-full items-stretch gap-2">
          {fieldItems.map((item) => (
            <div
              key={item.id}
              className="flex w-full items-center gap-2.5 rounded-lg border border-border/70 bg-card/80 px-3 py-2.5"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <DataCollectFieldIcon type={item.type} className="size-3.5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
                <p className="truncate text-xs text-muted-foreground">{item.typeLabel}</p>
              </div>
            </div>
          ))}
        </AnimatedList>
      )}
    </div>
  );
}

function AssignmentSetupTerminal({ form }: { form: ServiceForm }) {
  return (
    <TerminalWindow className="w-full">
      <TypingAnimation>&gt; kilobot configure assignment</TypingAnimation>
      <AnimatedSpan className="text-green-600 dark:text-green-400">
        ✔ Assignment: {assignmentLabel(form.assignmentStrategy)}
      </AnimatedSpan>
      <AnimatedSpan className="text-green-600 dark:text-green-400">
        {form.isActive ? '✔ Enabled right away' : '○ Disabled on create'}
      </AnimatedSpan>
      <TypingAnimation className="text-muted-foreground">Press Enter to create service.</TypingAnimation>
    </TerminalWindow>
  );
}

function CreatingTerminal({ name, phase }: { name: string; phase: number }) {
  return (
    <TerminalWindow className="w-full">
      <TypingAnimation>&gt; kilobot service deploy</TypingAnimation>
      <AnimatedSpan
        className={
          phase >= 1 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
        }
      >
        {phase >= 1 ? `✔ Creating ${name}` : `⏳ Creating ${name}…`}
      </AnimatedSpan>
      <AnimatedSpan
        className={
          phase >= 2 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
        }
      >
        {phase >= 2 ? '✔ Booking rules applied' : '⏳ Applying booking rules…'}
      </AnimatedSpan>
      <AnimatedSpan
        className={
          phase >= 3 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
        }
      >
        {phase >= 3 ? '✔ Service record saved' : '⏳ Saving service…'}
      </AnimatedSpan>
      <AnimatedSpan
        className={phase >= 3 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}
      >
        {phase >= 3 ? '✔ Ready to book' : '⏳ Almost there…'}
      </AnimatedSpan>
      {phase < 3 ? (
        <div className="flex items-center gap-2 px-4 pb-2 text-muted-foreground">
          <Spinner className="size-4" />
          <span className="text-xs">Please wait…</span>
        </div>
      ) : null}
    </TerminalWindow>
  );
}

function WizardStepNav({
  onBack,
  backButtonClass,
  nextButtonClass,
  canContinue,
  submitLabel = 'Enter',
}: {
  onBack: () => void;
  backButtonClass: (disabled: boolean) => string;
  nextButtonClass: (enabled: boolean) => string;
  canContinue: boolean;
  submitLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between border-t border-border/50 pt-4">
      <button type="button" onClick={onBack} className={backButtonClass(false)}>
        <ArrowLeft className="size-4" />
        Back
      </button>
      <button type="submit" disabled={!canContinue} className={nextButtonClass(canContinue)}>
        {submitLabel}
        <CornerDownLeft className="size-4" />
      </button>
    </div>
  );
}
