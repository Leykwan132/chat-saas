import { cn } from '@/lib/utils';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
  ADVANCED_ANALYTICS_HOVER_DESCRIPTION,
  ADVANCED_ANALYTICS_HOVER_TITLE,
  ADVANCED_ANALYTICS_INCLUDES,
  isTopicAnalyticsLabel,
} from '../../../shared/planCatalog';
import { pricingSquareBulletClass } from './pricingStyles';

type PlanAdvancedAnalyticsHoverHintProps = {
  label: string;
  className?: string;
};

export function PlanAdvancedAnalyticsHoverHint({
  label,
  className,
}: PlanAdvancedAnalyticsHoverHintProps) {
  if (!isTopicAnalyticsLabel(label)) {
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
      <HoverCardContent align="start" className="w-72">
        <p className="font-medium text-foreground">{ADVANCED_ANALYTICS_HOVER_TITLE}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {ADVANCED_ANALYTICS_HOVER_DESCRIPTION}
        </p>
        <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
          {ADVANCED_ANALYTICS_INCLUDES.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <span className={pricingSquareBulletClass} aria-hidden />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </HoverCardContent>
    </HoverCard>
  );
}
