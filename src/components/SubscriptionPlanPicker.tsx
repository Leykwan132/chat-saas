import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ShineBorder } from '@/components/ui/shine-border';
import { WordRotate } from '@/components/ui/word-rotate';
import { cn } from '@/lib/utils';
import {
  formatPlanPriceRm,
  getOnboardingPlanCards,
  isPlanIncludesLine,
  type BillingInterval,
  type OnboardingPlanCard,
  type PlanKey,
} from '../../shared/planCatalog';

type SubscriptionPlanPickerProps = {
  billingInterval: BillingInterval;
  onBillingIntervalChange: (interval: BillingInterval) => void;
  renderPlanAction: (plan: OnboardingPlanCard) => ReactNode;
  plans?: OnboardingPlanCard[];
  currentPlanId?: PlanKey | null;
  disabled?: boolean;
  showBillingToggle?: boolean;
  /** Onboarding keeps the recommended Pro styling; account/pricing use uniform buttons + shine on current plan. */
  variant?: 'onboarding' | 'account';
  className?: string;
};

/** Shared pricing table: onboarding, account plan dialog, and public pricing page. */
export function SubscriptionPlanPicker({
  billingInterval,
  onBillingIntervalChange,
  renderPlanAction,
  plans = getOnboardingPlanCards(),
  currentPlanId = null,
  disabled = false,
  showBillingToggle = true,
  variant = 'account',
  className,
}: SubscriptionPlanPickerProps) {
  return (
    <div className={cn('flex flex-col gap-8', className)}>
      {showBillingToggle && <PlanBillingToggle billingInterval={billingInterval} onChange={onBillingIntervalChange} />}

      <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => (
          <SubscriptionPlanCard
            key={plan.id}
            plan={plan}
            billingInterval={billingInterval}
            isCurrent={currentPlanId === plan.id}
            highlightCurrent={variant === 'account' && currentPlanId === plan.id}
            disabled={disabled}
            action={renderPlanAction(plan)}
          />
        ))}
      </div>
    </div>
  );
}

export function PlanBillingToggle({
  billingInterval,
  onChange,
  className,
}: {
  billingInterval: BillingInterval;
  onChange: (interval: BillingInterval) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center gap-2.5', className)}>
      <div className="inline-flex items-center rounded-full border border-border/70 bg-muted/40 p-1">
        <button
          type="button"
          onClick={() => onChange('monthly')}
          className={cn(
            'rounded-full px-5 py-2 text-sm font-medium transition-all',
            billingInterval === 'monthly'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => onChange('annual')}
          className={cn(
            'rounded-full px-5 py-2 text-sm font-medium transition-all',
            billingInterval === 'annual'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Yearly
        </button>
      </div>

      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-orange-400 shadow-sm">
          <Check className="size-3 text-white" strokeWidth={3} />
        </span>
        20% off yearly plans
      </p>
    </div>
  );
}

type SubscriptionPlanCardProps = {
  plan: OnboardingPlanCard;
  billingInterval: BillingInterval;
  isCurrent: boolean;
  highlightCurrent?: boolean;
  disabled?: boolean;
  action: ReactNode;
};

function SubscriptionPlanCard({
  plan,
  billingInterval,
  isCurrent,
  highlightCurrent = false,
  disabled = false,
  action,
}: SubscriptionPlanCardProps) {
  const showPopularHighlight = plan.popular && !highlightCurrent;

  return (
    <Card
      className={cn(
        'relative h-full min-w-0 overflow-hidden rounded-xl border shadow-none ring-0 transition-colors',
        highlightCurrent
          ? 'border-foreground/20 bg-muted/35 dark:border-foreground/25 dark:bg-muted/25'
          : showPopularHighlight
            ? 'border-foreground/15 bg-card dark:border-foreground/20'
            : 'border-border/70 bg-card',
        disabled && 'pointer-events-none opacity-60',
      )}
    >
      {(highlightCurrent || showPopularHighlight) && (
        <ShineBorder
          borderWidth={1.5}
          shineColor={['#A07CFE', '#FE8FB5', '#FFBE7B']}
        />
      )}
      <CardHeader className="rounded-none">
        <CardTitle className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xl font-semibold tracking-tight text-foreground">
          {plan.name}
          {plan.popular && !isCurrent && (
            <span className="shrink-0 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:bg-amber-400/20 dark:text-amber-400">
              Popular
            </span>
          )}
          {isCurrent && (
            <Badge
              variant="secondary"
              className="rounded-md border border-foreground/15 bg-background/80 px-2 py-0 text-[10px] font-semibold text-foreground"
            >
              Current
            </Badge>
          )}
        </CardTitle>

        <div className="mt-4 flex flex-col justify-start">
          <div className="flex h-10 items-baseline gap-1.5">
            {plan.id === 'free' ? (
              <span className="text-4xl font-normal tracking-tight text-foreground">
                {formatPlanPriceRm(plan.monthlyPriceRm)}
              </span>
            ) : (
              <WordRotate
                inline
                words={[
                  formatPlanPriceRm(plan.monthlyPriceRm),
                  formatPlanPriceRm(plan.annualPriceRm),
                ]}
                activeIndex={billingInterval === 'monthly' ? 0 : 1}
                className="text-4xl font-normal tracking-tight text-foreground"
                motionProps={{
                  initial: { opacity: 0, y: 12 },
                  animate: { opacity: 1, y: 0 },
                  exit: { opacity: 0, y: -12 },
                  transition: { duration: 0.2, ease: 'easeOut' },
                }}
              />
            )}
            <span className="text-xs font-medium text-muted-foreground">
              {plan.id === 'free' ? '/ forever' : '/ mo.'}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 border-t border-border/60 pt-3">
        <ul className="space-y-1.5">
          {plan.features.map((feature, index) => (
            <li
              key={index}
              className={cn(
                'flex gap-2 text-base',
                isPlanIncludesLine(feature)
                  ? 'font-medium text-foreground'
                  : 'items-center text-muted-foreground',
              )}
            >
              {!isPlanIncludesLine(feature) && (
                <Check className="size-4 shrink-0 text-foreground" />
              )}
              {feature}
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="mt-auto w-full rounded-none">{action}</CardFooter>
    </Card>
  );
}

export function SubscriptionPlanActionButton({
  planId,
  label,
  disabled,
  loading,
  emphasizeRecommended = true,
  isCurrentPlan = false,
  onClick,
}: {
  planId: PlanKey;
  label: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  /** When false, all plans use the same secondary button style (account/pricing). */
  emphasizeRecommended?: boolean;
  /** Selected state for the active subscription plan in account billing. */
  isCurrentPlan?: boolean;
  onClick: () => void;
}) {
  if (isCurrentPlan) {
    return (
      <Button
        type="button"
        variant="outline"
        disabled
        className="h-9 w-full rounded-lg border-foreground/20 bg-background/70 text-sm font-semibold text-foreground shadow-none"
      >
        {label}
      </Button>
    );
  }

  const useProHighlight = emphasizeRecommended && planId === 'pro';

  return (
    <Button
      type="button"
      variant={useProHighlight ? 'default' : 'secondary'}
      disabled={disabled || loading}
      onClick={onClick}
      className={cn(
        'h-9 w-full rounded-lg text-sm font-medium',
        useProHighlight && 'border-0 bg-foreground text-background hover:bg-foreground/90',
      )}
    >
      {label}
    </Button>
  );
}
