import { Fragment } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlanModelsHoverHint } from './PlanModelsHoverHint';
import { PlanKnowledgeBaseHoverHint } from './PlanKnowledgeBaseHoverHint';
import { PricingAiFeatureLabel } from './PricingAiFeatureLabel';
import { renderPricingComparisonRowLabel } from './pricingFeatureHover';
import {
  pricingFeatureGroupTitleClass,
  pricingSectionBorderClass,
  pricingTableShellClass,
} from './pricingStyles';
import {
  COMPARISON_PLAN_ORDER,
  getComparisonPlanName,
  getGroupedPlanComparisonRows,
  isKnowledgeBaseLimitLabel,
  isPlanModelAccessLabel,
  type ComparisonPlanKey,
  type PlanKey,
} from '../../../shared/planCatalog';

type PlanComparisonTableProps = {
  id?: string;
  currentPlanId?: PlanKey | null;
  className?: string;
};

function ComparisonCell({
  value,
  planId,
}: {
  value: string | boolean;
  planId: ComparisonPlanKey;
}) {
  if (value === false) {
    return (
      <span
        className={cn(
          'text-base',
          planId === 'enterprise' ? 'text-zinc-500' : 'text-muted-foreground/45',
        )}
      >
        —
      </span>
    );
  }

  if (value === true) {
    return (
      <Check
        className={cn(
          'mx-auto size-4',
          planId === 'enterprise' ? 'text-white' : 'text-foreground',
        )}
        aria-label="Included"
      />
    );
  }

  if (planId !== 'enterprise' && isPlanModelAccessLabel(value)) {
    return (
      <PlanModelsHoverHint
        planId={planId}
        label={value}
        className="text-base text-foreground"
      />
    );
  }

  if (isKnowledgeBaseLimitLabel(value)) {
    return (
      <PlanKnowledgeBaseHoverHint
        label={value}
        className={cn(
          'text-base',
          planId === 'enterprise' ? 'text-zinc-200' : 'text-foreground',
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        'text-base',
        planId === 'enterprise' ? 'text-zinc-200' : 'text-foreground',
      )}
    >
      {value}
    </span>
  );
}

function ComparisonRowLabel({ label }: { label: string }) {
  return renderPricingComparisonRowLabel(label);
}

export function PlanComparisonTable({
  id,
  currentPlanId,
  className,
}: PlanComparisonTableProps) {
  const groups = getGroupedPlanComparisonRows();

  return (
    <section id={id} className={cn('w-full', className)}>
      <h2 className="mb-10 text-center text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        Compare plans
      </h2>

      <div className={pricingTableShellClass}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[84rem] border-collapse table-fixed">
            <colgroup>
              <col className="w-[14rem]" />
              {COMPARISON_PLAN_ORDER.map((planId) => (
                <col key={planId} className="w-[14rem]" />
              ))}
            </colgroup>
            <thead>
              <tr className={cn('border-b', pricingSectionBorderClass())}>
                <th className="px-8 py-5" />
                {COMPARISON_PLAN_ORDER.map((planId) => (
                  <th
                    key={planId}
                    className={cn(
                      'border-l px-8 py-5 text-center align-middle',
                      pricingSectionBorderClass(),
                      planId === 'enterprise' && 'bg-zinc-950 text-white',
                      planId !== 'enterprise' && currentPlanId === planId && 'bg-muted/20',
                    )}
                  >
                    <p
                      className={cn(
                        'text-lg font-semibold tracking-tight',
                        planId === 'enterprise' ? 'text-white' : 'text-foreground',
                      )}
                    >
                      {getComparisonPlanName(planId)}
                    </p>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {groups.map((group) => (
                <Fragment key={group.title ?? group.rows[0]?.label ?? 'group'}>
                  {group.title ? (
                    <tr className={cn('border-b', pricingSectionBorderClass())}>
                      <th
                        colSpan={COMPARISON_PLAN_ORDER.length + 1}
                        scope="colgroup"
                        className="px-8 py-3 text-left"
                      >
                        <p className={pricingFeatureGroupTitleClass()}>{group.title}</p>
                      </th>
                    </tr>
                  ) : null}
                  {group.rows.map((row) => (
                    <tr
                      key={row.label}
                      className={cn('border-b border-dotted', pricingSectionBorderClass())}
                    >
                      <th
                        scope="row"
                        className="px-8 py-4 text-left align-middle text-sm font-medium text-muted-foreground"
                      >
                        <PricingAiFeatureLabel label={row.label}>
                          <ComparisonRowLabel label={row.label} />
                        </PricingAiFeatureLabel>
                      </th>
                      {COMPARISON_PLAN_ORDER.map((planId) => (
                        <td
                          key={`${row.label}-${planId}`}
                          className={cn(
                            'border-l px-8 py-4 text-center align-middle',
                            pricingSectionBorderClass(),
                            planId === 'enterprise' && 'bg-zinc-950 text-white',
                            planId !== 'enterprise' && currentPlanId === planId && 'bg-muted/20',
                          )}
                        >
                          <div className="flex justify-center">
                            <ComparisonCell
                              value={row.values[planId]}
                              planId={planId}
                            />
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
