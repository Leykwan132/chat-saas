import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@workos-inc/authkit-react';
import { useMutation, useQuery } from 'convex/react';
import { Link, Navigate, useNavigate } from 'react-router';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Bot,
  BookOpen,
  Check,
  CornerDownLeft,
  Gamepad2,
  Mail,
  Banknote,
  type LucideIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Spinner } from '@/components/ui/spinner';
import { AnimatedGridPattern } from '@/components/ui/animated-grid-pattern';
import { BlurFade } from '@/components/ui/blur-fade';
import {
  AnimatedSpan,
  Terminal as TerminalWindow,
  TypingAnimation,
} from '@/components/ui/terminal';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { AGENT_TEMPLATES, type AgentTemplateKey } from '@/lib/agentTemplates';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RequireOrganization } from '@/components/RequireOrganization';
import { ModelPicker } from '@/components/ModelPicker';
import { cn } from '@/lib/utils';
import { PixelImage } from '@/components/ui/pixel-image';
import { TypingAnimation as LoopingTypingAnimation } from '@/components/ui/typing-animation';

const RECOMMENDED_MODEL = 'deepseek/deepseek-v4-flash';

const AGENT_CREATED_IMAGE = 'https://picsum.photos/seed/agent-created/800/800';

const CREATING_AGENT_PHRASES = [
  'Cooking your agent…',
  'Preparing your agent…',
  'Building your agent…',
  'Training your agent…',
  'Polishing your agent…',
  'Crafting your agent…',
];

type Step = 1 | 2 | 3 | 4;

const STEP_COPY: Record<1 | 2 | 4, { title: string; subtitle: string }> = {
  1: {
    title: 'Name your agent',
    subtitle: '',
  },
  2: {
    title: 'Choose role & model',
    subtitle: '',
  },
  4: {
    title: 'Your agent is ready.',
    subtitle: 'Choose how you want to get started.',
  },
};

const templateOptions: Array<{
  key: AgentTemplateKey;
  icon: LucideIcon;
  description: string;
}> = [
  {
    key: 'blank',
    icon: Bot,
    description: 'Flexible assistant for custom instructions.',
  },
  {
    key: 'sales',
    icon: Banknote,
    description: 'Qualify leads and drive next steps.',
  },
  {
    key: 'support',
    icon: Mail,
    description: 'Resolve customer issues with care.',
  },
];

export default function CreateAgentPage() {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-background">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <RequireOrganization>
      <CreateAgentForm />
    </RequireOrganization>
  );
}

