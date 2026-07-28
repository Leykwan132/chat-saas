import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useAction, useQuery } from 'convex/react';
import { usePostHog } from '@posthog/react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CornerDownLeft,
  GraduationCap,
  HeartPulse,
  Landmark,
  Megaphone,
  Monitor,
  Plus,
  ShoppingCart,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import {
  TEAM_COMPANY_SIZE_OPTIONS,
  TEAM_INDUSTRY_OPTIONS,
  type TeamIndustryId,
} from '../../shared/teamFormOptions';
import { RequireOrganization } from '@/components/RequireOrganization';
import { useActiveTeam } from '@/hooks/useActiveTeam';
import { useAdjustPlan } from '@/components/billing/adjustPlanContext';
import { AnimatedGridPattern } from '@/components/ui/animated-grid-pattern';
import { BlurFade } from '@/components/ui/blur-fade';
import {
  AnimatedSpan,
  Terminal as TerminalWindow,
  TypingAnimation,
} from '@/components/ui/terminal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { getClientTimeZone } from '@/lib/calendarTimeUtils';
import type { Id } from '../../convex/_generated/dataModel';

type Step = 1 | 2 | 3 | 4;

const DEFAULT_RETURN_TO = '/workspace/settings?section=teams';

const INDUSTRY_ICONS: Record<TeamIndustryId, LucideIcon> = {
  Technology: Monitor,
  'E-commerce': ShoppingCart,
  Healthcare: HeartPulse,
  Finance: Landmark,
  Education: GraduationCap,
  Marketing: Megaphone,
  'Professional Services': Briefcase,
  Other: Sparkles,
};

export default function CreateTeamPage() {
  return (
    <RequireOrganization>
      <CreateTeamFlow />
    </RequireOrganization>
  );
}

