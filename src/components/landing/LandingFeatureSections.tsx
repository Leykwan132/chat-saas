import { useState } from 'react';
import { motion } from 'motion/react';
import { BlurFade } from '@/components/ui/blur-fade';
import { cn } from '@/lib/utils';

const FEATURE_AI_AGENT_IMAGE = 'https://storage.kilobot.app/AI%20Agent-3.png';
const FEATURE_KB_IMAGE = 'https://storage.kilobot.app/KB-3.png';
const FEATURE_MODELS_IMAGE = 'https://storage.kilobot.app/Models-3.png';

const FEATURE_SHOWCASE_IMAGES = {
  appointmentBooking: 'https://storage.kilobot.app/AB.png',
  aiWorkflows: 'https://storage.kilobot.app/WF.png',
  autoLeadAnalysis: 'https://storage.kilobot.app/CLD.png',
  advancedAnalytics: 'https://storage.kilobot.app/Analytics%20(2).png',
  naturalInteraction: 'https://storage.kilobot.app/NI.png',
  roleBasedInteraction: 'https://storage.kilobot.app/RBAC.png',
} as const;

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
    description: 'AI that sees, reacts, and shows typing indicators in real time.',
    image: FEATURE_SHOWCASE_IMAGES.naturalInteraction,
  },
  {
    id: 'workflows',
    tabLabel: 'AI Workflows',
    description: 'Set up powerful workflows for followups, reminders, bookings with simple language.',
    image: FEATURE_SHOWCASE_IMAGES.aiWorkflows,
  },
  {
    id: 'calendar',
    tabLabel: 'Auto Booking',
    description: 'Collect relevant details and secure bookings with customers on autopilot.',
    image: FEATURE_SHOWCASE_IMAGES.appointmentBooking,
  },
  {
    id: 'scoring',
    tabLabel: 'Auto Lead Analysis',
    description: 'Quality customers from the conversation: intent, fit, and readiness in real time.',
    image: FEATURE_SHOWCASE_IMAGES.autoLeadAnalysis,
  },
  {
    id: 'advancedAnalytics',
    tabLabel: 'Advanced Analytics',
    description: 'Understand customer sentiment and discover the most common topics across your conversations.',
    image: FEATURE_SHOWCASE_IMAGES.advancedAnalytics,
  },
  {
    id: 'access',
    tabLabel: 'Role Based Access Control',
    description: 'Control team access with custom roles and channel permissions.',
    image: FEATURE_SHOWCASE_IMAGES.roleBasedInteraction,
  },
];

const FEATURE_COLORS: Record<string, string> = {
  calendar: 'bg-indigo-500 dark:bg-indigo-400',
  workflows: 'bg-blue-500 dark:bg-blue-400',
  scoring: 'bg-orange-500 dark:bg-orange-400',
  advancedAnalytics: 'bg-cyan-500 dark:bg-cyan-400',
  humanLike: 'bg-emerald-500 dark:bg-emerald-400',
  access: 'bg-slate-500 dark:bg-slate-400',
};

