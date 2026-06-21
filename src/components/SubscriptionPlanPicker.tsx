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
  getEnterpriseColumnFeatureGroups,
  getPlanPickerCards,
  type BillingInterval,
  type PlanKey,
  type PlanPickerCard,
} from '../../shared/planCatalog';
import { PricingEnterpriseBanner } from '@/components/pricing/PricingEnterpriseBanner';
import { PricingFeatureList } from '@/components/pricing/PricingFeatureList';
import { pricingSectionBorderClass, type PlanPickerDensity } from '@/components/pricing/pricingStyles';

const planPriceClassDefault =
  'font-sans text-4xl font-normal tracking-tight text-foreground';
const planPriceClassCompact =
  'font-sans text-3xl font-normal tracking-tight text-foreground';

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
  density?: PlanPickerDensity;
  /** Pricing page uses a bottom banner; the plan dialog uses a fifth column. */
  enterpriseLayout?: 'banner' | 'column';
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
  density = 'default',
  enterpriseLayout = 'banner',
  onViewAllFeatures,
  className,
}: SubscriptionPlanPickerProps) {
  const isCompact = density === 'compact';
  const allCards = plans ?? getPlanPickerCards({ includeEnterprise });
  const showEnterpriseBanner =
    variant === 'pricing' && includeEnterprise && enterpriseLayout === 'banner';
  const gridCards =
    showEnterpriseBanner || !includeEnterprise
      ? allCards.filter((plan): plan is PlanPickerCard & { isEnterprise?: false } => !plan.isEnterprise)
      : allCards;
  const showFullFeatures = variant === 'pricing';
  const enterpriseColumnCount = gridCards.some((plan) => plan.isEnterprise) ? 5 : 4;

  return (
    <div className={cn('flex flex-col', isCompact ? 'gap-4' : 'gap-8', className)}>
      {showBillingToggle && (
        <PlanBillingToggle
          billingInterval={billingInterval}
          onChange={onBillingIntervalChange}
          density={density}
        />
      )}

      <div className={cn('flex flex-col', isCompact ? 'min-h-0 flex-1 gap-2' : 'gap-4')}>
        <div
          className={cn(
            'grid grid-cols-1 items-stretch sm:grid-cols-2',
            isCompact
              ? cn(
                  'min-h-0 flex-1 gap-2',
                  enterpriseColumnCount === 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4',
                )
              : cn(
                  'gap-4',
                  enterpriseColumnCount === 5 ? 'xl:grid-cols-5' : 'xl:grid-cols-4',
                ),
          )}
        >
          {gridCards.map((plan) => {
            const isCurrent = !plan.isEnterprise && currentPlanId === plan.id;
            const highlightCurrent = variant === 'account' && isCurrent;
            const showPopularHighlight =
              plan.popular &&
              !highlightCurrent &&
              (variant === 'onboarding' || variant === 'pricing' || currentPlanId == null);
            const enterpriseCustomFeatures =
              plan.isEnterprise === true && enterpriseLayout === 'column';

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
                enterpriseCustomFeatures={enterpriseCustomFeatures}
                density={density}
                onViewAllFeatures={!showFullFeatures ? onViewAllFeatures : undefined}
                action={renderPlanAction(plan)}
              />
            );
          })}
        </div>

        {showEnterpriseBanner ? <PricingEnterpriseBanner density={density} /> : null}
      </div>
    </div>
  );
}

