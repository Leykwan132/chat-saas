import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { useAuth } from '@workos-inc/authkit-react';
import { usePostHog } from '@posthog/react';
import { X } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Marquee } from '@/components/ui/marquee';
import { Button } from '@/components/ui/button';
import { AdjustPlanDialog } from '@/components/AdjustPlanDialog';
import { cn } from '@/lib/utils';
import { UPGRADE_SCENARIOS } from '@/config/upgradeScenarios';
import type { PlanKey } from '../../shared/planCatalog';
import {
  UpgradeModalContext,
  useUpgradeModal,
  type UpgradeScenario,
} from '@/components/upgradeModalContext';

export type { UpgradeScenario };
export { useUpgradeModal };

export function UpgradeModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeScenario, setActiveScenario] = useState<UpgradeScenario>('free_to_starter');
  const [adjustPlanOpen, setAdjustPlanOpen] = useState(false);
  const posthog = usePostHog();

  const { user, isLoading: isAuthLoading } = useAuth();
  const isAuthenticated = Boolean(user);

  const planAndUsage = useQuery(
    api.plans.getPlanAndUsage,
    (isAuthLoading || !isAuthenticated) ? 'skip' : {},
  );

  const openUpgradeModal = (scenario?: UpgradeScenario) => {
    let resolvedScenario: UpgradeScenario;
    if (scenario && scenario in UPGRADE_SCENARIOS) {
      resolvedScenario = scenario;
    } else {
      const currentPlan = (planAndUsage?.plan ?? 'free') as PlanKey;
      if (currentPlan === 'free') {
        resolvedScenario = 'free_to_starter';
      } else if (currentPlan === 'starter') {
        resolvedScenario = 'starter_to_growth';
      } else if (currentPlan === 'growth') {
        resolvedScenario = 'growth_to_business';
      } else {
        resolvedScenario = 'free_to_starter';
      }
    }
    setActiveScenario(resolvedScenario);
    posthog?.capture('upgrade_modal_opened', { scenario: resolvedScenario });
    setIsOpen(true);
  };

  const closeUpgradeModal = () => {
    setIsOpen(false);
  };

  const handleUpgrade = () => {
    setIsOpen(false);
    setAdjustPlanOpen(true);
  };

  const config =
    UPGRADE_SCENARIOS[activeScenario] ?? UPGRADE_SCENARIOS.free_to_starter;

  const firstRow = config.features.slice(0, Math.ceil(config.features.length / 2));
  const secondRow = config.features.slice(Math.ceil(config.features.length / 2));
  const thirdRow = [...firstRow].reverse();
  const fourthRow = [...secondRow].reverse();

  return (
    <UpgradeModalContext.Provider value={{ openUpgradeModal, closeUpgradeModal }}>
      {children}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          showCloseButton={false}
          className={cn(
            "sm:max-w-lg border-zinc-200 bg-white text-zinc-900 overflow-hidden shadow-2xl rounded-3xl p-0",
            "dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
          )}
        >
          {/* Close button */}
          <button
            onClick={closeUpgradeModal}
            className={cn(
              "absolute right-6 top-6 z-50 rounded-full p-2 bg-zinc-100 border border-zinc-200 opacity-70 hover:opacity-100 transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-zinc-400",
              "dark:bg-zinc-900/80 dark:border-zinc-800/80 dark:focus:ring-white/20"
            )}
          >
            <X className="h-4 w-4 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white" />
            <span className="sr-only">Close</span>
          </button>

          <div className="flex flex-col pt-12 pb-8 px-6 sm:px-10">
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white font-title">
                {config.title}
              </h2>
              <p className="mt-3 px-4 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed font-sans">
                {config.description}
              </p>
            </div>

            <div className="relative flex h-80 w-full items-center justify-center overflow-hidden [perspective:500px] my-6 select-none pointer-events-none">
              <div
                className="absolute flex flex-row items-center gap-4 shrink-0"
                style={{
                  transform:
                    "translateX(-50px) translateY(0px) translateZ(-100px) rotateX(20deg) rotateY(-10deg) rotateZ(20deg)",
                }}
              >
                <Marquee pauseOnHover={false} vertical className="[--duration:20s] gap-3">
                  {firstRow.map((feature, idx) => (
                    <FeatureCard key={idx} {...feature} />
                  ))}
                </Marquee>
                <Marquee reverse pauseOnHover={false} vertical className="[--duration:24s] gap-3">
                  {secondRow.map((feature, idx) => (
                    <FeatureCard key={idx} {...feature} />
                  ))}
                </Marquee>
                <Marquee pauseOnHover={false} vertical className="[--duration:20s] gap-3">
                  {thirdRow.map((feature, idx) => (
                    <FeatureCard key={idx} {...feature} />
                  ))}
                </Marquee>
                <Marquee reverse pauseOnHover={false} vertical className="[--duration:24s] gap-3">
                  {fourthRow.map((feature, idx) => (
                    <FeatureCard key={idx} {...feature} />
                  ))}
                </Marquee>
              </div>
            </div>

            <Button
              onClick={handleUpgrade}
              className={cn(
                "w-full py-6 text-base font-semibold rounded-2xl transition-all duration-300",
                "bg-zinc-950 text-white hover:bg-zinc-800 active:scale-[0.98]",
                "dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100"
              )}
            >
              {config.buttonLabel}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full plan picker — opened when user clicks the upgrade button */}
      <AdjustPlanDialog
        open={adjustPlanOpen}
        onOpenChange={setAdjustPlanOpen}
        planReturnPath={window.location.pathname + window.location.search}
      />
    </UpgradeModalContext.Provider>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div
      className={cn(
        "relative w-56 p-4 rounded-2xl border transition-all duration-300",
        "border-zinc-200 bg-zinc-50/80 backdrop-blur-md text-left shadow-md",
        "dark:border-zinc-800 dark:bg-zinc-900/60 dark:shadow-lg"
      )}
    >
      <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 font-sans">{title}</h4>
      <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-sans">{description}</p>
    </div>
  );
}

