import { Link } from 'react-router';
import { useQuery } from 'convex/react';
import { LockKeyhole } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  PLAN_CATALOG,
  PLAN_ORDER,
  type PlanFeatureFlags,
  type PlanKey,
} from '../../shared/planCatalog';
import { cn } from '@/lib/utils';

type PlanFeatureGateProps = {
  featureKey: keyof PlanFeatureFlags;
  featureName: string;
  children: React.ReactNode;
  className?: string;
};

function getRequiredPlanName(featureKey: keyof PlanFeatureFlags) {
  const planKey = PLAN_ORDER.find((key) => PLAN_CATALOG[key].features[featureKey]);
  return planKey ? PLAN_CATALOG[planKey].name : 'a paid plan';
}

export function PlanFeatureGate({
  featureKey,
  featureName,
  children,
  className,
}: PlanFeatureGateProps) {
  const planAndUsage = useQuery(api.plans.getPlanAndUsage, {});

  if (planAndUsage === undefined) {
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

  const requiredPlanName = getRequiredPlanName(featureKey);

  return (
    <div className={cn('relative min-h-[28rem] overflow-hidden rounded-2xl', className)}>
      <div className="pointer-events-none select-none blur-[3px] opacity-45">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/55 p-6 backdrop-blur-[2px]">
        <div className="max-w-md rounded-2xl border border-border bg-card/95 p-6 text-center shadow-lg">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <LockKeyhole className="size-6" />
          </div>
          <h2 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
            Unlock {featureName}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {featureName} is available on {requiredPlanName} and above. Upgrade
            your plan or book a demo to see how it works for your team.
          </p>
          <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
            <Button asChild>
              <Link to="/workspace/settings?section=plan">Unlock plan</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/contact?intent=enterprise">See demo</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
