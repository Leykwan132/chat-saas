import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
  getPlanFeatureDescriptionHover,
  isPlanFeatureDescriptionHoverLabel,
} from '../../../shared/planCatalog';
import { pricingFeatureHoverTriggerClass } from './pricingStyles';

type PlanDescriptionHoverHintProps = {
  label: string;
  className?: string;
};

export function PlanDescriptionHoverHint({
  label,
  className,
}: PlanDescriptionHoverHintProps) {
  const hover = getPlanFeatureDescriptionHover(label);

  if (!hover || !isPlanFeatureDescriptionHoverLabel(label)) {
    return <span className={className}>{label}</span>;
  }

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
      <HoverCardContent align="start" className="w-72">
        <p className="font-medium text-foreground">{hover.title}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {hover.description}
        </p>
      </HoverCardContent>
    </HoverCard>
  );
}
