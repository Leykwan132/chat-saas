import { useQuery } from 'convex/react';
import { UsersRound } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  bookingTeammateAvailabilityLabel,
  getSelectedBookingServices,
} from './workflowBookingNodeServicesModel';

type BookingServiceRow = {
  _id: Id<'appointmentServices'>;
  name: string;
  isActive: boolean;
  assignedTeammates: Array<{ workosUserId: string; name: string }>;
};

type WorkflowBookingInspectorServicesProps = {
  agentId: Id<'agents'>;
  allowedServiceIds?: Id<'appointmentServices'>[];
};

export function WorkflowBookingInspectorServices({
  agentId,
  allowedServiceIds,
}: WorkflowBookingInspectorServicesProps) {
  const services = useQuery(api.workflowAppointmentServices.listForAgent, { agentId }) as
    | BookingServiceRow[]
    | undefined;

  if (services === undefined) {
    return <div className="h-16 animate-pulse rounded-xl bg-muted" />;
  }

  const selectedServices = getSelectedBookingServices(allowedServiceIds, services);

  return (
    <section className="flex flex-col gap-3 text-left">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold text-foreground">Services</h3>
        <p className="text-xs text-muted-foreground">Services this node can offer for booking.</p>
      </div>
      {selectedServices.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
          No services selected.
        </p>
      ) : (
        <TooltipProvider>
          <div className="flex flex-col gap-2">
            {selectedServices.map((service) => {
              const teammateCount = service.assignedTeammates.length;
              return (
                <div
                  key={service._id}
                  className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5"
                >
                  <span className="min-w-0 truncate text-sm font-medium text-foreground">{service.name}</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex shrink-0 cursor-help items-center gap-1 text-xs text-muted-foreground underline decoration-dotted underline-offset-4">
                        <UsersRound className="size-3.5" />
                        {bookingTeammateAvailabilityLabel(teammateCount)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={6} className="max-w-56">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">Available teammates</span>
                        {teammateCount === 0 ? (
                          <span>No teammates assigned.</span>
                        ) : service.assignedTeammates.map((teammate) => (
                          <span key={teammate.workosUserId}>{teammate.name}</span>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
              );
            })}
          </div>
        </TooltipProvider>
      )}
    </section>
  );
}
