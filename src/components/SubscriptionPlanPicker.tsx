import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ShineBorder } from '@/components/ui/shine-border';
import { WordRotate } from '@/components/ui/word-rotate';
import { cn } from '@/lib/utils';
import {
  formatPlanPriceAmount,
  getPlanPickerCards,
  type BillingInterval,
  type PlanKey,
  type PlanPickerCard,
} from '../../shared/planCatalog';
import { PricingEnterpriseBanner } from '@/components/pricing/PricingEnterpriseBanner';
import { PricingFeatureList } from '@/components/pricing/PricingFeatureList';
import { pricingSectionBorderClass } from '@/components/pricing/pricingStyles';

const planPriceClass =
  'font-sans text-4xl font-semibold tracking-tight text-foreground';

type SubscriptionPlanPickerProps = {
  billingInterval: BillingInterval;
  onBillingIntervalChange: (interval: BillingInterval) => void;
  renderPlanAction: (plan: PlanPickerCard) => ReactNode;
  plans?: PlanPickerCard[];
  currentPlanId?: PlanKey | null;
  disabled?: boolean;
  showBillingToggle?: boolean;
  includeEnterprise?: boolean;
  /** Onboarding keeps the recommended Pro styling; pricing shows full features + bottom enterprise banner. */
  variant?: 'onboarding' | 'account' | 'pricing';
  onViewAllFeatures?: () => void;
  className?: string;
};

/** Shared pricing cards: onboarding, account plan dialog, and public pricing page. */
export function SubscriptionPlanPicker({
  billingInterval,
  onBillingIntervalChange,
  renderPlanAction,
  plans,
  currentPlanId = null,
  disabled = false,
  showBillingToggle = true,
  includeEnterprise = false,
  variant = 'account',
  onViewAllFeatures,
  className,
}: SubscriptionPlanPickerProps) {
  const allCards = plans ?? getPlanPickerCards({ includeEnterprise });
  const showEnterpriseBanner = variant === 'pricing' && includeEnterprise;
  const gridCards = showEnterpriseBanner
    ? allCards.filter((plan): plan is PlanPickerCard & { isEnterprise?: false } => !plan.isEnterprise)
    : allCards;
  const showFullFeatures = variant === 'pricing';

  return (
    <div className={cn('flex flex-col gap-8', className)}>
      {showBillingToggle && (
        <PlanBillingToggle billingInterval={billingInterval} onChange={onBillingIntervalChange} />
      )}

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {gridCards.map((plan) => {
            const isCurrent = !plan.isEnterprise && currentPlanId === plan.id;
            const highlightCurrent = variant === 'account' && isCurrent;
            const showPopularHighlight =
              plan.popular &&
              !highlightCurrent &&
              (variant === 'onboarding' || variant === 'pricing' || currentPlanId == null);

            return (
              <SubscriptionPlanCard
                key={plan.id}
                plan={plan}
                billingInterval={billingInterval}
                isCurrent={isCurrent}
                highlightCurrent={highlightCurrent}
                showPopularHighlight={showPopularHighlight}
                disabled={disabled}
                showFullFeatures={showFullFeatures}
                onViewAllFeatures={!showFullFeatures ? onViewAllFeatures : undefined}
                action={renderPlanAction(plan)}
              />
            );
          })}
        </div>

        {showEnterpriseBanner && <PricingEnterpriseBanner />}
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
  plan: PlanPickerCard;
  billingInterval: BillingInterval;
  isCurrent: boolean;
  highlightCurrent?: boolean;
  showPopularHighlight?: boolean;
  disabled?: boolean;
  showFullFeatures?: boolean;
  onViewAllFeatures?: () => void;
  action: ReactNode;
};

function SubscriptionPlanCard({
  plan,
  billingInterval,
  isCurrent,
  highlightCurrent = false,
  showPopularHighlight = false,
  disabled = false,
  showFullFeatures = false,
  onViewAllFeatures,
  action,
}: SubscriptionPlanCardProps) {
  const isEnterprise = plan.isEnterprise === true;

  return (
    <Card
      className={cn(
        'relative flex h-full min-w-0 flex-col gap-0 overflow-hidden rounded-xl border py-0 shadow-none ring-0 transition-colors',
        highlightCurrent
          ? 'border-foreground/20 bg-muted/35 dark:border-foreground/25 dark:bg-muted/25'
          : showPopularHighlight
            ? 'border-foreground/15 bg-card dark:border-foreground/20'
            : isEnterprise
              ? 'border-zinc-800 bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-white shadow-lg'
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
      <CardHeader className="rounded-none px-6 pb-5 pt-6">
        <CardTitle
          className={cn(
            'flex flex-wrap items-center gap-x-2 gap-y-1 text-xl font-semibold tracking-tight',
            isEnterprise ? 'text-white' : 'text-foreground',
          )}
        >
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

        <div className="mt-4">
          {isEnterprise ? (
            <p className="text-3xl font-normal tracking-tight text-white">{plan.customPriceLabel}</p>
          ) : (
            <div className="flex h-12 items-baseline gap-2.5">
              <div className="flex items-baseline gap-1">
                <span className={planPriceClass}>RM</span>
                {plan.id === 'free' ? (
                  <span className={planPriceClass}>0</span>
                ) : (
                  <WordRotate
                    inline
                    words={[
                      formatPlanPriceAmount(plan.monthlyPriceRm),
                      formatPlanPriceAmount(plan.annualPriceRm),
                    ]}
                    activeIndex={billingInterval === 'monthly' ? 0 : 1}
                    className={planPriceClass}
                  />
                )}
              </div>
              <span className="shrink-0 text-xs font-medium text-muted-foreground">
                {plan.id === 'free' ? '/ forever' : '/ mo.'}
              </span>
            </div>
          )}
        </div>
      </CardHeader>

      <PricingFeatureList
        featureGroups={showFullFeatures ? plan.featureGroups : undefined}
        featureRows={showFullFeatures ? undefined : plan.featureRows}
        features={showFullFeatures ? undefined : plan.keyFeatures}
        header={showFullFeatures ? undefined : plan.featureSectionHeader}
        planId={plan.isEnterprise ? undefined : plan.id}
        isEnterprise={isEnterprise}
        onViewAll={!showFullFeatures ? onViewAllFeatures : undefined}
        className={cn('flex-1 border-t', pricingSectionBorderClass(isEnterprise))}
      />

      <CardFooter className="mt-auto w-full rounded-none border-t px-6 pb-6 pt-5">{action}</CardFooter>
    </Card>
  );
}

export function EnterprisePlanAction({
  label,
  to = '/contact?intent=enterprise',
}: {
  label: ReactNode;
  to?: string;
}) {
  return (
    <Button
      asChild
      className="h-9 w-full rounded-lg border-0 bg-white text-sm font-medium text-zinc-950 shadow-sm hover:bg-zinc-100"
    >
      <Link to={to}>{label}</Link>
    </Button>
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
  emphasizeRecommended?: boolean;
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
        useProHighlight &&
          'border-0 bg-zinc-950 text-white hover:bg-zinc-900 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-800',
      )}
    >
      {label}
    </Button>
  );
}
