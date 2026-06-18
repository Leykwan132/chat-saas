import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlanModelsHoverHint } from './PlanModelsHoverHint';
import { PlanKnowledgeBaseHoverHint } from './PlanKnowledgeBaseHoverHint';
import { renderPricingComparisonRowLabel } from './pricingFeatureHover';
import {
  pricingSectionBorderClass,
  pricingTableShellClass,
} from './pricingStyles';
import {
  getComparisonPlanName,
  getPlanComparisonRows,
  isKnowledgeBaseLimitLabel,
  isPlanModelAccessLabel,
  PLAN_ORDER,
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
  planId: PlanKey;
}) {
  if (value === false) {
    return <span className="text-base text-muted-foreground/45">—</span>;
  }

  if (value === true) {
    return (
      <Check className="mx-auto size-4 text-foreground" aria-label="Included" />
    );
  }

  if (isPlanModelAccessLabel(value)) {
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
        className="text-base text-foreground"
      />
    );
  }

  return <span className="text-base text-foreground">{value}</span>;
}

function ComparisonRowLabel({ label }: { label: string }) {
  return renderPricingComparisonRowLabel(label);
}

export function PlanComparisonTable({
  id,
  currentPlanId,
  className,
}: PlanComparisonTableProps) {
  const rows = getPlanComparisonRows();

  return (
    <section id={id} className={cn('w-full', className)}>
      <h2 className="mb-10 text-center text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        Compare plans
      </h2>

      <div className={pricingTableShellClass}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] border-collapse table-fixed">
            <colgroup>
              <col className="w-[14rem]" />
              {PLAN_ORDER.map((planId) => (
                <col key={planId} className="w-[14rem]" />
              ))}
            </colgroup>
            <thead>
              <tr className={cn('border-b', pricingSectionBorderClass())}>
                <th className="px-8 py-5" />
                {PLAN_ORDER.map((planId) => (
                  <th
                    key={planId}
                    className={cn(
                      'border-l px-8 py-5 text-center align-middle',
                      pricingSectionBorderClass(),
                      currentPlanId === planId && 'bg-muted/20',
                    )}
                  >
                    <p className="text-lg font-semibold tracking-tight text-foreground">
                      {getComparisonPlanName(planId)}
                    </p>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.label}
                  className={cn('border-b border-dotted', pricingSectionBorderClass())}
                >
                  <th
                    scope="row"
                    className="px-8 py-4 text-center align-middle text-sm font-medium text-muted-foreground"
                  >
                    <ComparisonRowLabel label={row.label} />
                  </th>
                  {PLAN_ORDER.map((planId) => (
                    <td
                      key={`${row.label}-${planId}`}
                      className={cn(
                        'border-l px-8 py-4 text-center align-middle',
                        pricingSectionBorderClass(),
                        currentPlanId === planId && 'bg-muted/20',
                      )}
                    >
                      <div className="flex justify-center">
                        <ComparisonCell value={row.values[planId]} planId={planId} />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