export function PlanBillingToggle({
  billingInterval,
  onChange,
  className,
  density = 'default',
}: {
  billingInterval: BillingInterval;
  onChange: (interval: BillingInterval) => void;
  className?: string;
  density?: PlanPickerDensity;
}) {
  const isCompact = density === 'compact';

  return (
    <div className={cn('flex flex-col items-center', isCompact ? 'gap-2.5' : 'gap-3', className)}>
      <div className="inline-flex items-center rounded-full border border-border/70 bg-muted/40 p-0.5">
        <button
          type="button"
          onClick={() => onChange('monthly')}
          className={cn(
            'rounded-full font-medium transition-all',
            isCompact ? 'px-3.5 py-1 text-xs' : 'px-5 py-2 text-sm',
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
            'rounded-full font-medium transition-all',
            isCompact ? 'px-3.5 py-1 text-xs' : 'px-5 py-2 text-sm',
            billingInterval === 'annual'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Yearly
        </button>
      </div>

      <p
        className={cn(
          'flex items-center gap-2 text-muted-foreground',
          isCompact ? 'pb-1 text-[11px]' : 'pb-1.5 text-sm',
        )}
      >
        <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-orange-400 shadow-sm">
          <Check className="size-2.5 text-white" strokeWidth={3} />
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
  enterpriseCustomFeatures?: boolean;
  density?: PlanPickerDensity;
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
  enterpriseCustomFeatures = false,
  density = 'default',
  onViewAllFeatures,
  action,
}: SubscriptionPlanCardProps) {
  const isEnterprise = plan.isEnterprise === true;
  const isCompact = density === 'compact';
  const planPriceClass = isCompact ? planPriceClassCompact : planPriceClassDefault;
  const displayFeatureGroups =
    showFullFeatures && plan.featureGroups
      ? enterpriseCustomFeatures
        ? getEnterpriseColumnFeatureGroups()
        : plan.featureGroups
      : undefined;

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
      <CardHeader
        className={cn(
          'shrink-0 rounded-none',
          isCompact ? 'px-4 pb-2 pt-4 min-h-[100px]' : 'px-6 pb-5 pt-6 min-h-[150px]',
        )}
      >
        <div className={cn(isCompact ? 'flex flex-col gap-2' : undefined)}>
          <div className={cn('flex items-center', isCompact ? 'min-h-6' : 'min-h-8')}>
            <CardTitle
              className={cn(
                'font-semibold tracking-tight',
                isCompact
                  ? 'flex flex-wrap items-center gap-x-2 gap-y-1 text-base leading-5'
                  : 'flex flex-wrap items-center gap-x-2 gap-y-1 text-xl',
                isEnterprise ? 'text-white' : 'text-foreground',
              )}
            >
              {plan.name}
              {plan.popular && !isCurrent ? (
                <span className="shrink-0 inline-flex items-center justify-center rounded-full bg-zinc-100 px-2 py-1 text-[8px] font-bold uppercase tracking-wide text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 leading-none">
                  Popular
                </span>
              ) : null}
              {isCurrent ? (
                <Badge
                  variant="secondary"
                  className="rounded-md border border-foreground/15 bg-background/80 px-2 py-0 text-[10px] font-semibold text-foreground"
                >
                  Current
                </Badge>
              ) : null}
            </CardTitle>
          </div>

          <div className={cn(
            isCompact ? 'flex flex-col' : 'mt-4 flex flex-col'
          )}>
            {isEnterprise ? (
              <p
                className={cn(
                  'font-normal tracking-tight text-white',
                  isCompact ? 'text-3xl leading-none' : 'text-3xl',
                )}
              >
                {plan.customPriceLabel}
              </p>
            ) : (
              <div className="flex flex-col">
                <div className="flex items-baseline gap-2">
                  <div className="flex items-baseline gap-1">
                    <span className={planPriceClass}>RM</span>
                    {plan.id === 'free' ? (
                      <span className={planPriceClass}>0</span>
                    ) : (
                      <WordRotate
                        inline
                        words={[
                          formatPlanPriceAmount(plan.monthlyPriceRm),
                          formatPlanPriceAmount(plan.yearlyPriceRm ?? 0),
                        ]}
                        activeIndex={billingInterval === 'monthly' ? 0 : 1}
                        className={planPriceClass}
                      />
                    )}
                  </div>
                  <span className="shrink-0 text-xs font-medium text-muted-foreground">
                    {plan.id === 'free' ? '/ forever' : billingInterval === 'monthly' ? '/ month' : '/ year'}
                  </span>
                </div>
                {billingInterval === 'annual' && plan.id !== 'free' && (
                  <div className={cn(
                    "flex items-baseline gap-2 text-sm text-muted-foreground leading-none font-medium",
                    isCompact ? "mt-0.5" : "mt-1.5"
                  )}>
                    <span>RM {formatPlanPriceAmount(plan.annualPriceRm)}</span>
                    <span className="text-xs font-normal">/ month</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <PricingFeatureList
        featureGroups={displayFeatureGroups}
        featureRows={showFullFeatures ? undefined : plan.featureRows}
        features={showFullFeatures ? undefined : plan.keyFeatures}
        header={showFullFeatures ? undefined : plan.featureSectionHeader}
        planId={plan.isEnterprise ? undefined : plan.id}
        isEnterprise={isEnterprise}
        density={density}
        onViewAll={!showFullFeatures ? onViewAllFeatures : undefined}
        className={cn('flex-1 border-t', pricingSectionBorderClass(isEnterprise))}
      />

      {action ? (
        <CardFooter
          className={cn(
            'mt-auto w-full shrink-0 rounded-none border-t',
            isCompact ? 'px-4 pb-4 pt-3' : 'px-6 pb-6 pt-5',
          )}
        >
          {action}
        </CardFooter>
      ) : null}
    </Card>
  );
}

export function EnterprisePlanAction({
  label,
  to = '/contact?intent=enterprise',
  className,
}: {
  label: ReactNode;
  to?: string;
  className?: string;
}) {
  return (
    <Button
      asChild
      className={cn(
        'h-8 w-full rounded-lg border-0 bg-white text-xs font-medium text-zinc-950 shadow-sm hover:bg-zinc-100 sm:text-sm',
        className,
      )}
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
        className="h-8 w-full rounded-lg border-foreground/20 bg-background/70 text-xs font-semibold text-foreground shadow-none sm:text-sm"
      >
        {label}
      </Button>
    );
  }

  const useProHighlight = emphasizeRecommended && planId === 'growth';

  return (
    <Button
      type="button"
      variant={useProHighlight ? 'default' : 'secondary'}
      disabled={disabled || loading}
      onClick={onClick}
      className={cn(
        'h-8 w-full rounded-lg text-xs font-medium sm:text-sm',
        useProHighlight &&
          'border-0 bg-zinc-950 text-white hover:bg-zinc-900 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-800',
      )}
    >
      {label}
    </Button>
  );
}