function CreateTeamFlow() {
  const navigate = useNavigate();
  const posthog = usePostHog();
  const [searchParams] = useSearchParams();
  const { switchTeam } = useActiveTeam();
  const createTeam = useAction(api.organizationsAdmin.createTeamForCurrentUser);
  const canCreateOrgTeam = useQuery(api.teams.canCreateOrgTeam);
  const { openAdjustPlan } = useAdjustPlan();

  const returnTo = searchParams.get('returnTo') ?? DEFAULT_RETURN_TO;

  useEffect(() => {
    if (canCreateOrgTeam === undefined || canCreateOrgTeam.allowed) return;

    if (canCreateOrgTeam.requiresPlanUpgrade) {
      openAdjustPlan();
    } else {
      toast.message(canCreateOrgTeam.reason ?? 'You cannot create a team right now.');
    }

    navigate(returnTo, { replace: true });
  }, [canCreateOrgTeam, navigate, openAdjustPlan, returnTo]);

  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdTeamId, setCreatedTeamId] = useState<Id<'teams'> | null>(null);

  if (canCreateOrgTeam !== undefined && !canCreateOrgTeam.allowed) {
    return null;
  }

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

  const handleBack = () => {
    if (step > 1 && step < 4 && !submitting) setStep((current) => (current - 1) as Step);
  };

  const handleNextFromStep1 = () => {
    if (name.trim().length === 0 || submitting) return;
    setStep(2);
  };

  const handleNextFromStep2 = () => {
    if (!industry || submitting) return;
    setStep(3);
  };

  const handleCreateTeam = async () => {
    const trimmedName = name.trim();
    if (!trimmedName || !industry || !companySize || submitting) return;

    setSubmitting(true);
    try {
      const trimmedDomain = domain.trim();
      const result = await createTeam({
        name: trimmedName,
        domain: trimmedDomain.length > 0 ? trimmedDomain : undefined,
        industry,
        companySize,
        timeZone: getClientTimeZone(),
      });
      await switchTeam({
        teamId: result.teamId as Id<'teams'>,
        workosOrgId: result.organizationId,
      });
      setCreatedTeamId(result.teamId as Id<'teams'>);
      setStep(4);
      posthog?.capture('team_created', { industry, company_size: companySize });
      toast.success(`Created ${result.name}`);
    } catch (err) {
      posthog?.captureException(err);
      toast.error(err instanceof Error ? err.message : 'Could not create team');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToTeams = () => {
    navigate(returnTo);
  };

  const handleInviteTeam = () => {
    if (!createdTeamId) {
      navigate(returnTo);
      return;
    }

    const separator = returnTo.includes('?') ? '&' : '?';
    navigate(`${returnTo}${separator}teamId=${createdTeamId}`);
  };

  useEffect(() => {
    if (step >= 4 || submitting) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || event.defaultPrevented) return;
      if (event.target instanceof HTMLTextAreaElement) return;

      if (step === 1 && name.trim().length > 0) {
        event.preventDefault();
        setStep(2);
      } else if (step === 2 && industry) {
        event.preventDefault();
        setStep(3);
      } else if (step === 3 && companySize) {
        event.preventDefault();
        void handleCreateTeam();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [step, name, industry, companySize, submitting]);

  const industryLabel =
    TEAM_INDUSTRY_OPTIONS.find((option) => option.id === industry)?.label ?? industry;
  const companySizeLabel =
    TEAM_COMPANY_SIZE_OPTIONS.find((option) => option.id === companySize)?.label ?? companySize;

  return (
    <div className="flex min-h-[100svh] flex-col bg-background">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-zinc-200 bg-white/75 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#060606]/75">
        <div className="mx-auto flex h-14 max-w-7xl items-center px-5 sm:px-6">
          <Link
            to={returnTo}
            className="flex items-center gap-2 text-[15px] text-zinc-900 transition-opacity hover:opacity-80 dark:text-white"
          >
            <img src="/icon.svg" className="size-6 dark:invert" alt="Kilobot" />
            <span className="font-title font-semibold text-[16px] tracking-normal">Kilobot</span>
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 w-full flex-1 overflow-hidden pt-14">
        <div className="relative flex min-w-0 flex-1 flex-col border-r border-border/50">
          <div className="flex flex-1 flex-col justify-center px-8 sm:px-14 md:px-20 py-12">
            <div
              className={cn(
                'mx-auto w-full',
                step === 2 ? 'max-w-2xl' : 'max-w-lg',
              )}
            >
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div key="step-1" {...slideStepMotion} className="flex flex-col gap-8">
                    <BlurFade delay={0.05}>
                      <h1 className="text-3xl font-semibold tracking-tight">Your team</h1>
                    </BlurFade>

                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        handleNextFromStep1();
                      }}
                      className="flex flex-col gap-8"
                    >
                      <Input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Acme Inc."
                        autoFocus
                        maxLength={80}
                        disabled={submitting}
                      />

                      <div className="flex flex-col gap-2">
                        <label
                          htmlFor="create-team-domain"
                          className="text-sm font-semibold text-foreground"
                        >
                          Website
                        </label>
                        <Input
                          id="create-team-domain"
                          value={domain}
                          onChange={(event) => setDomain(event.target.value)}
                          placeholder="acme.com (optional)"
                          disabled={submitting}
                          autoComplete="off"
                          spellCheck={false}
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={name.trim().length === 0}
                          className={nextButtonClass(name.trim().length > 0)}
                        >
                          Enter
                          <CornerDownLeft className="size-4" />
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div key="step-2" {...slideStepMotion} className="flex flex-col gap-8">
                    <BlurFade delay={0.05}>
                      <h1 className="text-3xl font-semibold tracking-tight">Select industry</h1>
                    </BlurFade>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {TEAM_INDUSTRY_OPTIONS.map((option, index) => {
                        const active = industry === option.id;
                        const Icon = INDUSTRY_ICONS[option.id];
                        return (
                          <BlurFade key={option.id} delay={0.08 + index * 0.03}>
                            <button
                              type="button"
                              onClick={() => setIndustry(option.id)}
                              className="w-full text-left"
                            >
                              <IndustryCard label={option.label} icon={Icon} active={active} />
                            </button>
                          </BlurFade>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between">
                      <button type="button" onClick={handleBack} className={backButtonClass(submitting)}>
                        <ArrowLeft className="size-4" />
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={handleNextFromStep2}
                        disabled={!industry}
                        className={nextButtonClass(Boolean(industry))}
                      >
                        Enter
                        <CornerDownLeft className="size-4" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div key="step-3" {...slideStepMotion} className="flex flex-col gap-8">
                    <BlurFade delay={0.05}>
                      <h1 className="text-3xl font-semibold tracking-tight">Company size</h1>
                    </BlurFade>

                    <div className="grid grid-cols-2 gap-3">
                      {TEAM_COMPANY_SIZE_OPTIONS.map((option) => {
                        const active = companySize === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setCompanySize(option.id)}
                            className={cn(
                              'rounded-full border px-4 py-3 text-sm font-semibold transition-all duration-150',
                              active
                                ? 'border-foreground bg-foreground text-background shadow-md'
                                : 'border-border bg-card hover:border-foreground/30 hover:bg-accent/40',
                            )}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between">
                      <button type="button" onClick={handleBack} className={backButtonClass(submitting)}>
                        <ArrowLeft className="size-4" />
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleCreateTeam()}
                        disabled={!companySize || submitting}
                        className={nextButtonClass(Boolean(companySize) && !submitting)}
                      >
                        {submitting ? (
                          <>
                            <Spinner className="size-4" />
                            Creating…
                          </>
                        ) : (
                          <>
                            Enter
                            <CornerDownLeft className="size-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 4 && (
                  <motion.div key="step-4" {...slideStepMotion} className="flex flex-col gap-8">
                    <div className="flex flex-col items-start gap-6">
                      <BlurFade delay={0.05}>
                        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                          <span>{name.trim()}</span> is ready.
                        </h1>
                      </BlurFade>
                    </div>

                    <div className="flex items-center justify-start gap-6">
                      <Button
                        type="button"
                        className="h-10 shrink-0 gap-2 px-4"
                        onClick={handleInviteTeam}
                      >
                        <Plus className="size-4 shrink-0" />
                        Invite Members
                      </Button>
                      <button
                        type="button"
                        onClick={handleBackToTeams}
                        className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                      >
                        Skip
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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
                    <TeamSetupTerminal teamName={name.trim()} domain={domain.trim()} />
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
                    <IndustryShowcase selectedIndustry={industry} />
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
                    <TeamSummaryTerminal
                      teamName={name.trim()}
                      domain={domain.trim()}
                      industry={industryLabel}
                      companySize={companySizeLabel}
                      hasCompanySize={Boolean(companySize)}
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
                    <TeamCreatedTerminal
                      teamName={name.trim()}
                      domain={domain.trim()}
                      industry={industryLabel}
                      companySize={companySizeLabel}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamSetupTerminal({ teamName, domain }: { teamName: string; domain: string }) {
  return (
    <TerminalWindow className="w-full">
      <TypingAnimation>&gt; kilobot team create</TypingAnimation>

      <AnimatedSpan className="text-green-600 dark:text-green-400">
        ✔ Personal workspace ready
      </AnimatedSpan>

      <AnimatedSpan className="text-green-600 dark:text-green-400">
        ✔ Shared team workspace prepared
      </AnimatedSpan>

      <AnimatedSpan className={teamName ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}>
        {teamName ? `✔ Team name set: ${teamName}` : '⏳ Waiting for team name'}
      </AnimatedSpan>

      {domain ? (
        <AnimatedSpan className="text-green-600 dark:text-green-400">
          ✔ Domain set: {domain}
        </AnimatedSpan>
      ) : null}

      <TypingAnimation className="text-muted-foreground">
        {teamName
          ? 'Looking good. Press Enter to select an industry.'
          : 'Enter a name for your new team on the left.'}
      </TypingAnimation>
    </TerminalWindow>
  );
}

function IndustryCard({
  label,
  description,
  icon: Icon,
  active,
  className,
}: {
  label: string;
  description?: string;
  icon: LucideIcon;
  active: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex aspect-[5/7] w-full flex-col rounded-lg border px-3 py-3 transition-colors',
        active
          ? 'border-foreground bg-foreground text-background'
          : 'border-border bg-card text-foreground hover:border-foreground/30',
        className,
      )}
    >
      <div className="flex flex-1 items-center justify-center">
        <Icon
          className={cn(
            'size-7 stroke-[1.5]',
            active ? 'text-background' : 'text-muted-foreground',
          )}
        />
      </div>
      <div className="space-y-1 text-center">
        <p className="text-sm font-semibold leading-tight line-clamp-2">{label}</p>
        {description ? (
          <p
            className={cn(
              'line-clamp-2 text-xs leading-snug',
              active ? 'text-background/70' : 'text-muted-foreground',
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function IndustryShowcase({ selectedIndustry }: { selectedIndustry: string }) {
  const option = TEAM_INDUSTRY_OPTIONS.find((item) => item.id === selectedIndustry);
  const Icon = option ? INDUSTRY_ICONS[option.id] : Building2;

  return (
    <div className="flex w-full items-center justify-center py-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={option?.id ?? 'placeholder'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <IndustryCard
            label={option?.label ?? 'Your industry'}
            description={
              option?.description ?? 'Choose a card on the left to preview it here.'
            }
            icon={Icon}
            active={Boolean(option)}
            className="mx-auto w-36 sm:w-40"
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function TeamCreatedTerminal({
  teamName,
  domain,
  industry,
  companySize,
}: {
  teamName: string;
  domain: string;
  industry: string;
  companySize: string;
}) {
  return (
    <TerminalWindow className="w-full">
      <TypingAnimation>&gt; kilobot team ready</TypingAnimation>

      <AnimatedSpan className="text-green-600 dark:text-green-400">
        ✔ {teamName || 'Your team'} created
      </AnimatedSpan>

      {domain ? (
        <AnimatedSpan className="text-green-600 dark:text-green-400">
          ✔ Domain: {domain}
        </AnimatedSpan>
      ) : null}

      {industry ? (
        <AnimatedSpan className="text-green-600 dark:text-green-400">
          ✔ Industry: {industry}
        </AnimatedSpan>
      ) : null}

      {companySize ? (
        <AnimatedSpan className="text-green-600 dark:text-green-400">
          ✔ Company size: {companySize}
        </AnimatedSpan>
      ) : null}

      <AnimatedSpan className="text-green-600 dark:text-green-400">
        ✔ You&apos;re the team owner
      </AnimatedSpan>

      <AnimatedSpan className="text-blue-600 dark:text-blue-400">
        ℹ Invite teammates from team settings
      </AnimatedSpan>

      <TypingAnimation className="text-muted-foreground">
        Invite your team now on the left.
      </TypingAnimation>
    </TerminalWindow>
  );
}

function TeamSummaryTerminal({
  teamName,
  domain,
  industry,
  companySize,
  hasCompanySize,
}: {
  teamName: string;
  domain: string;
  industry: string;
  companySize: string;
  hasCompanySize: boolean;
}) {
  return (
    <TerminalWindow className="w-full">
      <TypingAnimation>&gt; kilobot team configure</TypingAnimation>

      <AnimatedSpan className="text-green-600 dark:text-green-400">
        ✔ Team name: {teamName || '—'}
      </AnimatedSpan>

      {domain ? (
        <AnimatedSpan className="text-green-600 dark:text-green-400">
          ✔ Domain: {domain}
        </AnimatedSpan>
      ) : null}

      <AnimatedSpan className={industry ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}>
        {industry ? `✔ Industry: ${industry}` : '⏳ Select an industry'}
      </AnimatedSpan>

      <AnimatedSpan className={hasCompanySize ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}>
        {hasCompanySize ? `✔ Company size: ${companySize}` : '⏳ Choose company size'}
      </AnimatedSpan>

      <AnimatedSpan className="text-blue-600 dark:text-blue-400">
        ℹ You&apos;ll be added as team admin automatically
      </AnimatedSpan>

      <TypingAnimation className="text-muted-foreground">
        {hasCompanySize
          ? 'Press Enter to create your team.'
          : 'Select a company size on the left.'}
      </TypingAnimation>
    </TerminalWindow>
  );
}
