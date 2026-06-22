import { useEffect } from 'react';
import { useQuery } from 'convex/react';
import { useAuth } from '@workos-inc/authkit-react';
import { api } from '../../convex/_generated/api';
import { Spinner } from '@/components/ui/spinner';
import {
  PLAN_CATALOG,
  type PlanFeatureFlags,
  type PlanKey,
} from '../../shared/planCatalog';
import { UpgradeCard, type UpgradeScenario } from '@/components/UpgradeModal';
import { cn } from '@/lib/utils';

type PlanFeatureGateProps = {
  featureKey: keyof PlanFeatureFlags;
  featureName: string;
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
};

function resolveScenario(plan: PlanKey | undefined): UpgradeScenario {
  if (plan === 'starter') return 'starter_to_growth';
  if (plan === 'growth') return 'growth_to_business';
  return 'free_to_starter';
}

/** Locks the nearest scrollable ancestor (<main>) while the gate is mounted. */
function useScrollLock() {
  useEffect(() => {
    const el = document.querySelector('main');
    if (!el) return;
    const prev = el.style.overflow;
    el.style.overflow = 'hidden';
    return () => {
      el.style.overflow = prev;
    };
  }, []);
}

export function PlanFeatureGate({
  featureKey,
  children,
  className,
  title,
  description,
}: PlanFeatureGateProps) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const isAuthenticated = Boolean(user);

  const planAndUsage = useQuery(
    api.plans.getPlanAndUsage,
    isAuthLoading || !isAuthenticated ? 'skip' : {},
  );

  if (isAuthLoading || planAndUsage === undefined) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }

  const currentPlan = planAndUsage?.plan as PlanKey | undefined;
  const hasAccess = Boolean(
    currentPlan && PLAN_CATALOG[currentPlan]?.features[featureKey],
  );

  if (hasAccess) {
    return <>{children}</>;
  }

  const scenario = resolveScenario(currentPlan);

  return <GateOverlay scenario={scenario} className={className} title={title} description={description}>{children}</GateOverlay>;
}

function GateOverlay({
  scenario,
  children,
  className,
  title,
  description,
}: {
  scenario: UpgradeScenario;
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
}) {
  useScrollLock();

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        // Full height below header; pull up by py-8 (2rem) to compensate for
        // main's top padding so the card lands on the true visual center.
        '-mt-8 h-[calc(100svh-57px)]',
        className,
      )}
    >
      {/* Blurred background content */}
      <div className="pointer-events-none select-none blur-sm opacity-25 absolute inset-0 overflow-hidden">
        {children}
      </div>

      {/* Embedded upgrade card — centered in the full visible area */}
      <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-[4px] px-6">
        <div className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden">
          <UpgradeCard scenario={scenario} title={title} description={description} />
        </div>
      </div>
    </div>
  );
}
