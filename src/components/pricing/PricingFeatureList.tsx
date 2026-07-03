import { Check, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  pricingDottedUnderlineClass,
  pricingFeatureGroupTitleClass,
  pricingFeatureGroupSpacerClass,
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
import type {
  PlanPickerCompactSpacing,
  PlanPickerDensity,
} from '@/components/pricing/pricingStyles';

type PricingFeatureListProps = {
  header?: string;
  features?: string[];
  featureRows?: PlanCardFeatureRow[];
  featureGroups?: PlanFeatureGroup[];
  planId?: PlanKey;
  isEnterprise?: boolean;
  density?: PlanPickerDensity;
  compactSpacing?: PlanPickerCompactSpacing;
  onViewAll?: () => void;
  showDottedUnderlines?: boolean;
  className?: string;
};

function FeatureRowItem({
  row,
  planId,
  isEnterprise,
  showRowUnderline,
  isCompact,
}: {
  row: PlanCardFeatureRow;
  planId?: PlanKey;
  isEnterprise: boolean;
  showRowUnderline: boolean;
  isCompact: boolean;
}) {
  return (
    <li
      className={cn(
        'flex flex-col',
        isCompact ? 'h-6 justify-center' : 'min-h-[2.75rem]',
        !isCompact && pricingFeatureRowClass(isCompact),
      )}
    >
      <div className={cn('flex flex-1 items-center', isCompact ? 'gap-1.5' : 'gap-2')}>
        {row.included ? (
          <Check
            className={cn(
              'shrink-0',
              isCompact ? 'size-3.5' : 'size-4',
              isEnterprise ? 'text-white' : 'text-foreground',
            )}
          />
        ) : (
          <span className={cn('shrink-0', isCompact ? 'size-3.5' : 'size-4')} aria-hidden />
        )}
        <span
          className={cn(
            'min-w-0 flex-1',
            row.included
              ? pricingFeatureTextClass(isEnterprise, isCompact)
              : cn(
                  isCompact ? 'text-sm leading-snug' : 'text-base leading-snug',
                  isEnterprise ? 'text-zinc-500' : 'text-muted-foreground/45',
                ),
          )}
        >
          {row.included ? (
            <PricingAiFeatureLabel label={row.text}>
              {renderPricingFeatureLabel(row.text, planId, isEnterprise, isCompact)}
            </PricingAiFeatureLabel>
          ) : (
            '—'
          )}
          {showRowUnderline ? (
            <span className={pricingDottedUnderlineClass(isEnterprise, isCompact)} aria-hidden />
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
  density = 'default',
  compactSpacing = 'default',
  onViewAll,
  showDottedUnderlines = true,
  className,
}: PricingFeatureListProps) {
  const isCompact = density === 'compact';
  const isRoomyCompact = isCompact && compactSpacing === 'roomy';
  const useGroupedRows = featureGroups != null;
  const useAlignedRows = !useGroupedRows && featureRows != null;
  const showRowUnderline = showDottedUnderlines && !useGroupedRows;

  return (
    <div
      className={cn(
        'flex flex-1 flex-col',
        isRoomyCompact ? 'px-5 py-4' : isCompact ? 'px-3 py-2' : 'px-6 py-6',
        className,
      )}
    >
      {header ? (
        <div
          className={cn(
            'grid grid-cols-[1rem_minmax(0,1fr)] items-center gap-2',
            isCompact ? (isRoomyCompact ? 'py-1' : 'py-0.5') : 'py-1',
          )}
        >
          <ListChecks
            className={cn(
              'shrink-0 justify-self-center',
              isCompact ? 'size-2.5' : 'size-3',
              isEnterprise ? 'text-zinc-400' : 'text-muted-foreground',
            )}
          />
          <p
            className={cn(
              'font-medium',
              isRoomyCompact ? 'text-[11px]' : isCompact ? 'text-[10px]' : 'text-xs',
              isEnterprise ? 'text-zinc-300' : 'text-muted-foreground',
            )}
          >
            {header}
          </p>
        </div>
      ) : null}

      <div
        className={cn(
          'flex flex-1 flex-col gap-0',
          header
            ? isRoomyCompact
              ? 'mt-3'
              : isCompact
                ? 'mt-1.5'
                : 'mt-5'
            : undefined,
        )}
      >
        {useGroupedRows
          ? featureGroups.map((group, groupIndex) => (
              <div
                key={group.title ?? group.rows[0]?.text ?? 'group'}
                className={cn(
                  groupIndex > 0 && (isCompact ? 'mt-1.5 border-t pt-1.5' : 'mt-4 border-t pt-4'),
                  pricingSectionBorderClass(isEnterprise),
                )}
              >
                {group.title ? (
                  <p
                    className={cn(
                      isCompact ? 'mb-1 flex h-6 items-center' : 'mb-2',
                      pricingFeatureGroupTitleClass(isEnterprise, isCompact),
                    )}
                  >
                    {group.title}
                  </p>
                ) : isCompact ? (
                  <div className={pricingFeatureGroupSpacerClass(isCompact)} aria-hidden />
                ) : null}
                <ul className="flex flex-col">
                  {group.rows.map((row, index) => (
                    <FeatureRowItem
                      key={`${group.title ?? 'group'}-${row.text}-${index}`}
                      row={row}
                      planId={planId}
                      isEnterprise={isEnterprise}
                      showRowUnderline={showRowUnderline}
                      isCompact={isCompact}
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
                isCompact={isCompact}
              />
            ))}
          </ul>
        ) : null}

        {!useGroupedRows && !useAlignedRows && features ? (
          <ul className="flex flex-col">
            {features.map((feature) => (
              <li
                key={feature}
                className={cn(
                  isRoomyCompact
                    ? 'py-1 first:pt-0 last:pb-0'
                    : isCompact
                      ? 'py-0.5 first:pt-0 last:pb-0'
                      : 'py-2 first:pt-0 last:pb-0',
                )}
              >
                <div
                  className={cn(
                    'grid grid-cols-[1rem_minmax(0,1fr)] items-center',
                    isRoomyCompact ? 'gap-2' : isCompact ? 'gap-1.5' : 'gap-2',
                  )}
                >
                  <Check
                    className={cn(
                      'shrink-0 justify-self-center',
                      isRoomyCompact ? 'size-3' : isCompact ? 'size-2.5' : 'size-4',
                      isEnterprise ? 'text-white' : 'text-foreground',
                    )}
                  />
                  <span
                    className={cn(
                      'min-w-0 flex-1',
                      pricingFeatureTextClass(isEnterprise, isCompact),
                    )}
                  >
                    <PricingAiFeatureLabel label={feature}>
                      {renderPricingFeatureLabel(feature, planId, isEnterprise, isCompact)}
                    </PricingAiFeatureLabel>
                    {showDottedUnderlines ? (
                      <span
                        className={pricingDottedUnderlineClass(isEnterprise, isCompact)}
                        aria-hidden
                      />
                    ) : null}
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
