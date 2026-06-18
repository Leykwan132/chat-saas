import { cn } from '@/lib/utils';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
  AUTO_LEAD_TAGGING_HOVER_DESCRIPTION,
  AUTO_LEAD_TAGGING_HOVER_TITLE,
  isAutoLeadTaggingLabel,
} from '../../../shared/planCatalog';

type PlanAutoLeadTaggingHoverHintProps = {
  label: string;
  className?: string;
};

export function PlanAutoLeadTaggingHoverHint({
  label,
  className,
}: PlanAutoLeadTaggingHoverHintProps) {
  if (!isAutoLeadTaggingLabel(label)) {
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
        <p className="font-medium text-foreground">{AUTO_LEAD_TAGGING_HOVER_TITLE}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {AUTO_LEAD_TAGGING_HOVER_DESCRIPTION}
        </p>
      </HoverCardContent>
    </HoverCard>
  );
}
