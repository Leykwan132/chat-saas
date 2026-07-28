import { Marquee } from '@/components/ui/marquee';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { UPGRADE_SCENARIOS } from '@/config/upgradeScenarios';
import { useManagePlan } from '@/components/billing/managePlanContext';

export type UpgradeScenario = keyof typeof UPGRADE_SCENARIOS;

export function UpgradeCard({
  scenario = 'free_to_starter',
  title,
  description,
}: {
  scenario?: UpgradeScenario;
  title?: string;
  description?: string;
}) {
  const { openManagePlan, isManagePlanLoading } = useManagePlan();
  const config =
    UPGRADE_SCENARIOS[scenario] ?? UPGRADE_SCENARIOS.free_to_starter;
  const firstRow = config.features.slice(
    0,
    Math.ceil(config.features.length / 2),
  );
  const secondRow = config.features.slice(
    Math.ceil(config.features.length / 2),
  );
  const thirdRow = [...firstRow].reverse();
  const fourthRow = [...secondRow].reverse();

  return (
    <div className="flex w-full flex-col px-6 pb-8 pt-10 sm:px-10">
      <div className="text-center">
        <h2 className="font-title text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
          {title ?? config.title}
        </h2>
        <p className="mt-3 px-4 font-sans text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          {description ?? config.description}
        </p>
      </div>

      <div className="relative my-6 flex h-72 w-full select-none items-center justify-center overflow-hidden [perspective:500px] pointer-events-none">
        <div
          className="absolute flex shrink-0 flex-row items-center gap-4"
          style={{
            transform:
              'translateX(-50px) translateY(0px) translateZ(-100px) rotateX(20deg) rotateY(-10deg) rotateZ(20deg)',
          }}
        >
          <Marquee
            pauseOnHover={false}
            vertical
            className="[--duration:20s] gap-3"
          >
            {firstRow.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </Marquee>
          <Marquee
            reverse
            pauseOnHover={false}
            vertical
            className="[--duration:24s] gap-3"
          >
            {secondRow.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </Marquee>
          <Marquee
            pauseOnHover={false}
            vertical
            className="[--duration:20s] gap-3"
          >
            {thirdRow.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </Marquee>
          <Marquee
            reverse
            pauseOnHover={false}
            vertical
            className="[--duration:24s] gap-3"
          >
            {fourthRow.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </Marquee>
        </div>
      </div>

      <Button
        onClick={openManagePlan}
        disabled={isManagePlanLoading}
        className={cn(
          'w-full rounded-2xl py-6 text-base font-semibold transition-all duration-300',
          'bg-zinc-950 text-white hover:bg-zinc-800 active:scale-[0.98]',
          'dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100',
        )}
      >
        {isManagePlanLoading ? <Spinner /> : null}
        Manage plan
      </Button>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div
      className={cn(
        'relative w-56 rounded-2xl border p-4 text-left shadow-md transition-all duration-300',
        'border-zinc-200 bg-zinc-50/80 backdrop-blur-md',
        'dark:border-zinc-800 dark:bg-zinc-900/60 dark:shadow-lg',
      )}
    >
      <h4 className="font-sans text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        {title}
      </h4>
      <p className="mt-1.5 font-sans text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        {description}
      </p>
    </div>
  );
}
