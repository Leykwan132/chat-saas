import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
  getWhatsAppPlanFeatureHover,
  isWhatsAppPlanFeatureLabel,
  WHATSAPP_ONLY_CHANNEL_DISPLAY_NAMES,
} from '../../../shared/planCatalog';
import { PricingSupportedPlatformSection } from './PricingSupportedPlatformSection';
import { pricingFeatureHoverTriggerClass } from './pricingStyles';

type PlanWhatsAppFeatureHoverHintProps = {
  label: string;
  className?: string;
};

export function PlanWhatsAppFeatureHoverHint({
  label,
  className,
}: PlanWhatsAppFeatureHoverHintProps) {
  const hover = getWhatsAppPlanFeatureHover(label);

  if (!hover || !isWhatsAppPlanFeatureLabel(label)) {
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
      <HoverCardContent align="start" className="w-64">
        <p className="font-medium text-foreground">{hover.title}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {hover.description}
        </p>
        <PricingSupportedPlatformSection platforms={WHATSAPP_ONLY_CHANNEL_DISPLAY_NAMES} />
      </HoverCardContent>
    </HoverCard>
  );
}
