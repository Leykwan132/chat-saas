import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
  isTeamMembersLabel,
  TEAM_MEMBERS_HOVER_DESCRIPTION,
  TEAM_MEMBERS_HOVER_TITLE,
} from '../../../shared/planCatalog';
import { pricingFeatureHoverTriggerClass } from './pricingStyles';

type PlanTeamMembersHoverHintProps = {
  label: string;
  className?: string;
};

export function PlanTeamMembersHoverHint({
  label,
  className,
}: PlanTeamMembersHoverHintProps) {
  if (!isTeamMembersLabel(label)) {
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
        <p className="font-medium text-foreground">{TEAM_MEMBERS_HOVER_TITLE}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {TEAM_MEMBERS_HOVER_DESCRIPTION}
        </p>
      </HoverCardContent>
    </HoverCard>
  );
}
