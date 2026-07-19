import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { NumberTicker } from '@/components/motion/number-ticker';
import { BlurFade } from '@/components/ui/blur-fade';
import {
  isProductFeatureEnabled,
  useShowTokenUsage,
} from '@/lib/posthogFeatureFlags';
import { cn } from '@/lib/utils';

type LandingStat = {
  value: number;
  label: string;
};

const businessesOnboarded = 10;

function SectionHeading({
  title,
  className,
}: {
  title: string;
  className?: string;
}) {
  return (
    <BlurFade inView className={cn('max-w-xl', className)}>
      <h2 className="font-title text-balance text-3xl font-normal tracking-tight text-zinc-950 dark:text-white sm:text-4xl md:text-5xl">
        {title}
      </h2>
    </BlurFade>
  );
}

function formatStatValue(value: number) {
  return value.toLocaleString();
}

function EnabledStatsSection() {
  const aggregates = useQuery(api.agentUsage.getLifetimeModelUsage);
  const supportedModels = useQuery(api.llm.modelPricing.listEnabled);
  const totalTokens = aggregates?.reduce(
    (sum, item) => sum + item.totalTokens,
    0,
  ) ?? 0;
  const modelsCount = supportedModels?.length ?? 0;
  const stats: LandingStat[] = [
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
    <section className="bg-zinc-50/20 px-6 py-24 dark:bg-[#060606]/20 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-16 max-w-3xl text-center sm:mb-20">
          <SectionHeading
            title="Our numbers"
            className="mx-auto items-center text-center"
          />
        </div>

        <div className="grid grid-cols-1 gap-12 text-center sm:gap-16 md:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="animate-fade-in flex flex-col items-center gap-6"
            >
              <div className="font-title flex select-none items-center justify-center text-4xl font-medium leading-none tracking-tight text-zinc-950 dark:text-white sm:text-5xl md:text-6xl">
                <NumberTicker
                  value={stat.value}
                  format={formatStatValue}
                  className="font-title font-medium text-zinc-950 dark:text-white"
                />
              </div>
              <div className="font-sans mx-auto max-w-xs text-sm font-normal leading-relaxed text-zinc-700 dark:text-zinc-300 sm:text-base">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StatsSection() {
  const tokenUsageState = useShowTokenUsage();

  if (!isProductFeatureEnabled(tokenUsageState)) return null;

  return <EnabledStatsSection />;
}
