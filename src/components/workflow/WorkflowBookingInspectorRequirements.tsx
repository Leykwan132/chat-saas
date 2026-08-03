import { Clock3, Globe2, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router';
import { useState, type ReactNode } from 'react';
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
  action,
}: {
  icon: typeof ShoppingCart;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          <WorkflowRequiredLabel as="h4">{title}</WorkflowRequiredLabel>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {action}
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
  const [availabilityTimezone, setAvailabilityTimezone] = useState<string>();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <BookingRequirementHeading
          icon={ShoppingCart}
          title="Services"
          description="AI will only book services that are available."
          action={(
            <Link
              to={`/dashboard/${agentId}/services/new`}
              className="shrink-0 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
            >
              + Create Service
            </Link>
          )}
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
      </div>
      <div className="flex flex-col gap-3">
        <BookingRequirementHeading
          icon={Clock3}
          title="Availability"
          description="Choose who can accept appointment leads."
          action={availabilityTimezone ? (
            <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
              <Globe2 className="size-3.5" aria-hidden="true" />
              {availabilityTimezone}
            </span>
          ) : undefined}
        />
        <WorkflowBookingAvailabilitySection
          agentId={agentId}
          onEligibilityChange={onAvailabilityEligibilityChange}
          onTimezoneChange={setAvailabilityTimezone}
        />
        {showAvailabilityWarning ? (
          <p className="text-xs text-destructive" role="alert">
            Select at least one teammate who can accept appointment leads.
          </p>
        ) : null}
      </div>
    </div>
  );
}
