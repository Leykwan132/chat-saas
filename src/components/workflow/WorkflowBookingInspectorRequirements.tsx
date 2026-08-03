import { Clock3, ShoppingCart } from 'lucide-react';
import type { Id } from '../../../convex/_generated/dataModel';
import { WorkflowBookingAvailabilitySection } from './WorkflowBookingAvailabilitySection';
import { WorkflowBookingServicesSection } from './WorkflowBookingServicesSection';
import { WorkflowRequiredLabel } from './WorkflowRequiredLabel';

type WorkflowBookingInspectorRequirementsProps = {
  agentId: Id<'agents'>;
  allowedServiceIds: Id<'appointmentServices'>[] | undefined;
  onAllowedServiceIdsChange: (serviceIds: Id<'appointmentServices'>[]) => void;
  onServiceEligibilityChange: (eligible: boolean | undefined) => void;
  onAvailabilityEligibilityChange: (eligible: boolean | undefined) => void;
  showServiceWarning: boolean;
  showAvailabilityWarning: boolean;
};

function BookingRequirementHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof ShoppingCart;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <WorkflowRequiredLabel as="h4">{title}</WorkflowRequiredLabel>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

export function WorkflowBookingInspectorRequirements({
  agentId,
  allowedServiceIds,
  onAllowedServiceIdsChange,
  onServiceEligibilityChange,
  onAvailabilityEligibilityChange,
  showServiceWarning,
  showAvailabilityWarning,
}: WorkflowBookingInspectorRequirementsProps) {
  return (
    <div className="flex flex-col gap-3">
      <BookingRequirementHeading
        icon={ShoppingCart}
        title="Services"
        description="AI will only book services that are available."
      />
      <WorkflowBookingServicesSection
        agentId={agentId}
        allowedServiceIds={allowedServiceIds}
        onAllowedServiceIdsChange={onAllowedServiceIdsChange}
        onEligibilityChange={onServiceEligibilityChange}
      />
      {showServiceWarning ? (
        <p className="text-xs text-destructive" role="alert">
          Select at least one active service before applying.
        </p>
      ) : null}
      <BookingRequirementHeading
        icon={Clock3}
        title="Availability"
        description="Choose who can accept appointment leads."
      />
      <WorkflowBookingAvailabilitySection
        agentId={agentId}
        onEligibilityChange={onAvailabilityEligibilityChange}
      />
      {showAvailabilityWarning ? (
        <p className="text-xs text-destructive" role="alert">
          Select at least one teammate who can accept appointment leads.
        </p>
      ) : null}
    </div>
  );
}
