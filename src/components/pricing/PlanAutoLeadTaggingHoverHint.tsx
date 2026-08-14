import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
  AI_LEAD_TEMPERATURE_HOVER_DESCRIPTION,
  AI_LEAD_TEMPERATURE_HOVER_TITLE,
  isAiLeadTemperatureLabel,
} from '../../../shared/planCatalog';
import { pricingFeatureHoverTriggerClass } from './pricingStyles';

type PlanAutoLeadTaggingHoverHintProps = {
  label: string;
  className?: string;
};

export function PlanAutoLeadTaggingHoverHint({
  label,
  className,
}: PlanAutoLeadTaggingHoverHintProps) {
  if (!isAiLeadTemperatureLabel(label)) {
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
        <p className="font-medium text-foreground">{AI_LEAD_TEMPERATURE_HOVER_TITLE}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {AI_LEAD_TEMPERATURE_HOVER_DESCRIPTION}
        </p>
        <ul className="mt-2 list-disc list-inside text-sm text-muted-foreground space-y-1 pl-1">
          <li>Hot</li>
          <li>Cold</li>
          <li>Warm</li>
        </ul>
      </HoverCardContent>
    </HoverCard>
  );
}
