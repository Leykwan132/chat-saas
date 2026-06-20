import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
  KNOWLEDGE_BASE_HOVER_DESCRIPTION,
  KNOWLEDGE_BASE_HOVER_TITLE,
  isKnowledgeBaseLimitLabel,
} from '../../../shared/planCatalog';
import { pricingFeatureHoverTriggerClass } from './pricingStyles';

type PlanKnowledgeBaseHoverHintProps = {
  label: string;
  className?: string;
};

export function PlanKnowledgeBaseHoverHint({
  label,
  className,
}: PlanKnowledgeBaseHoverHintProps) {
  if (!isKnowledgeBaseLimitLabel(label)) {
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
        <p className="font-medium text-foreground">{KNOWLEDGE_BASE_HOVER_TITLE}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {KNOWLEDGE_BASE_HOVER_DESCRIPTION}
        </p>
      </HoverCardContent>
    </HoverCard>
  );
}
