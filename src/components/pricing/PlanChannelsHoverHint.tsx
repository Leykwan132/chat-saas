import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
  CHANNELS_HOVER_TITLE,
  getChannelsHoverDescription,
  isChannelLimitLabel,
  isChannelsComparisonLabel,
  SUPPORTED_CHANNEL_DISPLAY_NAMES,
} from '../../../shared/planCatalog';
import { PricingSupportedPlatformSection } from './PricingSupportedPlatformSection';
import { pricingFeatureHoverTriggerClass } from './pricingStyles';

type PlanChannelsHoverHintProps = {
  label: string;
  className?: string;
};

export function PlanChannelsHoverHint({
  label,
  className,
}: PlanChannelsHoverHintProps) {
  if (!isChannelLimitLabel(label) && !isChannelsComparisonLabel(label)) {
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
        <p className="font-medium text-foreground">{CHANNELS_HOVER_TITLE}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {getChannelsHoverDescription(label)}
        </p>
        <PricingSupportedPlatformSection platforms={SUPPORTED_CHANNEL_DISPLAY_NAMES} />
      </HoverCardContent>
    </HoverCard>
  );
}
