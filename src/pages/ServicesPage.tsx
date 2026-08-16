import { useMemo } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router';
import { useMutation, useQuery } from 'convex/react';
import { format } from 'date-fns';
import {
  CalendarCheck,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Doc, Id } from '../../convex/_generated/dataModel';
import { CreateServiceDialog } from '@/components/services/CreateServiceDialog';
import { AddServiceCard, ServiceCard } from '@/components/services/ServiceCards';
import { PageTitleBlock } from '@/components/PageTitleBlock';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermissions } from '@/hooks/usePermissions';
import { teamMemberRoleLabel, type ServiceRow, type TeamMemberRole, type TeamUserOption } from '@/lib/serviceForm';
import { Permission } from '../../shared/permissions';

type TeamUser = Doc<'users'> & { isAdmin: boolean; role: TeamMemberRole };

function memberLabel(user: { firstName?: string; lastName?: string; email: string }) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return fullName || user.email;
}

function formatDateTime(value: number) {
  return format(new Date(value), 'MMM d, yyyy h:mm a');
}

export default function ServicesPage() {
  const { agentId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const typedAgentId = agentId as Id<'agents'> | undefined;
  const { can, isLoading: permissionsLoading } = usePermissions();
  const canRead = can(Permission.AUTOMATION_READ) || can(Permission.CALENDAR_READ);
  const canManage = can(Permission.AUTOMATION_MANAGE) || can(Permission.CALENDAR_MANAGE);

  const overview = useQuery(
    api.appointmentBooking.services.getOverview,
    typedAgentId && canRead ? { agentId: typedAgentId } : 'skip',
  );
  const updateService = useMutation(api.appointmentBooking.services.updateService);
  const currentUser = useQuery(api.users.currentUser);
  const teamUsers = useQuery(api.users.getUsers, {});
  const planAndUsage = useQuery(api.plans.getPlanAndUsage, {});
  const overviewServices = overview?.services;
  const services = useMemo(() => (overviewServices ?? []) as ServiceRow[], [overviewServices]);
  const teamUserOptions = useMemo(
    (): TeamUserOption[] =>
      ((teamUsers ?? []) as TeamUser[]).map((user) => ({
        value: user.workosUserId,
        name: memberLabel(user),
        roleLabel: teamMemberRoleLabel(user.role),
      })),
    [teamUsers],
  );
  const createServiceOpen = searchParams.get('create') === '1';

  if (!typedAgentId) return null;

  if (!permissionsLoading && !canRead) {
    return <Navigate to={`/dashboard/${typedAgentId}`} replace />;
  }

  const isLoading = permissionsLoading || overview === undefined || currentUser === undefined || teamUsers === undefined || planAndUsage === undefined;
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

  const setCreateServiceOpen = (open: boolean) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    if (open) nextSearchParams.set('create', '1');
    else nextSearchParams.delete('create');
    setSearchParams(nextSearchParams, { replace: !open });
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <PageTitleBlock
          title="Services"
          description="Create the services customers can book with your team."
        />
        {canManage ? (
          <Button className="gap-1.5 font-semibold" onClick={() => setCreateServiceOpen(true)}>
            <Plus className="size-4" />
            Add a service
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
              {canManage ? <AddServiceCard onClick={() => setCreateServiceOpen(true)} /> : null}
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
      {canManage && currentUser ? (
        <CreateServiceDialog
          agentId={typedAgentId}
          teamUserOptions={teamUserOptions}
          currentWorkosUserId={currentUser.workosUserId}
          workspacePlan={planAndUsage?.plan}
          open={createServiceOpen}
          onOpenChange={setCreateServiceOpen}
        />
      ) : null}
    </div>
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