export function SectionHeading({
  label,
  title,
  body,
  className,
  titleClassName,
  delay = 0,
}: {
  label?: string;
  title: string;
  body?: string;
  className?: string;
  titleClassName?: string;
  delay?: number;
}) {
  return (
    <BlurFade inView delay={delay} className={cn('max-w-xl', className)}>
      {label ? <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">{label}</p> : null}
      <h2
        className={cn(
          'font-title text-balance text-3xl font-normal tracking-tight text-zinc-950 sm:text-4xl md:text-5xl dark:text-white',
          titleClassName,
        )}
      >
        {title}
      </h2>
      {body ? (
        <p className="mt-4 text-pretty text-base leading-7 text-zinc-600 dark:text-zinc-400">{body}</p>
      ) : null}
    </BlurFade>
  );
}

function FeatureCard({
  title,
  description,
  image,
  alt,
}: {
  title: string;
  description: string;
  image: string;
  alt: string;
}) {
  return (
    <div className="flex flex-col justify-between rounded-2xl bg-zinc-100/70 dark:bg-zinc-900/40">
      <div className="px-8 pb-4 pt-8">
        <h3 className="mb-2 text-lg font-semibold text-zinc-950 dark:text-white">{title}</h3>
        <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{description}</p>
      </div>
      <img src={image} alt={alt} className="h-auto w-full" />
    </div>
  );
}

export function FeaturesSection() {
  return (
    <section className="bg-white px-6 py-24 sm:px-8 sm:py-32 dark:bg-[#060606]">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-16 max-w-3xl text-center sm:mb-20">
          <SectionHeading
            title="Multiply your sales with Kilobot"
            className="mx-auto items-center text-center max-w-none"
            titleClassName="sm:whitespace-nowrap"
          />
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <FeatureCard
            title="Agentic AI"
            description="Auto lead labeling, summaries, services with date and lead assignment."
            image={FEATURE_AI_AGENT_IMAGE}
            alt="AI Agent feature"
          />
          <FeatureCard
            title="Knowledge Base"
            description="Sync PDFs, websites, or any text info."
            image={FEATURE_KB_IMAGE}
            alt="Knowledge base feature"
          />
          <FeatureCard
            title="Custom Models"
            description="Choose and deploy custom models on your own."
            image={FEATURE_MODELS_IMAGE}
            alt="Custom models feature"
          />
        </div>
      </div>
    </section>
  );
}

export function FeatureShowcaseSection() {
  const [activeTab, setActiveTab] = useState(FEATURE_ITEMS[0].id);
  const activeItem = FEATURE_ITEMS.find((item) => item.id === activeTab);

  if (!activeItem) {
    throw new Error(`Unknown landing feature tab: ${activeTab}`);
  }

  return (
    <section className="bg-white px-6 py-24 sm:px-8 sm:py-32 dark:bg-[#060606]">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-16 max-w-3xl text-center sm:mb-20">
          <SectionHeading title="Like Human, but 24/7" className="mx-auto items-center text-center" />
        </div>
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center justify-center gap-0 md:grid-cols-[340px_600px]">
          <div className="flex w-full flex-col">
            <div className="flex w-full flex-col gap-2.5">
              {FEATURE_ITEMS.map((item) => {
                const isActive = item.id === activeTab;
                return (
                  <div key={item.id} className="flex w-full flex-col">
                    <button
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={cn(
                        'flex w-full cursor-pointer items-center gap-3.5 border-none bg-transparent px-1 py-3 text-left text-lg outline-none transition-all duration-100 focus:outline-none',
                        isActive
                          ? 'font-semibold text-zinc-950 dark:text-zinc-50'
                          : 'font-medium text-zinc-400 hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-300',
                      )}
                    >
                      <div
                        className={cn(
                          'size-2 shrink-0 rounded-[2px] transition-colors duration-100 ease-out',
                          isActive ? FEATURE_COLORS[item.id] : 'bg-zinc-200 dark:bg-zinc-800',
                        )}
                      />
                      <span className="whitespace-nowrap tracking-tight">{item.tabLabel}</span>
                    </button>
                    {isActive ? (
                      <div className="flex w-full flex-col gap-4 pb-4 pl-1 pr-4">
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.15, ease: 'easeOut' }}
                        >
                          <p className="max-w-md text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                            {item.description}
                          </p>
                        </motion.div>
                        <div className="mt-2 w-full md:hidden">
                          <BlurFade key={`${item.id}-diagram`} inView>
                            <img src={item.image} alt={item.tabLabel} className="h-auto w-full" />
                          </BlurFade>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="hidden md:block">
            <BlurFade key={activeTab} inView>
              <img src={activeItem.image} alt={activeItem.tabLabel} className="h-auto w-full" />
            </BlurFade>
          </div>
        </div>
      </div>
    </section>
  );
}
