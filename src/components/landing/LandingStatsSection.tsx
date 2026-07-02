import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { NumberTicker } from '@/components/motion/number-ticker';
import { BlurFade } from '@/components/ui/blur-fade';
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
      <h2 className="text-balance text-3xl font-normal tracking-tight text-zinc-950 dark:text-white sm:text-4xl md:text-5xl font-title">
        {title}
      </h2>
    </BlurFade>
  );
}

function formatStatValue(value: number) {
  return value.toLocaleString();
}

export function StatsSection() {
  const aggregates = useQuery(api.agentUsage.getLifetimeModelUsage);
  const supportedModels = useQuery(api.llm.modelPricing.listEnabled);

  const totalTokens = aggregates?.reduce((sum, item) => sum + item.totalTokens, 0) ?? 0;
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
    <section className="bg-zinc-50/20 dark:bg-[#060606]/20 py-24 px-6 sm:py-32 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <SectionHeading
            title="Our numbers"
            className="mx-auto text-center items-center"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 sm:gap-16 text-center">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center gap-6 animate-fade-in"
            >
              <div className="flex items-center justify-center text-4xl font-medium leading-none tracking-tight text-zinc-950 select-none font-title dark:text-white sm:text-5xl md:text-6xl">
                <NumberTicker
                  value={stat.value}
                  format={formatStatValue}
                  className="font-title font-medium text-zinc-950 dark:text-white"
                />
              </div>
              <div className="text-sm sm:text-base font-normal text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans max-w-xs mx-auto">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