/** Inline embeddable version of the upgrade content — no dialog wrapper. */
export function UpgradeCard({
  scenario = 'free_to_starter',
  title,
  description,
}: {
  scenario?: UpgradeScenario;
  title?: string;
  description?: string;
}) {
  const [adjustPlanOpen, setAdjustPlanOpen] = useState(false);
  const config = UPGRADE_SCENARIOS[scenario] ?? UPGRADE_SCENARIOS.free_to_starter;

  const firstRow = config.features.slice(0, Math.ceil(config.features.length / 2));
  const secondRow = config.features.slice(Math.ceil(config.features.length / 2));
  const thirdRow = [...firstRow].reverse();
  const fourthRow = [...secondRow].reverse();

  return (
    <>
      <div className="flex flex-col pt-10 pb-8 w-full px-6 sm:px-10">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white font-title">
            {title ?? config.title}
          </h2>
          <p className="mt-3 px-4 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed font-sans">
            {description ?? config.description}
          </p>
        </div>

        <div className="relative flex h-72 w-full items-center justify-center overflow-hidden [perspective:500px] my-6 select-none pointer-events-none">
          <div
            className="absolute flex flex-row items-center gap-4 shrink-0"
            style={{
              transform:
                "translateX(-50px) translateY(0px) translateZ(-100px) rotateX(20deg) rotateY(-10deg) rotateZ(20deg)",
            }}
          >
            <Marquee pauseOnHover={false} vertical className="[--duration:20s] gap-3">
              {firstRow.map((feature, idx) => (
                <FeatureCard key={idx} {...feature} />
              ))}
            </Marquee>
            <Marquee reverse pauseOnHover={false} vertical className="[--duration:24s] gap-3">
              {secondRow.map((feature, idx) => (
                <FeatureCard key={idx} {...feature} />
              ))}
            </Marquee>
            <Marquee pauseOnHover={false} vertical className="[--duration:20s] gap-3">
              {thirdRow.map((feature, idx) => (
                <FeatureCard key={idx} {...feature} />
              ))}
            </Marquee>
            <Marquee reverse pauseOnHover={false} vertical className="[--duration:24s] gap-3">
              {fourthRow.map((feature, idx) => (
                <FeatureCard key={idx} {...feature} />
              ))}
            </Marquee>
          </div>
        </div>

        <Button
          onClick={() => setAdjustPlanOpen(true)}
          className={cn(
            "w-full py-6 text-base font-semibold rounded-2xl transition-all duration-300",
            "bg-zinc-950 text-white hover:bg-zinc-800 active:scale-[0.98]",
            "dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100"
          )}
        >
          {config.buttonLabel}
        </Button>
      </div>

      <AdjustPlanDialog
        open={adjustPlanOpen}
        onOpenChange={setAdjustPlanOpen}
        planReturnPath={window.location.pathname + window.location.search}
      />
    </>
  );
}
