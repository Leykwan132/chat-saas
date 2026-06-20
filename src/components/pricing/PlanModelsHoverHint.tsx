import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
  getPlanModelDisplayNames,
  isPlanModelAccessLabel,
  type PlanKey,
} from '../../../shared/planCatalog';
import { pricingFeatureHoverTriggerClass, pricingSquareBulletClass } from './pricingStyles';

type PlanModelsHoverHintProps = {
  planId: PlanKey;
  label: string;
  className?: string;
};

export function PlanModelsHoverHint({
  planId,
  label,
  className,
}: PlanModelsHoverHintProps) {
  if (!isPlanModelAccessLabel(label)) {
    return <span className={className}>{label}</span>;
  }

  const models = getPlanModelDisplayNames(planId);

  return (
    <HoverCard openDelay={100} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className={pricingFeatureHoverTriggerClass(className)}
        >
          {label}
        </button>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-64">
        <p className="font-medium text-foreground">What models are included?</p>
        <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
          {models.map((model) => (
            <li key={model} className="flex items-start gap-2">
              <span className={pricingSquareBulletClass} aria-hidden />
              <span>{model}</span>
            </li>
          ))}
        </ul>
      </HoverCardContent>
    </HoverCard>
  );
}
