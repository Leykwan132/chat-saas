import type { ReactNode } from 'react';
import { AiBadge } from '@/components/AiBadge';
import { isAiTaggedPlanFeature } from '../../../shared/planCatalog';

type PricingAiFeatureLabelProps = {
  label: string;
  showBadge?: boolean;
  children: ReactNode;
};

export function PricingAiFeatureLabel({
  label,
  showBadge = true,
  children,
}: PricingAiFeatureLabelProps) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {children}
      {showBadge && isAiTaggedPlanFeature(label) ? <AiBadge size="sm" /> : null}
    </span>
  );
}
