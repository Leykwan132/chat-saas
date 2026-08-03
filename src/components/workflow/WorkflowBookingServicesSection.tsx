import { useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import { useQuery } from 'convex/react';
import { CalendarCheck, ExternalLink, Plus } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

type BookingServiceRow = {
  _id: Id<'appointmentServices'>;
  name: string;
  description?: string;
  isActive: boolean;
};

type WorkflowBookingServicesSectionProps = {
  agentId: Id<'agents'>;
  allowedServiceIds?: Id<'appointmentServices'>[];
  onAllowedServiceIdsChange: (serviceIds: Id<'appointmentServices'>[]) => void;
  onEligibilityChange: (eligible: boolean | undefined) => void;
};

export function WorkflowBookingServicesSection({
  agentId,
  allowedServiceIds,
  onAllowedServiceIdsChange,
  onEligibilityChange,
}: WorkflowBookingServicesSectionProps) {
  const services = useQuery(api.workflowAppointmentServices.listForAgent, { agentId }) as
    | BookingServiceRow[]
    | undefined;

  const effectiveAllowedServiceIds = useMemo(() => {
    const ids = allowedServiceIds ?? services?.map((service) => service._id) ?? [];
    return new Set(ids);
  }, [allowedServiceIds, services]);
  const eligibility = services === undefined
    ? undefined
    : services.some((service) => (
      service.isActive && effectiveAllowedServiceIds.has(service._id)
    ));

  useEffect(() => {
    onEligibilityChange(eligibility);
  }, [eligibility, onEligibilityChange]);

  const handleToggleService = (
    serviceId: Id<'appointmentServices'>,
    checked: boolean,
  ) => {
    const currentIds = allowedServiceIds ?? services?.map((service) => service._id) ?? [];
    const currentSet = new Set(currentIds);
    if (checked) {
      currentSet.add(serviceId);
    } else {
      currentSet.delete(serviceId);
    }
    onAllowedServiceIdsChange(Array.from(currentSet));
  };

  if (services === undefined) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <Empty className="rounded-lg border border-dashed border-border p-6">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarCheck />
          </EmptyMedia>
          <EmptyTitle>No services yet</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild size="sm" variant="outline">
            <Link to={`/dashboard/${agentId}/services/new`}>
              <Plus data-icon="inline-start" />
              Add service
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border">
      {services.map((service, index) => {
        const checked = effectiveAllowedServiceIds.has(service._id);
        return (
          <div
            key={service._id}
            className={cn(
              'flex items-start gap-3 p-3',
              index > 0 && 'border-t border-border',
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <Link
                  to={`/dashboard/${agentId}/services/${service._id}`}
                  className="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary"
                >
                  <span className="truncate">{service.name}</span>
                  <ExternalLink className="size-3 shrink-0" />
                </Link>
              </div>
              {service.description?.trim() ? (
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {service.description.trim()}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-start gap-1.5">
              <span className="text-xs text-muted-foreground">
                {checked ? 'Active' : 'Inactive'}
              </span>
              <Switch
                checked={checked}
                onCheckedChange={(nextChecked) => handleToggleService(service._id, nextChecked)}
                aria-label={`${checked ? 'Disallow' : 'Allow'} ${service.name}`}
                className="data-[state=checked]:bg-emerald-600"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
