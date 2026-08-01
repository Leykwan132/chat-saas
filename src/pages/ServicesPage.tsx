import { useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { useMutation, useQuery } from 'convex/react';
import { format } from 'date-fns';
import {
  CalendarCheck,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { PageTitleBlock } from '@/components/PageTitleBlock';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermissions } from '@/hooks/usePermissions';
import { type ServiceRow } from '@/lib/serviceForm';
import { cn } from '@/lib/utils';
import { Permission } from '../../shared/permissions';

function formatBookingCount(count: number) {
  if (count === 1) return '1 booking';
  return `${count} bookings`;
}

function formatDateTime(value: number) {
  return format(new Date(value), 'MMM d, yyyy h:mm a');
}

export default function ServicesPage() {
  const { agentId } = useParams();
  const typedAgentId = agentId as Id<'agents'> | undefined;
  const { can, isLoading: permissionsLoading } = usePermissions();
  const canRead = can(Permission.AUTOMATION_READ) || can(Permission.CALENDAR_READ);
  const canManage = can(Permission.AUTOMATION_MANAGE) || can(Permission.CALENDAR_MANAGE);

  const overview = useQuery(
    api.appointmentBooking.services.getOverview,
    typedAgentId && canRead ? { agentId: typedAgentId } : 'skip',
  );
  const updateService = useMutation(api.appointmentBooking.services.updateService);
  const overviewServices = overview?.services;
  const services = useMemo(() => (overviewServices ?? []) as ServiceRow[], [overviewServices]);
  const createServiceHref = `/dashboard/${typedAgentId}/services/new`;

  if (!typedAgentId) return null;

  if (!permissionsLoading && !canRead) {
    return <Navigate to={`/dashboard/${typedAgentId}`} replace />;
  }

  const isLoading = permissionsLoading || overview === undefined;
  if (isLoading) {
    return <ServicesSkeleton />;
  }

  const handleToggleActive = async (
    serviceId: Id<'appointmentServices'>,
    isActive: boolean,
  ) => {
    if (!canManage) return;
    try {
      await updateService({ serviceId, isActive });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update service');
    }
  };

  return (
    <div className="flex w-full flex-col gap-8">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <PageTitleBlock
          title="Services"
          description="Create the services customers can book with your team."
        />
        {canManage ? (
          <Button asChild className="gap-1.5 font-semibold">
            <Link to={createServiceHref}>
              <Plus className="size-4" />
              Add a service
            </Link>
          </Button>
        ) : null}
      </header>

      <Tabs defaultValue="services" className="gap-6">
        <TabsList variant="line">
          <TabsTrigger value="services">Your Services</TabsTrigger>
          <TabsTrigger value="appointments">Booked Appointments</TabsTrigger>
        </TabsList>

        <TabsContent value="services">
          {services.length === 0 && !canManage ? (
            <div className="rounded-xl border border-dashed border-border bg-card px-5 py-8 text-center">
              <CalendarCheck className="mx-auto size-8 text-muted-foreground" />
              <h3 className="mt-3 text-sm font-semibold text-foreground">No services yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Add a service to let AI start booking appointments.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {services.map((service) => (
                <ServiceCard
                  key={service._id}
                  service={service}
                  canManage={canManage}
                  detailHref={`/dashboard/${typedAgentId}/services/${service._id}`}
                  onToggleActive={(isActive) => void handleToggleActive(service._id, isActive)}
                />
              ))}
              {canManage ? <AddServiceCard href={createServiceHref} /> : null}
            </div>
          )}
        </TabsContent>

        <TabsContent value="appointments">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-5 py-3.5 text-left align-middle font-semibold text-muted-foreground">
                    Service
                  </th>
                  <th className="px-5 py-3.5 text-left align-middle font-semibold text-muted-foreground">
                    Customer
                  </th>
                  <th className="px-5 py-3.5 text-left align-middle font-semibold text-muted-foreground">
                    Assigned to
                  </th>
                  <th className="px-5 py-3.5 text-left align-middle font-semibold text-muted-foreground">
                    Appointment time
                  </th>
                  <th className="px-5 py-3.5 text-left align-middle font-semibold text-muted-foreground">
                    Status
                  </th>
                  <th className="px-5 py-3.5 text-left align-middle font-semibold text-muted-foreground">
                    Booking ID
                  </th>
                  <th className="px-5 py-3.5 text-left align-middle font-semibold text-muted-foreground">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {overview.bookings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">
                      No AI-booked appointments yet.
                    </td>
                  </tr>
                ) : (
                  overview.bookings.map((booking) => (
                    <tr key={booking.eventId} className="align-top">
                      <td className="px-5 py-4 font-medium text-foreground">{booking.serviceName}</td>
                      <td className="px-5 py-4 text-muted-foreground">{booking.customerName}</td>
                      <td className="px-5 py-4 text-muted-foreground">{booking.assignedName}</td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {formatDateTime(booking.startAt)}
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                          {booking.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-muted-foreground">
                        {booking.eventId.slice(-8)}
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {formatDateTime(booking.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AddServiceCard({ href }: { href: string }) {
  return (
    <Link
      to={href}
      className={cn(
        'flex size-56 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-card px-3.5 py-3.5 transition-colors',
        'text-muted-foreground hover:border-foreground/20 hover:bg-muted/30 hover:text-foreground',
      )}
      aria-label="Add a service"
    >
      <Plus className="size-6" strokeWidth={1.75} />
      <span className="text-xs font-medium">Add a service</span>
    </Link>
  );
}

function ServiceCard({
  service,
  canManage,
  detailHref,
  onToggleActive,
}: {
  service: ServiceRow;
  canManage: boolean;
  detailHref: string;
  onToggleActive: (isActive: boolean) => void;
}) {
  return (
    <Link
      to={detailHref}
      className={cn(
        'group flex size-56 flex-col rounded-lg border border-border bg-card px-3.5 py-3.5 transition-colors',
        'hover:border-foreground/20 hover:bg-muted/30',
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{service.name}</h3>
        </div>

        {service.description?.trim() ? (
          <p className="mt-1.5 text-xs leading-snug text-muted-foreground">
            {service.description.trim()}
          </p>
        ) : null}
      </div>

      <div className="mt-auto flex items-end justify-between gap-2 pt-3">
        <p className="text-xs text-muted-foreground">
          {formatBookingCount(service.bookingCount ?? 0)}
        </p>

        <div
          className="relative z-10 flex shrink-0 items-start gap-1.5"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <span className="text-xs text-muted-foreground">
            {service.isActive ? 'Active' : 'Inactive'}
          </span>
          <Switch
            checked={service.isActive}
            onCheckedChange={onToggleActive}
            disabled={!canManage}
            aria-label={`${service.isActive ? 'Turn off' : 'Turn on'} ${service.name}`}
            className="scale-90 data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-input"
          />
        </div>
      </div>
    </Link>
  );
}

function ServicesSkeleton() {
  return (
    <div className="flex w-full flex-col gap-8">
      <div>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-3 h-4 w-96" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="size-56 rounded-lg" />
        <Skeleton className="size-56 rounded-lg" />
        <Skeleton className="size-56 rounded-lg" />
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}
