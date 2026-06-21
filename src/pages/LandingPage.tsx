import { useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@workos-inc/authkit-react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import {
  ArrowRight,
  Check,
  X,
} from 'lucide-react';
import { POST_LOGIN_REDIRECT } from '@/constants';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { BlurFade } from '@/components/ui/blur-fade';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { NumberTicker } from '@/components/ui/number-ticker';



function PrimaryCta({
  hasSession,
  onSignUp,
  label,
}: {
  hasSession: boolean;
  onSignUp: () => void;
  label: string;
}) {
  const className =
    'inline-flex h-11 flex-1 sm:flex-none sm:w-auto items-center justify-center gap-2 rounded-full bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-950 px-4 sm:px-6 text-sm font-semibold transition-colors';

  if (hasSession) {
    return (
      <Link to={POST_LOGIN_REDIRECT} className={className}>
        Dashboard
        <ArrowRight className="size-4" />
      </Link>
    );
  }

  return (
    <button type="button" onClick={onSignUp} className={className}>
      {label}
    </button>
  );
}

const LANDING_DESKTOP_IMAGE = 'https://storage.kilobot.app/kilobot-landing.png';
const LANDING_MOBILE_IMAGE = 'https://storage.kilobot.app/kilobot-mobile.png';
const FEATURE_AI_AGENT_IMAGE = 'https://storage.kilobot.app/AI%20Agent-3.png';
const FEATURE_KB_IMAGE = 'https://storage.kilobot.app/KB-3.png';
const FEATURE_MODELS_IMAGE = 'https://storage.kilobot.app/Models-3.png';

const FEATURE_SHOWCASE_IMAGES = {
  autoBooking: 'https://storage.kilobot.app/AB.png',
  autoLeadAssign: 'https://storage.kilobot.app/ALA.png',
  broadcast: 'https://storage.kilobot.app/BC.png',
  humanEscalation: 'https://storage.kilobot.app/HA.png',
  autoLeadAnalysis: 'https://storage.kilobot.app/CLD.png',
  roleBasedInteraction: 'https://storage.kilobot.app/RBAC.png',
  advancedAnalytics: 'https://storage.kilobot.app/Analytics%20(2).png',
  naturalInteraction: 'https://storage.kilobot.app/NI.png',
} as const;

function FeaturesSection() {
  return (
    <section className="bg-white dark:bg-[#060606] py-24 px-6 sm:py-32 sm:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <SectionHeading
            title="Transform Your Inbox"
            className="mx-auto text-center items-center"
          />
        </div>

        {/* 3 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: AI Lead Temperature */}
          <div className="flex flex-col justify-between rounded-2xl bg-zinc-100/70 dark:bg-zinc-900/40">
            <div className='pt-8 px-8 pb-4'>
              <h3 className="text-lg font-semibold text-zinc-950 dark:text-white mb-2">
                AI Agent
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Auto lead labeling, summaries, auto-booking with date and lead assignment.
              </p>
            </div>
            
            <img
              src={FEATURE_AI_AGENT_IMAGE}
              alt="AI Agent feature"
              className="w-full h-auto"
            />
          </div>

          {/* Card 2: Knowledge Base Sync */}
          <div className="flex flex-col justify-between rounded-2xl bg-zinc-100/70 dark:bg-zinc-900/40">
            <div className='pt-8 px-8'>
              <h3 className="text-lg font-semibold text-zinc-950 dark:text-white mb-2">
                Knowledge Base
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Sync PDFs, websites, or any text info.
              </p>
            </div>

            <img
              src={FEATURE_KB_IMAGE}
              alt="Knowledge base feature"
              className=" w-full h-auto"
            />
          </div>

          {/* Card 3: Custom LLM Routing */}
          <div className="flex flex-col justify-between rounded-2xl bg-zinc-100/70 dark:bg-zinc-900/40">
            <div className='pt-8 px-8'>
              <h3 className="text-lg font-semibold text-zinc-950 dark:text-white mb-2">
                Custom Models
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Choose and deploy custom models on your own.
              </p>
            </div>

            <img
              src={FEATURE_MODELS_IMAGE}
              alt="Custom models feature"
              className=" w-full h-auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

type FeatureItem = {
  id: string;
  tabLabel: string;
  description: string;
  image: string;
};

const FEATURE_ITEMS: FeatureItem[] = [
  {
    id: 'humanLike',
    tabLabel: 'Natural Interaction',
    description:
      'AI that reacts in real time—customers see typing indicators and messages that feel natural, not scripted.',
    image: FEATURE_SHOWCASE_IMAGES.naturalInteraction,
  },
  {
    id: 'calendar',
    tabLabel: 'Auto Booking',
    description:
      'End-to-end booking in chat—check the calendar, confirm the slot, and collect the details you need.',
    image: FEATURE_SHOWCASE_IMAGES.autoBooking,
  },
  {
    id: 'assignment',
    tabLabel: 'Auto Lead Assign',
    description:
      'Assign leads automatically using round robin or load balancing across your team.',
    image: FEATURE_SHOWCASE_IMAGES.autoLeadAssign,
  },
  {
    id: 'scoring',
    tabLabel: 'Auto Lead Analysis',
    description:
      'Analyze customer quality from the conversation—intent, fit, and readiness in real time.',
    image: FEATURE_SHOWCASE_IMAGES.autoLeadAnalysis,
  },
  {
    id: 'outreach',
    tabLabel: 'Broadcast',
    description:
      'Send broadcast campaigns and schedule messages to reach customers at the right time.',
    image: FEATURE_SHOWCASE_IMAGES.broadcast,
  },
  {
    id: 'escalation',
    tabLabel: 'Human Escalation',
    description: 'Detect when a human is needed and escalate with full conversation context.',
    image: FEATURE_SHOWCASE_IMAGES.humanEscalation,
  },
  {
    id: 'access',
    tabLabel: 'Role Based Access Control',
    description: 'Control team access with custom roles and channel permissions.',
    image: FEATURE_SHOWCASE_IMAGES.roleBasedInteraction,
  },
  {
    id: 'advancedAnalytics',
    tabLabel: 'Advanced Analytics',
    description:
      'Understand customer sentiment and discover the most common topics across your conversations.',
    image: FEATURE_SHOWCASE_IMAGES.advancedAnalytics,
  },
];

const FEATURE_COLORS: Record<string, string> = {
  calendar: 'bg-indigo-500 dark:bg-indigo-400',
  assignment: 'bg-blue-500 dark:bg-blue-400',
  outreach: 'bg-violet-500 dark:bg-violet-400',
  escalation: 'bg-amber-500 dark:bg-amber-400',
  scoring: 'bg-orange-500 dark:bg-orange-400',
  access: 'bg-slate-500 dark:bg-slate-400',
  advancedAnalytics: 'bg-cyan-500 dark:bg-cyan-400',
  humanLike: 'bg-emerald-500 dark:bg-emerald-400',
};

function FeatureShowcaseImage({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-auto"
    />
  );
}

function FeatureShowcaseSection() {
  const [activeTab, setActiveTab] = useState(FEATURE_ITEMS[0].id);
  const activeItem = FEATURE_ITEMS.find((item) => item.id === activeTab) ?? FEATURE_ITEMS[0];

  return (
    <section className="bg-white dark:bg-[#060606] py-24 px-6 sm:py-32 sm:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <SectionHeading
            title="Simple, yet powerful"
            className="mx-auto text-center items-center"
          />
        </div>

        {/* Showcase Grid */}
        <div className="grid grid-cols-1 md:grid-cols-[340px_600px] gap-0 items-center justify-center max-w-6xl mx-auto">
          {/* Left Side: Clickable Tab Lists & Sub-solutions */}
          <div className="flex flex-col w-full">
            <div className="flex flex-col gap-2.5 w-full">
              {FEATURE_ITEMS.map((item) => {
                const isActive = item.id === activeTab;
                return (
                  <div key={item.id} className="flex flex-col w-full">
                    <button
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={cn(
                        'flex items-center gap-3.5 w-full text-left py-3 px-1 transition-all duration-100 cursor-pointer bg-transparent border-none outline-none focus:outline-none',
                        isActive
                          ? 'text-zinc-950 dark:text-zinc-50 font-semibold text-lg'
                          : 'text-zinc-400 hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-350 font-medium text-lg'
                      )}
                    >
                      {/* Cube Indicator (Always visible) */}
                      <div
                        className={cn(
                          'size-2 rounded-[2px] shrink-0 transition-colors duration-100 ease-out',
                          isActive ? FEATURE_COLORS[item.id] : 'bg-zinc-200 dark:bg-zinc-800'
                        )}
                      />
                      <span className="tracking-tight whitespace-nowrap">{item.tabLabel}</span>
                    </button>

                    {/* Collapsible Content under active option */}
                    {isActive && (
                      <div className="w-full pl-1 pr-4 pb-4 flex flex-col gap-4">
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.15, ease: 'easeOut' }}
                          className="flex flex-col gap-2"
                        >
                          <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400 max-w-md">
                            {item.description}
                          </p>
                        </motion.div>

                        {/* Mobile image */}
                        <div className="md:hidden w-full mt-2">
                          <BlurFade key={`${item.id}-diagram`} inView>
                            <FeatureShowcaseImage src={item.image} alt={item.tabLabel} />
                          </BlurFade>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Side: Feature image (Desktop only) */}
          <div className="hidden md:block">
            <BlurFade key={activeTab} inView>
              <FeatureShowcaseImage src={activeItem.image} alt={activeItem.tabLabel} />
            </BlurFade>
          </div>
        </div>
      </div>
    </section>
  );
}

function Hero({
  hasSession,
  onSignUp,
}: {
  hasSession: boolean;
  onSignUp: () => void;
}) {
  return (
    <section className="w-full bg-white dark:bg-[#060606] px-5 pt-28 pb-16 sm:px-6 sm:pt-32 sm:pb-20">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-center text-center min-h-[60svh] sm:min-h-[70svh] py-16">
          <h1 className="font-title text-balance text-[32px] font-normal leading-tight tracking-normal text-zinc-950 dark:text-white sm:text-[38px] md:text-[52px]">
            AI Agent for your inbox <br />
            in 5 minutes
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-sm md:text-base">
            Kilobot puts AI agents in your messaging inbox to qualify leads, answer questions, and close deals 24/7.
          </p>
          <div className="mt-8 flex flex-row items-center justify-center gap-3 sm:gap-3.5 w-full sm:w-auto max-w-sm">
            <PrimaryCta hasSession={hasSession} onSignUp={onSignUp} label="Start for free" />
            <Link
              to="/contact?intent=demo"
              className="inline-flex h-11 flex-1 sm:flex-none sm:w-auto items-center justify-center rounded-full border border-zinc-200 bg-transparent px-4 sm:px-6 text-sm font-semibold text-zinc-950 transition-all hover:bg-zinc-50 dark:border-white/20 dark:text-white dark:hover:bg-white/5"
            >
              Book a demo
            </Link>
          </div>
        </div>

        <div id="product-demo" className="mt-14 w-full scroll-mt-14 sm:mt-16">
          <BlurFade inView>
            <img
              src={LANDING_MOBILE_IMAGE}
              alt="Kilobot Inbox Sales Interface Demonstration"
              className="w-full h-auto rounded-lg bg-white shadow-[0_0_15px_rgba(0,0,0,0.07)] dark:border-white/10 dark:bg-white dark:shadow-[0_0_15px_rgba(0,0,0,0.35)] md:hidden"
            />
            <img
              src={LANDING_DESKTOP_IMAGE}
              alt="Kilobot Inbox Sales Interface Demonstration"
              className="hidden w-full h-auto rounded-lg bg-white shadow-[0_0_15px_rgba(0,0,0,0.07)] dark:border-white/10 dark:bg-white dark:shadow-[0_0_15px_rgba(0,0,0,0.35)] md:block"
            />
          </BlurFade>
        </div>
      </div>
    </section>
  );
}


function SectionHeading({
  label,
  title,
  body,
  className,
  delay = 0,
}: {
  label?: string;
  title: string;
  body?: string;
  className?: string;
  delay?: number;
}) {
  return (
    <BlurFade inView delay={delay} className={cn('max-w-xl', className)}>
      {label ? <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">{label}</p> : null}
      <h2 className="text-balance text-3xl font-normal tracking-tight text-zinc-950 dark:text-white sm:text-4xl md:text-5xl font-title">
        {title}
      </h2>
      {body ? (
        <p className="mt-4 text-pretty text-base leading-7 text-zinc-600 dark:text-zinc-400">{body}</p>
      ) : null}
    </BlurFade>
  );
}

function ComparisonSection() {
  const kilobotItems = [
    {
      title: 'Go Live Within 5 Minutes',
      description: 'Go live in minutes on your own—with support if you need it.',
    },
    {
      title: 'Natural, Human-Like Replies',
      description:
        'AI that sees incoming messages, shows typing indicators, and reacts naturally in real time.',
    },
    {
      title: 'Context-Aware AI',
      description: 'AI powered entirely by a large language model—not rigid decision trees or scripts.',
    },
    {
      title: 'Transparent Agent Setup',
      description: "See and configure your agent's prompts, knowledge, and behavior.",
    },
    {
      title: 'Role-Based Access Control Built-In',
      description: 'Role-based permissions for your team—ready out of the box.',
    },
  ];

  const alternativesItems = [
    {
      title: 'Slow to Set Up',
        description: "You often need to go through a sales rep and hop on a call before you're live.",
    },
    {
      title: 'Fixed Template Replies',
      description: 'Canned answers to preset questions—no natural back-and-forth.',
    },
    {
      title: 'Rule-Based Conversations',
      description: 'Decision trees and scripts—not AI that understands context.',
    },
    {
      title: 'Black Box AI',
      description: "You can't see or configure how your AI agent thinks and responds.",
    },
    {
      title: 'No Built-In Access Control',
      description: "Managing team roles and permissions isn't part of the platform.",
    },
  ];

  return (
    <section className="bg-white dark:bg-[#060606] py-24 px-6 sm:py-32 sm:px-8 overflow-hidden">
      <div className="mx-auto max-w-6xl">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <SectionHeading
            title="Kilobot vs The Others"
            className="mx-auto text-center items-center"
          />
        </div>

        {/* Two Columns Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 max-w-5xl mx-auto">
          {/* Left Column: Kilobot */}
          <div className="flex flex-col gap-6">
            <h4 className="flex items-center justify-center gap-2 text-center text-lg sm:text-xl font-semibold text-zinc-950 dark:text-white font-title mb-2">
              <img src="/icon.svg" className="size-5 dark:invert shrink-0" alt="" />
              Kilobot
            </h4>
            <div className="rounded-2xl border border-zinc-200/60 dark:border-white/[0.04] bg-zinc-150/10 dark:bg-zinc-900/10 p-8 sm:p-10 shadow-sm flex-1">
              <ul className="space-y-8">
                {kilobotItems.map((item, index) => (
                  <li key={index} className="flex items-start gap-3.5">
                    <Check className="size-4.5 text-emerald-650 dark:text-emerald-400 shrink-0 mt-1" strokeWidth={3} />
                    <div>
                      <h5 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-zinc-50">
                        {item.title}
                      </h5>
                      <p className="text-xs sm:text-sm leading-relaxed text-zinc-500 dark:text-zinc-400 mt-1.5 font-normal">
                        {item.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Column: Alternatives */}
          <div className="flex flex-col gap-6">
            <h4 className="text-center text-lg sm:text-xl font-semibold text-zinc-950 dark:text-white mb-2">
              Alternatives
            </h4>
            <div className="rounded-2xl border border-zinc-200/60 dark:border-white/[0.04] bg-zinc-150/10 dark:bg-zinc-900/10 p-8 sm:p-10 shadow-sm flex-1">
              <ul className="space-y-8">
                {alternativesItems.map((item, index) => (
                  <li key={index} className="flex items-start gap-3.5">
                    <X className="size-4.5 text-red-500 dark:text-red-400 shrink-0 mt-1" strokeWidth={3} />
                    <div>
                      <h5 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-zinc-50">
                        {item.title}
                      </h5>
                      <p className="text-xs sm:text-sm leading-relaxed text-zinc-500 dark:text-zinc-400 mt-1.5 font-normal">
                        {item.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


function StatsSection() {
  const aggregates = useQuery(api.agentUsage.getLifetimeModelUsage);
  const supportedModels = useQuery(api.llm.modelPricing.listEnabled);

  const totalTokens = aggregates?.reduce((sum, item) => sum + item.totalTokens, 0) ?? 0;
  const modelsCount = supportedModels?.length ?? 0;
  const businessesOnboarded = 10;

  const stats = [
    {
      value: modelsCount,
      label: 'Models Supported',
    },
    {
      value: totalTokens,
      label: 'Total Token Used',
    },
    {
      value: businessesOnboarded,
      label: 'Businesses Onboarded',
    },
  ];

  return (
    <section className="bg-zinc-50/20 dark:bg-[#060606]/20 py-24 px-6 sm:py-32 sm:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <SectionHeading
            title="Our numbers"
            className="mx-auto text-center items-center"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 sm:gap-16 text-center">
          {stats.map((stat, idx) => (
            <div 
              key={idx} 
              className="flex flex-col items-center gap-6 animate-fade-in"
            >
              <div className="text-5xl sm:text-6xl md:text-7xl font-semibold tracking-tighter text-zinc-950 dark:text-white font-title select-none leading-none flex items-center justify-center">
                <NumberTicker value={stat.value} className="text-zinc-950 dark:text-white font-semibold font-title" />
              </div>
              <div className="text-sm sm:text-base font-semibold text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans max-w-xs mx-auto">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


function UpgradeInboxSection({ onSignUp }: { onSignUp: () => void }) {
  return (
    <section className="bg-white dark:bg-[#060606] py-24 px-6 sm:py-32 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-2xl bg-zinc-950 dark:bg-zinc-900 text-white p-10 sm:p-16 flex flex-col items-center text-center shadow-lg relative overflow-hidden">
          {/* Kilobot Logo (Directly, no wrapper container) */}
          <img src="/icon.svg" className="size-10 invert mb-6" alt="Kilobot Logo" />

          <h3 className="text-2xl sm:text-3xl md:text-[34px] font-normal tracking-tight text-white mb-8 font-title leading-tight max-w-3xl">
            Upgrade your inbox today.
          </h3>

          <div className="flex flex-row items-center justify-center gap-3 sm:gap-3.5 w-full sm:w-auto max-w-sm">
            <button
              type="button"
              onClick={onSignUp}
              className="inline-flex h-11 flex-1 sm:flex-none sm:w-auto items-center justify-center rounded-full bg-white hover:bg-white/90 text-zinc-950 px-4 sm:px-6 text-sm font-semibold transition-colors cursor-pointer shadow-sm"
            >
              Start for free
            </button>

            <Link
              to="/contact?intent=demo"
              className="inline-flex h-11 flex-1 sm:flex-none sm:w-auto items-center justify-center rounded-full border border-white/20 bg-transparent px-4 sm:px-6 text-sm font-semibold text-white transition-all hover:bg-white/5"
            >
              Book a demo
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}


export default function LandingPage() {
  const { user, signUp } = useAuth();
  const hasSession = Boolean(user);

  const returnTo = { returnTo: POST_LOGIN_REDIRECT };
  const onSignUp = () => {
    void signUp({ state: returnTo });
  };

  return (
    <div className="min-h-[100svh] bg-white dark:bg-[#060606] font-sans text-zinc-900 dark:text-zinc-100 antialiased selection:bg-zinc-200 dark:selection:bg-zinc-800 selection:text-zinc-900 dark:selection:text-zinc-50">
      <SiteHeader />
      <main>
        <Hero hasSession={hasSession} onSignUp={onSignUp} />
        <FeaturesSection />
        <FeatureShowcaseSection />
        <ComparisonSection />
        <StatsSection />
        <UpgradeInboxSection onSignUp={onSignUp} />

      </main>
      <SiteFooter />
    </div>
  );
}
