import { Link } from 'react-router';
import { Check, X } from 'lucide-react';
import { SectionHeading } from './LandingFeatureSections';

const kilobotItems = [
  {
    title: 'Go Live Within 5 Minutes',
    description: 'Go live in minutes on your own. Start with free plan.',
  },
  {
    title: 'Natural, Human-Like Replies',
    description: 'Kilobot sees incoming messages, shows typing indicators, and reacts with emojis like you.',
  },
  {
    title: 'Smart Workflows with LLM',
    description: 'Kilobot optimizes the power of LLM & powerful workflows to achieve agentic behavior.',
  },
  {
    title: 'Transparent Agent Setup',
    description: "See and configure your agent's prompts, knowledge, and models.",
  },
  {
    title: 'Role-Based Access Control Built-In',
    description: 'Role-based permissions for your team, ready out of the box.',
  },
];

const alternativesItems = [
  {
    title: 'Slow to Set Up',
    description: "You often need to go through a sales rep and hop on a call before you're live.",
  },
  {
    title: 'Fixed Template Replies',
    description: 'Canned answers to preset questions, no natural back-and-forth.',
  },
  {
    title: 'Rule-Based Conversations',
    description: 'Lousy outdated workflow systems that are not smart enough to understand context.',
  },
  {
    title: 'Limited Customization',
    description: "You can't see or configure how your agent thinks and responds.",
  },
  {
    title: 'No Built-In Access Control',
    description: "Managing team roles and permissions isn't part of the platform.",
  },
];

function ComparisonList({
  title,
  items,
  variant,
}: {
  title: string;
  items: typeof kilobotItems;
  variant: 'kilobot' | 'alternative';
}) {
  const Icon = variant === 'kilobot' ? Check : X;

  return (
    <div className="flex flex-col gap-6">
      <h4 className="mb-2 flex items-center justify-center gap-2 text-center text-lg font-semibold text-zinc-950 sm:text-xl dark:text-white">
        {variant === 'kilobot' ? (
          <img src="/icon.svg" className="size-5 shrink-0 dark:invert" alt="" />
        ) : null}
        {title}
      </h4>
      <div className="flex-1 rounded-2xl border border-zinc-200/60 bg-zinc-50/60 p-8 shadow-sm sm:p-10 dark:border-white/[0.04] dark:bg-zinc-900/10">
        <ul className="space-y-8">
          {items.map((item) => (
            <li key={item.title} className="flex items-start gap-3.5">
              <Icon
                className={variant === 'kilobot'
                  ? 'mt-1 size-4.5 shrink-0 text-emerald-600 dark:text-emerald-400'
                  : 'mt-1 size-4.5 shrink-0 text-red-500 dark:text-red-400'}
                strokeWidth={3}
              />
              <div>
                <h5 className="text-sm font-semibold text-zinc-900 sm:text-base dark:text-zinc-50">
                  {item.title}
                </h5>
                <p className="mt-1.5 text-xs font-normal leading-relaxed text-zinc-500 sm:text-sm dark:text-zinc-400">
                  {item.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function ComparisonSection() {
  return (
    <section className="overflow-hidden bg-white px-6 py-24 sm:px-8 sm:py-32 dark:bg-[#060606]">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-16 max-w-3xl text-center sm:mb-20">
          <SectionHeading title="Kilobot vs The Others" className="mx-auto items-center text-center" />
        </div>
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
          <ComparisonList title="Kilobot" items={kilobotItems} variant="kilobot" />
          <ComparisonList title="Alternatives" items={alternativesItems} variant="alternative" />
        </div>
      </div>
    </section>
  );
}

export function UpgradeInboxSection({ onSignUp }: { onSignUp: () => void }) {
  return (
    <section className="bg-white px-6 py-24 sm:px-8 sm:py-32 dark:bg-[#060606]">
      <div className="mx-auto max-w-6xl">
        <div className="relative flex flex-col items-center overflow-hidden rounded-2xl bg-zinc-950 p-10 text-center text-white shadow-lg sm:p-16 dark:bg-zinc-900">
          <img src="/icon.svg" className="mb-6 size-10 invert" alt="Kilobot Logo" />
          <h3 className="font-title mb-8 max-w-3xl text-2xl font-normal leading-tight tracking-tight text-white sm:text-3xl md:text-[34px]">
            Upgrade your inbox today.
          </h3>
          <div className="flex w-full max-w-sm flex-row items-center justify-center gap-3 sm:w-auto sm:gap-3.5">
            <button
              type="button"
              onClick={onSignUp}
              className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-zinc-950 shadow-sm transition-colors hover:bg-white/90 sm:w-auto sm:flex-none sm:px-6"
            >
              Start for free
            </button>
            <Link
              to="/contact?intent=demo"
              className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-white/20 bg-transparent px-4 text-sm font-semibold text-white transition-all hover:bg-white/5 sm:w-auto sm:flex-none sm:px-6"
            >
              Book a demo
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
