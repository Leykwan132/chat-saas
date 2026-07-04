import { Link as LinkIcon, MessageSquare, Play } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type Benefit = {
  title: string;
  description: string;
  Icon: LucideIcon;
};

const benefits: Benefit[] = [
  {
    title: '3 Months Free Growth',
    description:
      'Get three months of our Growth plan completely free (worth RM 1,197). Includes 10 AI agents and 5,000 monthly chat credits.',
    Icon: Play,
  },
  {
    title: 'Founder Direct Line',
    description:
      'Access a private WhatsApp chat directly with our founder to assist you with prompt engineering and integrations.',
    Icon: MessageSquare,
  },
  {
    title: 'Roadmap Influence',
    description:
      'Be the first to request custom features, test new messaging channels (WhatsApp, Instagram), and try new models.',
    Icon: LinkIcon,
  },
];

export function EarlyAdopterBenefits() {
  return (
    <section id="benefits" className="scroll-mt-28 mb-24 pt-8">
      <h2 className="font-title text-[38px] sm:text-4xl font-normal text-zinc-950 dark:text-white mb-14 text-center">
        Program Benefits
      </h2>
      <div className="max-w-4xl mx-auto flex flex-col divide-y divide-zinc-200 dark:divide-white/[0.08] border-t border-b border-zinc-200 dark:border-white/[0.08]">
        {benefits.map(({ title, description, Icon }) => (
          <div key={title} className="py-12 grid grid-cols-1 md:grid-cols-[320px_1fr] gap-12 md:gap-32 items-start">
            <div className="flex items-center gap-3.5">
              <Icon className="size-5 text-zinc-400 dark:text-zinc-500 stroke-[1.2] shrink-0" />
              <h3 className="font-title text-2xl font-normal text-zinc-950 dark:text-white">{title}</h3>
            </div>
            <div>
              <p className="text-xs sm:text-sm md:text-base text-zinc-500 dark:text-zinc-400 leading-relaxed">
                {description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
