import { Check, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  pricingDottedUnderlineClass,
  pricingFeatureGroupTitleClass,
  pricingFeatureRowClass,
  pricingFeatureTextClass,
  pricingSectionBorderClass,
  pricingViewAllLinkClass,
} from './pricingStyles';
import { PricingAiFeatureLabel } from './PricingAiFeatureLabel';
import { renderPricingFeatureLabel } from './pricingFeatureHover';
import {
  type PlanCardFeatureRow,
  type PlanFeatureGroup,
  type PlanKey,
} from '../../../shared/planCatalog';

type PricingFeatureListProps = {
  header?: string;
  features?: string[];
  featureRows?: PlanCardFeatureRow[];
  featureGroups?: PlanFeatureGroup[];
  planId?: PlanKey;
  isEnterprise?: boolean;
  onViewAll?: () => void;
  className?: string;
};

function FeatureRowItem({
  row,
  planId,
  isEnterprise,
  showRowUnderline,
}: {
  row: PlanCardFeatureRow;
  planId?: PlanKey;
  isEnterprise: boolean;
  showRowUnderline: boolean;
}) {
  return (
    <li className={cn('flex min-h-[2.75rem] flex-col', pricingFeatureRowClass)}>
      <div className="flex flex-1 items-start gap-2">
        {row.included ? (
          <Check
            className={cn(
              'mt-0.5 size-4 shrink-0',
              isEnterprise ? 'text-white' : 'text-foreground',
            )}
          />
        ) : (
          <span className="mt-0.5 size-4 shrink-0" aria-hidden />
        )}
        <span
          className={cn(
            'min-w-0 flex-1 text-base leading-snug',
            row.included
              ? pricingFeatureTextClass(isEnterprise)
              : isEnterprise
                ? 'text-zinc-500'
                : 'text-muted-foreground/45',
          )}
        >
          {row.included ? (
                      <PricingAiFeatureLabel label={row.text}>
                        {renderPricingFeatureLabel(row.text, planId, isEnterprise)}
                      </PricingAiFeatureLabel>
          ) : (
            '—'
          )}
          {showRowUnderline ? (
            <span className={pricingDottedUnderlineClass(isEnterprise)} aria-hidden />
          ) : null}
        </span>
      </div>
    </li>
  );
}

export function PricingFeatureList({
  header,
  features,
  featureRows,
  featureGroups,
  planId,
  isEnterprise = false,
  onViewAll,
  className,
}: PricingFeatureListProps) {
  const useGroupedRows = featureGroups != null;
  const useAlignedRows = !useGroupedRows && featureRows != null;
  const showRowUnderline = !useGroupedRows;

  return (
    <div className={cn('flex flex-1 flex-col px-6 py-6', className)}>
      {header ? (
        <div className="flex items-center gap-1.5 py-1">
          <ListChecks
            className={cn(
              'size-3 shrink-0',
              isEnterprise ? 'text-zinc-400' : 'text-muted-foreground',
            )}
          />
          <p
            className={cn(
              'text-xs font-medium',
              isEnterprise ? 'text-zinc-300' : 'text-muted-foreground',
            )}
          >
            {header}
          </p>
        </div>
      ) : null}

      <div className={cn('flex flex-1 flex-col gap-0', header ? 'mt-5' : undefined)}>
        {useGroupedRows
          ? featureGroups.map((group, groupIndex) => (
              <div
                key={group.title ?? group.rows[0]?.text ?? 'group'}
                className={cn(
                  groupIndex > 0 && 'mt-4 border-t pt-4',
                  pricingSectionBorderClass(isEnterprise),
                )}
              >
                {group.title ? (
                  <p className={cn('mb-2', pricingFeatureGroupTitleClass(isEnterprise))}>
                    {group.title}
                  </p>
                ) : null}
                <ul className="flex flex-col">
                  {group.rows.map((row, index) => (
                    <FeatureRowItem
                      key={`${group.title ?? 'group'}-${row.text}-${index}`}
                      row={row}
                      planId={planId}
                      isEnterprise={isEnterprise}
                      showRowUnderline={showRowUnderline}
                    />
                  ))}
                </ul>
              </div>
            ))
          : null}

        {useAlignedRows ? (
          <ul className="flex flex-1 flex-col">
            {featureRows.map((row, index) => (
              <FeatureRowItem
                key={`${row.text}-${index}`}
                row={row}
                planId={planId}
                isEnterprise={isEnterprise}
                showRowUnderline={showRowUnderline}
              />
            ))}
          </ul>
        ) : null}

        {!useGroupedRows && !useAlignedRows && features ? (
          <ul className="flex flex-col">
            {features.map((feature) => (
              <li key={feature} className="py-2 first:pt-0 last:pb-0">
                <div className="flex items-start gap-2">
                  <Check
                    className={cn(
                      'mt-0.5 size-4 shrink-0',
                      isEnterprise ? 'text-white' : 'text-foreground',
                    )}
                  />
                  <span className={cn('min-w-0 flex-1', pricingFeatureTextClass(isEnterprise))}>
                    <PricingAiFeatureLabel label={feature}>
                      {renderPricingFeatureLabel(feature, planId, isEnterprise)}
                    </PricingAiFeatureLabel>
                    <span className={pricingDottedUnderlineClass(isEnterprise)} aria-hidden />
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {onViewAll && (
        <button
          type="button"
          onClick={onViewAll}
          className={cn('mt-4 text-left', pricingViewAllLinkClass(isEnterprise))}
        >
          View all features
        </button>
      )}
    </div>
  );
}
