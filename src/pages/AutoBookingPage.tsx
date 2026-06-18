import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery } from 'convex/react';
import { format } from 'date-fns';
import {
  CalendarCheck,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { AiBadge } from '@/components/AiBadge';
import { PageDescription } from '@/components/PageDescription';
import {
  AutoBookingOverviewDialog,
  AUTO_BOOKING_OVERVIEW_META,
} from '@/components/AutoBookingOverviewDialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { usePermissions } from '@/hooks/usePermissions';
import { type ServiceRow } from '@/lib/autoBookingServiceForm';
import { cn } from '@/lib/utils';
import { Permission } from '../../shared/permissions';
import { PlanFeatureGate } from '@/components/PlanFeatureGate';

function formatBookingCount(count: number) {
  if (count === 1) return '1 booking';
  return `${count} bookings`;
}

interface BookCardProps {
  tag: string;
  title: React.ReactNode;
  onClick?: () => void;
  to?: string;
  disabled?: boolean;
  isDark?: boolean;
}

function BookCard({ tag, title, onClick, to, disabled, isDark }: BookCardProps) {
  const cardContent = (
    <>
      <div className="absolute inset-0 z-0 rounded-l-sm rounded-r-[14px] border border-neutral-200/80 bg-white shadow-inner transition-transform duration-500 ease-out group-hover:translate-x-1.5 dark:border-neutral-800/80 dark:bg-[#1a1a1a]" />
      <div
        style={{ transformOrigin: 'left center', transformStyle: 'preserve-3d' }}
        className={`absolute inset-0 z-20 flex origin-left flex-col justify-between rounded-l-sm rounded-r-[14px] border py-3.5 pl-[25px] pr-3.5 shadow-md transition-transform duration-500 ease-out group-hover:shadow-lg group-hover:[transform:rotateY(-24deg)] ${
          isDark
            ? 'border-neutral-900 bg-neutral-950 text-white dark:bg-black'
            : 'border-neutral-200/80 bg-[#fafafa] text-neutral-800 dark:border-neutral-800/80 dark:bg-[#202020] dark:text-neutral-100'
        }`}
      >
        <div className="flex flex-col gap-2">
          <img
            src="/icon.svg"
            className={`size-5 shrink-0 ${isDark ? 'invert' : 'dark:invert'}`}
            alt="App Logo"
          />
          <span
            className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold ${
              isDark
                ? 'border-neutral-800/50 bg-neutral-900 text-neutral-400'
                : 'border-neutral-200/30 bg-neutral-100 text-neutral-500 dark:border-neutral-700/30 dark:bg-neutral-800 dark:text-neutral-400'
            }`}
          >
            {tag}
          </span>
        </div>
        <h3
          className={`text-sm font-semibold leading-tight tracking-tight ${isDark ? 'text-white' : 'text-neutral-800 dark:text-neutral-100'}`}
        >
          {title}
        </h3>
        <div
          className={`pointer-events-none absolute bottom-0 left-0 top-0 w-[17px] rounded-l-sm bg-gradient-to-r ${
            isDark
              ? 'from-white/[0.04] via-transparent to-black/[0.3]'
              : 'from-black/[0.08] via-transparent to-black/[0.12] dark:from-white/[0.03] dark:to-black/[0.2]'
          }`}
        />
        <div
          className={`pointer-events-none absolute bottom-0 left-[17px] top-0 w-px ${
            isDark ? 'bg-neutral-800/80' : 'bg-neutral-300/60 dark:bg-neutral-800/60'
          }`}
        />
        <div
          className={`pointer-events-none absolute bottom-0 left-[18px] top-0 w-px ${
            isDark ? 'bg-white/[0.02]' : 'bg-white/50 dark:bg-white/[0.02]'
          }`}
        />
      </div>
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        className={`group relative block h-[182px] w-[140px] [perspective:1000px] select-none ${disabled ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
      >
        {cardContent}
      </Link>
    );
  }

  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`group relative h-[182px] w-[140px] [perspective:1000px] select-none ${disabled ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
    >
      {cardContent}
    </div>
  );
}

function formatDateTime(value: number) {
  return format(new Date(value), 'MMM d, yyyy h:mm a');
}

export default function AutoBookingPage() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const typedAgentId = agentId as Id<'agents'> | undefined;
  const { can, isLoading: permissionsLoading } = usePermissions();
  const canRead = can(Permission.AUTOMATION_READ) || can(Permission.CALENDAR_READ);
  const canManage = can(Permission.AUTOMATION_MANAGE) || can(Permission.CALENDAR_MANAGE);

  const overview = useQuery(
    api.autoBooking.getOverview,
    typedAgentId && canRead ? { agentId: typedAgentId } : 'skip',
  );
  const updateService = useMutation(api.autoBooking.updateService);
  const [isWalkthroughOpen, setIsWalkthroughOpen] = useState(false);
  const [walkthroughStep, setWalkthroughStep] = useState(0);
  const overviewServices = overview?.services;
  const services = useMemo(() => (overviewServices ?? []) as ServiceRow[], [overviewServices]);
  const activeServiceCount = useMemo(
    () => services.filter((service) => service.isActive).length,
    [services],
  );
  const createServiceHref = `/dashboard/${typedAgentId}/auto-booking/new`;

  if (!typedAgentId) return null;

  if (!permissionsLoading && !canRead) {
    return <Navigate to={`/dashboard/${typedAgentId}`} replace />;
  }

  const isLoading = permissionsLoading || overview === undefined;
  if (isLoading) {
    return <AutoBookingSkeleton />;
  }

  const handleToggleActive = async (
    serviceId: Id<'autoBookingServices'>,
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
    <PlanFeatureGate featureKey="auto_booking" featureName="Auto Booking">
      <div className="flex w-full flex-col gap-8">
      <header className="flex flex-col justify-between gap-4 border-b border-border pb-6 md:flex-row md:items-end">
        <div>
          <h1 className="m-0 flex items-center gap-2.5 text-4xl font-semibold tracking-tight text-foreground">
            Auto Booking
            <AiBadge size="md" className="w-[22px]" />
          </h1>
          <PageDescription>
            Let AI book appointments for customers right from chat.
          </PageDescription>
        </div>
        {canManage ? (
          <Button asChild className="gap-1.5 font-semibold">
            <Link to={createServiceHref}>
              <Plus className="size-4" />
              Add a service
            </Link>
          </Button>
        ) : null}
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Guides</h2>
        <div className="flex max-w-[700px] flex-wrap items-end gap-6">
          <BookCard
            tag={AUTO_BOOKING_OVERVIEW_META.tag}
            title={AUTO_BOOKING_OVERVIEW_META.bookTitle}
            onClick={() => {
              setWalkthroughStep(0);
              setIsWalkthroughOpen(true);
            }}
          />
        </div>
      </section>

      <section className="mt-4 flex flex-col gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Your Services</h2>
            {services.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                {activeServiceCount > 0 ? (
                  <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                ) : null}
                {activeServiceCount} active
              </span>
            ) : null}
          </div>
          <Separator className="mt-3" />
        </div>

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
                detailHref={`/dashboard/${typedAgentId}/auto-booking/${service._id}`}
                onToggleActive={(isActive) => void handleToggleActive(service._id, isActive)}
              />
            ))}
            {canManage ? <AddServiceCard href={createServiceHref} /> : null}
          </div>
        )}
      </section>

      <section className="mt-4 flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Booked Appointments</h2>
          <Separator className="mt-3" />
        </div>

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
      </section>

      <AutoBookingOverviewDialog
        open={isWalkthroughOpen}
        onOpenChange={setIsWalkthroughOpen}
        step={walkthroughStep}
        onStepChange={setWalkthroughStep}
        onAddService={canManage ? () => navigate(createServiceHref) : undefined}
      />

      </div>
    </PlanFeatureGate>
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
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {service.isActive ? (
              <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
            ) : null}
            {service.isActive ? 'Active' : 'Inactive'}
          </span>
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
          className="relative z-10 shrink-0"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onKeyDown={(event) => event.stopPropagation()}
        >
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

function AutoBookingSkeleton() {
  return (
    <div className="flex w-full flex-col gap-8">
      <div className="border-b border-border pb-6">
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
