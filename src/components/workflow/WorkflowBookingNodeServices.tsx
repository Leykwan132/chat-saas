import { useEffect, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { UsersRound } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  bookingTeammateAvailabilityLabel,
  getEffectiveBookingServiceIds,
  getUpdatedBookingServiceIds,
} from './workflowBookingNodeServicesModel';

type BookingServiceRow = {
  _id: Id<'appointmentServices'>;
  name: string;
  isActive: boolean;
  assignedTeammates: Array<{ workosUserId: string; name: string }>;
};

type WorkflowBookingNodeServicesProps = {
  agentId: Id<'agents'>;
  nodeId: Id<'workflowNodes'>;
  allowedServiceIds?: Id<'appointmentServices'>[];
  disabled: boolean;
};

export function WorkflowBookingNodeServices({
  agentId,
  nodeId,
  allowedServiceIds,
  disabled,
}: WorkflowBookingNodeServicesProps) {
  const services = useQuery(api.workflowAppointmentServices.listForAgent, { agentId }) as
    | BookingServiceRow[]
    | undefined;
  const updateAllowedServices = useMutation(api.workflowAppointmentServices.updateAllowedServices);
  const [optimisticServiceIds, setOptimisticServiceIds] = useState<Id<'appointmentServices'>[]>();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setOptimisticServiceIds(undefined);
  }, [allowedServiceIds]);

  if (services === undefined) {
    return <div className="mt-3 h-12 w-full animate-pulse rounded-lg bg-muted" />;
  }

  const activeServices = services.filter((service) => service.isActive);
  const selectedServiceIds = getEffectiveBookingServiceIds(
    optimisticServiceIds ?? allowedServiceIds,
    services,
  );
  const selectedServiceIdSet = new Set(selectedServiceIds);

  const handleServiceChange = async (
    serviceId: Id<'appointmentServices'>,
    checked: boolean,
  ) => {
    const nextServiceIds = getUpdatedBookingServiceIds(selectedServiceIds, serviceId, checked);
    setOptimisticServiceIds(nextServiceIds);
    setIsSaving(true);
    try {
      await updateAllowedServices({ agentId, nodeId, serviceIds: nextServiceIds });
    } catch (error) {
      setOptimisticServiceIds(undefined);
      toast.error(error instanceof Error ? error.message : 'Could not update booking services');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mt-3 w-full border-t border-border pt-3">
      <span className="text-xs font-medium text-muted-foreground">Services</span>
      {activeServices.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">No active services available.</p>
      ) : (
        <TooltipProvider>
          <div className="mt-2 flex flex-col gap-1.5">
            {activeServices.map((service) => {
              const teammateCount = service.assignedTeammates.length;
              const checked = selectedServiceIdSet.has(service._id);
              return (
                <div
                  key={service._id}
                  className="flex min-w-0 items-center justify-between gap-2 rounded-lg bg-muted/60 px-2.5 py-2"
                >
                  <div className="min-w-0">
                    <span className="block truncate text-xs font-medium text-foreground">{service.name}</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="mt-0.5 inline-flex cursor-default items-center gap-1 text-[11px] text-muted-foreground">
                          <UsersRound className="size-3" />
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
                  <div
                    className="nodrag nopan shrink-0"
                    onClick={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    <Switch
                      checked={checked}
                      disabled={disabled || isSaving}
                      aria-label={`${checked ? 'Remove' : 'Add'} ${service.name} for booking`}
                      onCheckedChange={(nextChecked) => {
                        void handleServiceChange(service._id, nextChecked);
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </TooltipProvider>
      )}
    </div>
  );
}