function CreateAgentForm() {
  const navigate = useNavigate();
  const createAgent = useMutation(api.agents.create);
  const enabledModels = useQuery(api.llm.modelPricing.listEnabled);

  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState('');
  const [templateKey, setTemplateKey] = useState<AgentTemplateKey>('blank');
  const [model, setModel] = useState('');
  const [createdAgentId, setCreatedAgentId] = useState<Id<'agents'> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creatingPhase, setCreatingPhase] = useState(0);
  const createStartedRef = useRef(false);
  useEffect(() => {
    if (!enabledModels || enabledModels.length === 0 || model) return;
    const recommended = enabledModels.find((m) => m.value === RECOMMENDED_MODEL);
    setModel(recommended?.value ?? enabledModels[0].value);
  }, [enabledModels, model]);

  useEffect(() => {
    if (step !== 3 || createStartedRef.current) return;
    createStartedRef.current = true;
    setError(null);
    setCreatingPhase(0);

    const trimmedName = name.trim();
    const timers = [
      window.setTimeout(() => setCreatingPhase(1), 700),
      window.setTimeout(() => setCreatingPhase(2), 1400),
      window.setTimeout(() => {
        void (async () => {
          if (!trimmedName || !model.trim()) {
            setError('Agent name and model are required');
            setStep(2);
            createStartedRef.current = false;
            return;
          }

          try {
            const agentId = await createAgent({
              name: trimmedName,
              model,
              systemPrompt: AGENT_TEMPLATES[templateKey].prompt,
              templateKey,
            });
            setCreatedAgentId(agentId);
            setCreatingPhase(3);
            toast.success(`"${trimmedName}" created successfully`);
            window.setTimeout(() => setStep(4), 700);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to create agent');
            setStep(2);
            createStartedRef.current = false;
          }
        })();
      }, 2100),
    ];

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when entering step 3
  }, [step]);

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

  const recommendedModel = enabledModels?.find((m) => m.value === RECOMMENDED_MODEL);

  const goToNextStep = () => {
    if (step === 1 && name.trim()) setStep(2);
    else if (step === 2 && name.trim() && model.trim()) setStep(3);
  };

  useEffect(() => {
    if (step !== 2) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;

      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA' || target.tagName === 'A') return;
      if (target.closest('[role="dialog"], [role="listbox"]')) return;
      if (
        target.tagName === 'BUTTON' &&
        (target as HTMLButtonElement).type !== 'submit'
      ) {
        return;
      }
      if (!name.trim() || !model.trim()) return;

      e.preventDefault();
      setStep(3);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [step, name, model]);

  const contentMaxWidth =
    step === 3 ? 'max-w-2xl' : step === 2 ? 'max-w-lg' : 'max-w-md';

  const headerStepLabel =
    step === 3
      ? 'Creating agent…'
      : step === 4
        ? null
        : `Step ${step} of 2`;

  return (
    <div className="flex min-h-[100svh] flex-col bg-background">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-zinc-200 bg-white/75 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#060606]/75">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5 sm:px-6">
          <Link
            to="/workspace"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <ArrowLeft className="size-4" />
            Workspace
          </Link>
          {headerStepLabel ? (
            <span className="text-xs font-medium text-muted-foreground">{headerStepLabel}</span>
          ) : null}
        </div>
      </header>

      <div className="flex min-h-0 w-full flex-1 overflow-hidden pt-14">
        <div
          className={cn(
            'relative flex min-h-0 min-w-0 flex-1 flex-col',
            step !== 3 && 'border-r border-border/50',
          )}
        >
          <div
            className={cn(
              'flex min-h-0 flex-1 flex-col px-8 sm:px-14 md:px-20',
              step === 4 ? 'items-center justify-center py-8' : 'justify-center py-12',
            )}
          >
            <div
              className={cn(
                step === 4 ? 'flex w-full justify-center' : cn('mx-auto w-full', contentMaxWidth),
              )}
            >
              {step === 3 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col items-center gap-10 text-center"
                >
                  <div className="flex flex-col gap-3">
                    <h1 className="min-h-10 pb-0.5 text-3xl leading-normal font-semibold tracking-tight sm:text-4xl md:text-5xl">
                      <LoopingTypingAnimation
                        words={CREATING_AGENT_PHRASES}
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
                      Setting up {name.trim() || 'your agent'} — this only takes a moment.
                    </p>
                  </div>
                  <CreatingProgressList phase={creatingPhase} />
                  {error && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}
                </motion.div>
              ) : step === 4 && createdAgentId ? (
                <AgentCreatedSuccessPanel
                  onTrain={() =>
                    navigate(`/dashboard/${createdAgentId}/knowledge-base/web`)
                  }
                  onPlayground={() =>
                    navigate(`/dashboard/${createdAgentId}/playground`)
                  }
                />
              ) : (
                <>
              {error && (
                <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <AnimatePresence mode="wait">
                {step === 1 && (
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
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium">Agent name</span>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Sales Assistant"
                        autoFocus
                        className="h-12 text-base"
                      />
                      <span className="text-sm text-muted-foreground">
                        You can always change it later.
                      </span>
                    </label>
                    <div className="flex items-center justify-between">
                      <Link to="/workspace" className={backButtonClass(false)}>
                        <ArrowLeft className="size-4" />
                        Back
                      </Link>
                      <button
                        type="submit"
                        disabled={!name.trim()}
                        className={nextButtonClass(Boolean(name.trim()))}
                      >
                        Enter
                        <CornerDownLeft className="size-4" />
                      </button>
                    </div>
                  </motion.form>
                )}

                {step === 2 && (
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

                    <div className="flex w-full max-w-md flex-col gap-8">
                      <div className="flex flex-col gap-3">
                        <span className="text-sm font-medium">Role</span>
                        <div className="grid w-full grid-cols-3 gap-3">
                          {templateOptions.map(({ key, icon: Icon, description }) => {
                            const template = AGENT_TEMPLATES[key];
                            const active = templateKey === key;
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => setTemplateKey(key)}
                                className="text-left"
                              >
                                <div
                                  className={cn(
                                    'relative flex aspect-[5/7] w-full flex-col rounded-lg border bg-card px-3 py-4 transition-colors',
                                    active
                                      ? 'border-foreground bg-accent/40'
                                      : 'border-border hover:border-foreground/35 hover:bg-accent/20',
                                  )}
                                >
                                  {active && (
                                    <Check className="absolute right-2.5 top-2.5 size-3.5 text-foreground" />
                                  )}
                                  <div className="flex flex-1 items-start">
                                    <Icon
                                      className={cn(
                                        'size-9 stroke-[1.5]',
                                        active
                                          ? 'text-foreground'
                                          : 'text-muted-foreground/45',
                                      )}
                                    />
                                  </div>
                                  <div className="space-y-1 text-left">
                                    <p className="text-xs font-semibold leading-tight text-foreground">
                                      {template.label}
                                    </p>
                                    <p className="line-clamp-2 text-[10px] leading-4 text-muted-foreground">
                                      {description}
                                    </p>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <span className="text-sm font-medium">Model</span>
                        <ModelPicker
                          models={enabledModels}
                          value={model}
                          onChange={setModel}
                          disabled={!enabledModels || enabledModels.length === 0}
                          className="w-full"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className={backButtonClass(false)}
                        >
                          <ArrowLeft className="size-4" />
                          Back
                        </button>
                        <button
                          type="submit"
                          disabled={!name.trim() || !model.trim()}
                          className={nextButtonClass(Boolean(name.trim() && model.trim()))}
                        >
                          Enter
                          <CornerDownLeft className="size-4" />
                        </button>
                      </div>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
                </>
              )}
            </div>
          </div>
        </div>

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
                <motion.div
                  key="right-1"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                  className="w-full"
                >
                  <NameSetupTerminal name={name} />
                </motion.div>
              )}
              {step === 2 && (
                <motion.div
                  key="right-2"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                  className="w-full"
                >
                  <RoleModelShowcase
                    name={name.trim()}
                    templateKey={templateKey}
                    modelLabel={recommendedModel?.label}
                  />
                </motion.div>
              )}
              {step === 3 && (
                <motion.div
                  key="right-3"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                  className="w-full"
                >
                  <CreatingTerminal
                    name={name.trim()}
                    phase={creatingPhase}
                    templateLabel={AGENT_TEMPLATES[templateKey].label}
                  />
                </motion.div>
              )}
              {step === 4 && (
                <motion.div
                  key="right-4"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                  className="w-full"
                >
                  <AgentReadyTerminal name={name.trim()} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function AgentCreatedSuccessPanel({
  onTrain,
  onPlayground,
}: {
  onTrain: () => void;
  onPlayground: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.22 }}
      className="flex w-max max-w-full flex-col items-center gap-6 text-center"
    >
      <LoopingTypingAnimation
        as="h1"
        startOnView={false}
        showCursor={false}
        typeSpeed={45}
        className="whitespace-nowrap text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl"
      >
        Your agent is ready.
      </LoopingTypingAnimation>

      <PixelImage
        src={AGENT_CREATED_IMAGE}
        customGrid={{ rows: 4, cols: 6 }}
        grayscaleAnimation
        className="size-72 shrink-0 sm:size-80"
      />

      <div className="flex flex-row flex-nowrap items-center justify-center gap-2.5">
        <Button type="button" className="h-10 shrink-0 gap-2 px-4" onClick={onTrain}>
          <BookOpen className="size-4 shrink-0" />
          Train your agent
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10 shrink-0 gap-2 px-4"
          onClick={onPlayground}
        >
          <Gamepad2 className="size-4 shrink-0" />
          Try in Playground
        </Button>
      </div>
    </motion.div>
  );
}

function StepHeading({ step, centered }: { step: 1 | 2 | 4; centered?: boolean }) {
  const copy = STEP_COPY[step];

  return (
    <div className={cn('flex flex-col gap-2', centered && 'items-center text-center')}>
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
    { label: 'Creating agent', done: phase >= 1 },
    { label: 'Applying role & model', done: phase >= 2 },
    { label: 'Preparing knowledge base', done: phase >= 3 },
    { label: 'Agent ready', done: phase >= 3 },
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

function NameSetupTerminal({ name }: { name: string }) {
  const displayName = name.trim() || 'Your Agent';

  return (
    <TerminalWindow className="w-full">
      <TypingAnimation>&gt; kilobot agent create</TypingAnimation>
      <AnimatedSpan className="text-green-600 dark:text-green-400">
        ✔ Workspace ready
      </AnimatedSpan>
      <AnimatedSpan
        className={
          name.trim()
            ? 'text-green-600 dark:text-green-400'
            : 'text-amber-600 dark:text-amber-400'
        }
      >
        {name.trim() ? `✔ Name set: ${displayName}` : '⏳ Waiting for agent name…'}
      </AnimatedSpan>
      <AnimatedSpan className="text-muted-foreground">
        {name.trim()
          ? 'Next up — choose a role and model.'
          : 'Give your agent a name.'}
      </AnimatedSpan>
    </TerminalWindow>
  );
}

function RoleModelShowcase({
  name,
  templateKey,
  modelLabel,
}: {
  name: string;
  templateKey: AgentTemplateKey;
  modelLabel?: string;
}) {
  const template = AGENT_TEMPLATES[templateKey];
  const displayName = name || 'Your Agent';

  return (
    <TerminalWindow className="w-full">
      <TypingAnimation>&gt; kilobot configure role</TypingAnimation>
      <AnimatedSpan className="text-green-600 dark:text-green-400">
        ✔ Agent: {displayName}
      </AnimatedSpan>
      <AnimatedSpan className="text-green-600 dark:text-green-400">
        ✔ Role: {template.label}
      </AnimatedSpan>
      <AnimatedSpan className="text-muted-foreground">{template.description}</AnimatedSpan>
      <AnimatedSpan className="text-green-600 dark:text-green-400">
        ✔ Model: {modelLabel ?? 'Selected'}
      </AnimatedSpan>
      <AnimatedSpan className="text-blue-600 dark:text-blue-400">
        ℹ You can train or test your agent next
      </AnimatedSpan>
      <TypingAnimation className="text-muted-foreground">
        Press Enter when you are ready.
      </TypingAnimation>
    </TerminalWindow>
  );
}

function CreatingTerminal({
  name,
  phase,
  templateLabel,
}: {
  name: string;
  phase: number;
  templateLabel: string;
}) {
  return (
    <TerminalWindow className="w-full">
      <TypingAnimation>&gt; kilobot agent deploy</TypingAnimation>
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
        {phase >= 2 ? `✔ ${templateLabel} role applied` : '⏳ Applying role & model…'}
      </AnimatedSpan>
      <AnimatedSpan
        className={
          phase >= 3 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
        }
      >
        {phase >= 3 ? '✔ Agent record saved' : '⏳ Saving agent…'}
      </AnimatedSpan>
      <AnimatedSpan
        className={
          phase >= 3 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
        }
      >
        {phase >= 3 ? '✔ Ready to go' : '⏳ Almost there…'}
      </AnimatedSpan>
      {phase < 3 && (
        <div className="flex items-center gap-2 px-4 pb-2 text-muted-foreground">
          <Spinner className="size-4" />
          <span className="text-xs">Please wait…</span>
        </div>
      )}
    </TerminalWindow>
  );
}

function AgentReadyTerminal({ name }: { name: string }) {
  return (
    <TerminalWindow className="w-full">
      <TypingAnimation>&gt; kilobot agent ready</TypingAnimation>
      <AnimatedSpan className="text-green-600 dark:text-green-400">
        ✔ {name} is live
      </AnimatedSpan>
      <AnimatedSpan className="text-green-600 dark:text-green-400">
        ✔ Role and model configured
      </AnimatedSpan>
      <AnimatedSpan className="text-blue-600 dark:text-blue-400">
        ℹ Train with knowledge or try the playground
      </AnimatedSpan>
      <TypingAnimation className="text-muted-foreground">
        Pick your next step on the left.
      </TypingAnimation>
    </TerminalWindow>
  );
}
