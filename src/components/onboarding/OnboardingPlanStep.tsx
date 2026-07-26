import { ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import type { BillingInterval, PlanKey } from '../../../shared/planCatalog';
import {
  EnterprisePlanAction,
  SubscriptionPlanActionButton,
  SubscriptionPlanPicker,
} from '@/components/SubscriptionPlanPicker';
import { PlanSelectionLayout } from '@/components/pricing/PlanSelectionLayout';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

export function OnboardingPlanStep({
  billingInterval,
  selectedPlan,
  submitting,
  onBillingIntervalChange,
  onSelectPlan,
  onBack,
}: {
  billingInterval: BillingInterval;
  selectedPlan: PlanKey | null;
  submitting: boolean;
  onBillingIntervalChange: (interval: BillingInterval) => void;
  onSelectPlan: (plan: PlanKey) => void;
  onBack: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-8"
    >
      <PlanSelectionLayout>
        <SubscriptionPlanPicker
          variant="pricing"
          enterpriseLayout="column"
          includeEnterprise
          billingInterval={billingInterval}
          onBillingIntervalChange={onBillingIntervalChange}
          disabled={submitting}
          renderPlanAction={(plan) => {
            if (plan.isEnterprise) {
              return <EnterprisePlanAction label="Contact our sales" />;
            }
            return (
              <SubscriptionPlanActionButton
                planId={plan.id}
                disabled={submitting}
                loading={submitting && selectedPlan === plan.id}
                label={
                  submitting && selectedPlan === plan.id ? (
                    <Spinner className="size-3.5" />
                  ) : (
                    plan.actionLabel
                  )
                }
                onClick={() => onSelectPlan(plan.id)}
              />
            );
          }}
        />
      </PlanSelectionLayout>
      <Button
        type="button"
        variant="outline"
        className="self-start"
        disabled={submitting}
        onClick={onBack}
      >
        <ArrowLeft />
        Back
      </Button>
    </motion.div>
  );
}
