import { cn } from '@/lib/utils';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
  CHANNELS_HOVER_DESCRIPTION,
  CHANNELS_HOVER_TITLE,
  isChannelLimitLabel,
  isChannelsComparisonLabel,
  SUPPORTED_CHANNEL_DISPLAY_NAMES,
} from '../../../shared/planCatalog';
import { pricingSquareBulletClass } from './pricingStyles';

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
          className={cn(
            'cursor-help text-left underline decoration-dotted underline-offset-4 transition-colors hover:text-foreground/80',
            className,
          )}
        >
          {label}
        </button>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-64">
        <p className="font-medium text-foreground">{CHANNELS_HOVER_TITLE}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {CHANNELS_HOVER_DESCRIPTION}
        </p>
        <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
          {SUPPORTED_CHANNEL_DISPLAY_NAMES.map((channel) => (
            <li key={channel} className="flex items-start gap-2">
              <span className={pricingSquareBulletClass} aria-hidden />
              <span>{channel}</span>
            </li>
          ))}
        </ul>
      </HoverCardContent>
    </HoverCard>
  );
}
