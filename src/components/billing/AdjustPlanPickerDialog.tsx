import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  EnterprisePlanAction,
  SubscriptionPlanActionButton,
  SubscriptionPlanPicker,
} from '@/components/SubscriptionPlanPicker';
import { cn } from '@/lib/utils';
import type {
  BillingInterval,
  PlanKey,
} from '../../../shared/planCatalog';
import { resolvePlanCardAction } from './adjustPlanFlow';

type AdjustPlanPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: PlanKey;
  billingInterval: BillingInterval;
  onBillingIntervalChange: (interval: BillingInterval) => void;
  loadingPlan: PlanKey | null;
  onSelectPlan: (plan: PlanKey) => void;
};

export function AdjustPlanPickerDialog({
  open,
  onOpenChange,
  currentPlan,
  billingInterval,
  onBillingIntervalChange,
  loadingPlan,
  onSelectPlan,
}: AdjustPlanPickerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          'fixed inset-0 z-50 m-0 flex h-svh w-svw max-w-none translate-none transform-none flex-col overflow-y-auto',
          'top-0 left-0 rounded-none border-0 bg-background p-0 shadow-none ring-0',
          'sm:top-0 sm:left-0 sm:max-w-none',
          'data-open:zoom-in-100 data-closed:zoom-out-100',
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col justify-start px-4 py-10 sm:px-8 sm:py-12 lg:justify-center">
          <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-7">
            <DialogHeader className="shrink-0 items-center text-center">
              <DialogTitle className="font-title text-3xl font-semibold tracking-tight sm:text-4xl">
                Choose your plan
              </DialogTitle>
            </DialogHeader>

            <SubscriptionPlanPicker
              variant="pricing"
              density="compact"
              compactSpacing="roomy"
              enterpriseLayout="column"
              includeEnterprise
              billingInterval={billingInterval}
              onBillingIntervalChange={onBillingIntervalChange}
              currentPlanId={currentPlan}
              disabled={loadingPlan !== null}
              renderPlanAction={(planCard) => {
                if (planCard.isEnterprise) {
                  return (
                    <EnterprisePlanAction label="Contact our sales" />
                  );
                }
                const action = resolvePlanCardAction(
                  currentPlan,
                  planCard.id,
                  loadingPlan,
                );
                return (
                  <SubscriptionPlanActionButton
                    planId={planCard.id}
                    emphasizeRecommended={planCard.id === 'growth'}
                    isCurrentPlan={planCard.id === currentPlan}
                    label={action.label}
                    disabled={action.disabled}
                    loading={action.loading}
                    onClick={() => onSelectPlan(planCard.id)}
                  />
                );
              }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
