import { useEffect, useMemo, useState } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router';
import { useMutation, useQuery } from 'convex/react';
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Trash2,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Doc, Id } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { TimeSelectInput } from '@/components/TimeSelectInput';
import { TimeZoneSelect } from '@/components/TimeZoneSelect';
import {
  CALENDAR_TIMEZONE_OPTIONS,
  combineDateTimeInTimeZone,
  dateKeyInTimeZone,
  formatTimestampInTimeZone,
  getClientTimeZone,
  normalizeCalendarTimeZone,
} from '@/lib/calendarTimeUtils';
import { isCalendarEventNotPast } from '@/lib/calendarEventTiming';
import { formatOrgRoleLabel } from '../../shared/teamRoleCatalog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  inboxColumnClassName,
  inboxColumnHeaderClassName,
  inboxColumnScrollClassName,
} from '@/components/inbox/inboxLayout';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '../../shared/permissions';
import { CalendarEventDetailsDialog } from '@/components/calendar/CalendarEventDetailsDialog';
import { EditBookingDialog } from '@/components/calendar/EditBookingDialog';
import { canEditCalendarEvent } from '@/lib/calendarEditPolicy';
import { CalendarDatePickerField } from '@/components/calendar/CalendarDatePickerField';
import { CalendarCreateBookingDialog } from '@/components/calendar/CalendarCreateBookingDialog';
import {
  inboxSidebarCountClassName,
  inboxSidebarGroupLabelClassName,
  inboxSidebarHeaderTitleClassName,
  inboxSidebarIconSlotClassName,
  inboxSidebarItemActiveClassName,
  inboxSidebarItemClassName,
  inboxSidebarItemInactiveClassName,
  inboxSidebarSectionClassName,
} from '@/lib/sidebarNavStyles';
import { cn } from '@/lib/utils';

const calendarApi = api.calendarEvents;

type CalendarParticipant = {
  _id: string;
  eventId: Id<'calendarEvents'>;
  teamId: string;
  participantType: 'teamUser' | 'customer';
  role: 'assigned' | 'customer' | 'attendee';
  userId?: Id<'users'>;
  customerId?: Id<'customers'>;
  email: string;
  displayName?: string;
  eventStartAt: number;
  responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
};

type CalendarEvent = {
  _id: Id<'calendarEvents'>;
  teamId: string;
  title: string;
  description?: string;
  location?: string;
  link?: string;
  startAt: number;
  endAt: number;
  timeZone: string;
  allDay?: boolean;
  startDate?: string;
  endDate?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  bookingSource?: 'manual' | 'ai';
  appointmentServiceId?: Id<'appointmentServices'>;
  customFieldResponses?: Record<string, string | number | boolean | null>;
  remarks?: string;
  participants: CalendarParticipant[];
};

type CustomerOption = {
  _id: Id<'customers'>;
  name?: string;
  email?: string;
  phone?: string;
  contactAddress: string;
  service: string;
};

type EventFormState = {
  title: string;
  customerId: string;
  assignedUserId: string;
  attendeeUserIds: string[];
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  timeZone: string;
  description: string;
  link: string;
  remarks: string;
  collectedFields: Record<string, string>;
};

const DEFAULT_COLLECTED_FIELD_KEYS = new Set(['date', 'time', 'name', 'phone']);

type ServiceFieldDefinition = {
  key: string;
  label: string;
  type: string;
  options?: string[];
};

function collectedFieldsToFormValues(
  fields: Record<string, string | number | boolean | null | undefined>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === null || value === undefined) {
      result[key] = '';
    } else if (typeof value === 'boolean') {
      result[key] = value ? 'Yes' : 'No';
    } else {
      result[key] = String(value);
    }
  }
  return result;
}

function parseCollectedFieldFormValue(
  raw: string,
  field?: ServiceFieldDefinition,
): string | number | boolean | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (field?.type === 'number') {
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : trimmed;
  }
  if (field?.type === 'boolean') {
    return trimmed.toLowerCase() === 'yes' || trimmed.toLowerCase() === 'true';
  }
  return trimmed;
}

function buildCustomFieldResponses(
  formValues: Record<string, string>,
  serviceFields: ServiceFieldDefinition[],
): Record<string, string | number | boolean | null> {
  const result: Record<string, string | number | boolean | null> = {};
  const serviceFieldByKey = new Map(serviceFields.map((field) => [field.key, field]));

  for (const key of ['name', 'phone']) {
    if (key in formValues) {
      result[key] = parseCollectedFieldFormValue(formValues[key] ?? '');
    }
  }

  for (const field of serviceFields) {
    if (DEFAULT_COLLECTED_FIELD_KEYS.has(field.key.toLowerCase())) continue;
    if (!(field.key in formValues)) continue;
    result[field.key] = parseCollectedFieldFormValue(formValues[field.key] ?? '', field);
  }

  for (const [key, value] of Object.entries(formValues)) {
    if (key in result) continue;
    if (DEFAULT_COLLECTED_FIELD_KEYS.has(key.toLowerCase()) && key !== 'name' && key !== 'phone') {
      continue;
    }
    result[key] = parseCollectedFieldFormValue(value, serviceFieldByKey.get(key));
  }

  return result;
}

function collectedFieldsEqual(a: Record<string, string>, b: Record<string, string>) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if ((a[key] ?? '') !== (b[key] ?? '')) return false;
  }
  return true;
}

function customerDetailServiceFields(serviceFields: ServiceFieldDefinition[]) {
  return serviceFields.filter(
    (field) => !DEFAULT_COLLECTED_FIELD_KEYS.has(field.key.toLowerCase()),
  );
}

function CustomerDetailFormSkeleton() {
  return (
    <div className="grid gap-4 rounded-xl border border-border bg-card p-4">
      <Skeleton className="h-3 w-24 rounded-md" />
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="grid gap-2">
          <Skeleton className="h-4 w-24 rounded-md" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}

function memberLabel(user: Pick<Doc<'users'>, 'firstName' | 'lastName' | 'email'>) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return name || user.email;
}

function customerLabel(customer: CustomerOption) {
  return (
    customer.name?.trim() ||
    customer.email?.trim() ||
    customer.phone?.trim() ||
    customer.contactAddress
  );
}

function dateKey(date: Date | number) {
  return format(date, 'yyyy-MM-dd');
}

function combineDateTime(date: string, time: string, timeZone: string) {
  return combineDateTimeInTimeZone(date, time, timeZone);
}

function getAllDayBounds(date: string, timeZone: string) {
  const startAt = combineDateTimeInTimeZone(date, '12:00 AM', timeZone);
  if (startAt === null) {
    return { startAt: null, endAt: null };
  }
  const endAt = combineDateTimeInTimeZone(
    dateKeyInTimeZone(startAt + 36 * 60 * 60 * 1000, timeZone),
    '12:00 AM',
    timeZone,
  );
  return { startAt, endAt };
}

const ASSIGNEE_STRIPE_COLORS = [
  '#A0CBE8',
  '#F4A582',
  '#CCEBC5',
  '#DECBE4',
  '#B3CDE3',
  '#FDDAEC',
  '#FBB4AE',
  '#B3E2CD',
  '#FED9A6',
  '#CFE2F3',
] as const;

const UNASSIGNED_STRIPE_COLOR = '#D1D1D6';

function assigneeStripeColor(assigneeUserId: string | undefined) {
  if (!assigneeUserId) return UNASSIGNED_STRIPE_COLOR;
  let hash = 0;
  for (let index = 0; index < assigneeUserId.length; index += 1) {
    hash = (hash + assigneeUserId.charCodeAt(index)) | 0;
  }
  return ASSIGNEE_STRIPE_COLORS[Math.abs(hash) % ASSIGNEE_STRIPE_COLORS.length];
}

function getEventAssigneeColor(event: CalendarEvent) {
  return assigneeStripeColor(findAssignedUser(event)?.userId);
}

function isEventPast(event: CalendarEvent) {
  return event.endAt < Date.now();
}

function formatCompactEventTime(event: CalendarEvent, timeZone: string) {
  if (event.allDay) return 'All day';
  const label = formatTimestampInTimeZone(event.startAt, timeZone, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return label.includes(':00 ') ? label.replace(':00 ', ' ') : label;
}

function formatEventListTimeRange(
  event: CalendarEvent,
  timeZone: string,
): {
  range: string;
  duration: string | null;
} {
  if (event.allDay) {
    return { range: 'All day', duration: null };
  }

  const startLabel = formatTimestampInTimeZone(event.startAt, timeZone, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const endLabel = formatTimestampInTimeZone(event.endAt, timeZone, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const startPeriod = startLabel.split(' ').at(-1) ?? '';
  const endPeriod = endLabel.split(' ').at(-1) ?? '';
  const startTime = startLabel.replace(` ${startPeriod}`, '');
  const endTime = endLabel.replace(` ${endPeriod}`, '');
  const range =
    startPeriod === endPeriod
      ? `${startTime}\u2013${endTime} ${endPeriod}`
      : `${startLabel}\u2013${endLabel}`;

  const totalMinutes = Math.round(Math.max(0, event.endAt - event.startAt) / 60_000);
  let duration: string | null = null;
  if (totalMinutes >= 60) {
    duration = `${Math.round(totalMinutes / 60)}h`;
  } else if (totalMinutes > 0) {
    duration = `${totalMinutes}m`;
  }

  return { range, duration };
}

const calendarGridEventItemClassName =
  'overflow-hidden rounded-sm border border-border/50 border-l-[4px] bg-background';

const CALENDAR_GRID_VISIBLE_EVENT_LIMIT = 3;

function formatEventDurationDisplay(duration: string | null) {
  if (!duration) return null;
  if (duration.endsWith('m')) return `${duration.slice(0, -1)}min`;
  return duration;
}

function CalendarGridEventItem({
  event,
  isSelected,
  timeZone,
  onClick,
}: {
  event: CalendarEvent;
  isSelected: boolean;
  timeZone: string;
  onClick: (clickEvent: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const assigneeColor = getEventAssigneeColor(event);
  const isPast = isEventPast(event);

  return (
    <button
      type="button"
      onClick={onClick}
      style={{ borderLeftColor: assigneeColor }}
      className={cn(
        calendarGridEventItemClassName,
        'flex w-full items-center gap-1.5 px-1.5 py-1 text-left',
        isPast ? 'opacity-45' : 'opacity-100',
        isSelected && 'ring-1 ring-inset ring-foreground/15',
      )}
    >
      <span className="min-w-0 flex-1 truncate text-[11px] leading-tight text-foreground">
        {event.title}
      </span>
      <span
        className={cn(
          'shrink-0 text-[10px] leading-none tabular-nums',
          isPast ? 'text-muted-foreground' : 'text-foreground',
        )}
      >
        {formatCompactEventTime(event, timeZone)}
      </span>
    </button>
  );
}

function CalendarDayGridCell({
  day,
  dayEvents,
  isSelected,
  selectedEventId,
  visibleMonth,
  canManageCalendar,
  timeZone,
  todayKey,
  onSelectDate,
  onSelectEvent,
  onCreateEvent,
}: {
  day: Date;
  dayEvents: CalendarEvent[];
  isSelected: boolean;
  selectedEventId: string | null;
  visibleMonth: Date;
  canManageCalendar: boolean;
  timeZone: string;
  todayKey: string;
  onSelectDate: (day: Date) => void;
  onSelectEvent: (day: Date, eventId: string) => void;
  onCreateEvent: (day: Date) => void;
}) {
  const visibleEvents = dayEvents.slice(0, CALENDAR_GRID_VISIBLE_EVENT_LIMIT);
  const hiddenEventCount = dayEvents.length - visibleEvents.length;
  const handleCellKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelectDate(day);
    }
  };

  const cell = (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelectDate(day)}
      onKeyDown={handleCellKeyDown}
      className={cn(
        'flex min-h-0 cursor-pointer flex-col border-b border-r border-border p-2 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/30',
        !isSameMonth(day, visibleMonth) && 'bg-muted/20 text-muted-foreground',
        isSelected && 'bg-muted/60 ring-1 ring-inset ring-foreground/10',
      )}
    >
      <span
        className={cn(
          'mb-1 flex size-6 shrink-0 items-center justify-center self-end rounded-full text-xs font-medium',
          dateKey(day) === todayKey && 'bg-red-500 text-white',
        )}
      >
        {format(day, 'd')}
      </span>
      <span className="flex min-h-0 w-full flex-col gap-1 overflow-hidden">
        {visibleEvents.map((event) => (
          <CalendarGridEventItem
            key={event._id}
            event={event}
            timeZone={timeZone}
            isSelected={selectedEventId === event._id}
            onClick={(clickEvent) => {
              clickEvent.stopPropagation();
              onSelectEvent(day, event._id);
            }}
          />
        ))}
        {hiddenEventCount > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="w-fit rounded px-1 text-left text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={(clickEvent) => clickEvent.stopPropagation()}
              >
                +{hiddenEventCount} more
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="right"
              align="start"
              className="w-72 gap-2 rounded-xl p-2"
              onClick={(clickEvent) => clickEvent.stopPropagation()}
            >
              <div className="px-1.5 pb-1 text-xs font-medium text-muted-foreground">
                {format(day, 'EEEE, MMM d')}
              </div>
              <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
                {dayEvents.map((event) => (
                  <CalendarGridEventItem
                    key={event._id}
                    event={event}
                    timeZone={timeZone}
                    isSelected={selectedEventId === event._id}
                    onClick={(clickEvent) => {
                      clickEvent.stopPropagation();
                      onSelectEvent(day, event._id);
                    }}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </span>
    </div>
  );

  if (!canManageCalendar) {
    return cell;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{cell}</ContextMenuTrigger>
      <ContextMenuContent className="min-w-[9.5rem] rounded-lg border border-border p-1 shadow-md ring-0">
        <ContextMenuItem
          className="gap-2 rounded-md px-2.5 py-1.5 text-sm font-normal focus:bg-muted"
          onClick={() => onCreateEvent(day)}
        >
          <Plus className="size-3.5" />
          Create event
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function CalendarDayEventRow({
  event,
  isNotPast,
  stripeColor,
  timeZone,
  onSelect,
}: {
  event: CalendarEvent;
  isNotPast: boolean;
  stripeColor: string;
  timeZone: string;
  onSelect: () => void;
}) {
  const { range, duration } = formatEventListTimeRange(event, timeZone);
  const durationLabel = formatEventDurationDisplay(duration);
  const isPast = isEventPast(event);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-stretch gap-2.5 rounded-sm px-3 py-2.5 text-left transition-colors hover:bg-muted/40',
        isPast ? 'opacity-45' : 'opacity-100',
      )}
    >
      <span
        aria-hidden
        className="w-1 shrink-0 self-stretch rounded-full"
        style={{ backgroundColor: stripeColor }}
      />
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate text-[0.9375rem]',
            isNotPast
              ? 'font-medium text-foreground'
              : 'font-normal text-foreground/80',
          )}
        >
          {event.title}
        </span>
        <span className="mt-0.5 block truncate text-sm leading-snug text-muted-foreground">
          {range}
          {durationLabel ? ` ${durationLabel}` : ''}
        </span>
      </span>
    </button>
  );
}

function findEventCustomer(event: CalendarEvent) {
  return event.participants.find((participant) => participant.role === 'customer');
}

function findAssignedUser(event: CalendarEvent) {
  return event.participants.find((participant) => participant.role === 'assigned');
}

function createInitialFormState(
  date: Date,
  timeZone: string,
  currentUserId?: Id<'users'>,
): EventFormState {
  return {
    title: '',
    customerId: '',
    assignedUserId: currentUserId ?? '',
    attendeeUserIds: [],
    date: dateKey(date),
    startTime: '9:00 AM',
    endTime: '10:00 AM',
    allDay: false,
    timeZone,
    description: '',
    link: '',
    remarks: '',
    collectedFields: {},
  };
}

function formStateFromEvent(event: CalendarEvent, displayTimeZone: string): EventFormState {
  const customer = findEventCustomer(event);
  const assigned = findAssignedUser(event);
  const timeZone = event.timeZone || displayTimeZone;
  return {
    title: event.title,
    customerId: customer?.customerId ?? '',
    assignedUserId: assigned?.userId ?? '',
    attendeeUserIds: event.participants
      .filter((participant) => participant.role === 'attendee' && participant.userId)
      .map((participant) => participant.userId!),
    date: dateKeyInTimeZone(event.startAt, timeZone),
    startTime: formatTimestampInTimeZone(event.startAt, timeZone, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }),
    endTime: formatTimestampInTimeZone(event.endAt, timeZone, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }),
    allDay: event.allDay ?? false,
    timeZone,
    description: event.description ?? '',
    link: event.link ?? '',
    remarks: event.remarks ?? '',
    collectedFields: collectedFieldsToFormValues(event.customFieldResponses ?? {}),
  };
}

function formStatesEqual(a: EventFormState, b: EventFormState) {
  return (
    a.title === b.title &&
    a.customerId === b.customerId &&
    a.assignedUserId === b.assignedUserId &&
    a.attendeeUserIds.length === b.attendeeUserIds.length &&
    a.attendeeUserIds.every((id, index) => id === b.attendeeUserIds[index]) &&
    a.date === b.date &&
    a.startTime === b.startTime &&
    a.endTime === b.endTime &&
    a.allDay === b.allDay &&
    a.timeZone === b.timeZone &&
    a.description === b.description &&
    a.link === b.link &&
    a.remarks === b.remarks &&
    collectedFieldsEqual(a.collectedFields, b.collectedFields)
  );
}

function CalendarSidebarFilterRow({
  label,
  icon,
  isActive,
  count,
  onClick,
  disabled,
}: {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  count?: number;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        inboxSidebarItemClassName,
        isActive ? inboxSidebarItemActiveClassName : inboxSidebarItemInactiveClassName,
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      <span className={inboxSidebarIconSlotClassName}>{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count !== undefined ? (
        <span className={inboxSidebarCountClassName}>{count}</span>
      ) : null}
    </button>
  );
}

function CalendarSidebarFilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className={inboxSidebarSectionClassName}>
      <div className={inboxSidebarGroupLabelClassName}>{title}</div>
      <div className="flex flex-col gap-[0.1125rem]">{children}</div>
    </div>
  );
}

export default function CalendarPage() {
  const { agentId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { can, isLoading: permissionsLoading } = usePermissions();
  const canReadCalendar = can(Permission.CALENDAR_READ);
  const canManageCalendar = can(Permission.CALENDAR_MANAGE);

  const currentUser = useQuery(api.users.currentUser);
  const activeTeam = useQuery(api.teams.getActiveTeam);
  const teamUsers = useQuery(api.users.getUsers, {});
  const customerOptions = useQuery(calendarApi.listCustomerOptions, {});

  const initialClientTimeZone = useMemo(() => normalizeCalendarTimeZone(getClientTimeZone()), []);
  const [displayTimeZone, setDisplayTimeZone] = useState(initialClientTimeZone);
  const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [selectedDayKey, setSelectedDayKey] = useState(() =>
    dateKeyInTimeZone(Date.now(), initialClientTimeZone),
  );
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [assignedToMeOnly, setAssignedToMeOnly] = useState(false);
  const [eventSheetOpen, setEventSheetOpen] = useState(false);
  const [createBookingOpen, setCreateBookingOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [formState, setFormState] = useState<EventFormState>(() =>
    createInitialFormState(new Date(), initialClientTimeZone),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dayEventSearchQuery, setDayEventSearchQuery] = useState('');
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [detailsDialogEventId, setDetailsDialogEventId] =
    useState<Id<'calendarEvents'> | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editDialogEventId, setEditDialogEventId] = useState<Id<'calendarEvents'> | null>(null);

  const monthRange = useMemo(() => {
    const start = startOfWeek(startOfMonth(visibleMonth));
    const end = endOfWeek(endOfMonth(visibleMonth));
    return { start, end };
  }, [visibleMonth]);

  const events = useQuery(
    calendarApi.listForRange,
    !permissionsLoading && canReadCalendar && (!assignedToMeOnly || currentUser !== undefined)
      ? {
          startAt: monthRange.start.getTime(),
          endAt: monthRange.end.getTime() + 1,
          assignedUserId:
            assignedToMeOnly && currentUser !== null
              ? (currentUser?._id as Id<'users'>)
              : undefined,
        }
      : 'skip',
  ) as CalendarEvent[] | undefined;

  const createEvent = useMutation(calendarApi.create);
  const updateEvent = useMutation(calendarApi.update);
  const removeEvent = useMutation(calendarApi.remove);
  const updateTeamTimeZone = useMutation(api.teams.updateActiveTeamTimeZone);

  const editingAppointmentDetails = useQuery(
    calendarApi.getAppointmentDetails,
    eventSheetOpen && editingEvent ? { eventId: editingEvent._id } : 'skip',
  );

  const isEditingAppointmentBooking = Boolean(
    editingAppointmentDetails?.isAppointmentBooking ??
      editingEvent?.appointmentServiceId ??
      editingEvent?.bookingSource === 'ai',
  );
  const isLoadingEditingAppointmentDetails =
    eventSheetOpen && editingEvent !== null && editingAppointmentDetails === undefined;
  const customerServiceFields = customerDetailServiceFields(
    editingAppointmentDetails?.serviceFields ?? [],
  );

  useEffect(() => {
    const intervalId = window.setInterval(() => setCurrentTimestamp(Date.now()), 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (activeTeam === undefined) return;
    const nextTimeZone = normalizeCalendarTimeZone(activeTeam?.timeZone);
    setDisplayTimeZone(nextTimeZone);
    setSelectedDayKey(dateKey(selectedDate));
  }, [activeTeam?.timeZone, selectedDate]);

  const days = useMemo(
    () => eachDayOfInterval({ start: monthRange.start, end: monthRange.end }),
    [monthRange],
  );

  const todayKey = useMemo(
    () => dateKeyInTimeZone(currentTimestamp, displayTimeZone),
    [currentTimestamp, displayTimeZone],
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events ?? []) {
      const key = dateKeyInTimeZone(event.startAt, displayTimeZone);
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        if ((a.allDay ?? false) !== (b.allDay ?? false)) {
          return a.allDay ? -1 : 1;
        }
        return a.startAt - b.startAt;
      });
    }
    return map;
  }, [displayTimeZone, events]);

  const selectedDayEvents = useMemo(
    () => eventsByDay.get(selectedDayKey) ?? [],
    [eventsByDay, selectedDayKey],
  );

  const savedFormState = useMemo(
    () => (editingEvent ? formStateFromEvent(editingEvent, displayTimeZone) : null),
    [displayTimeZone, editingEvent],
  );

  const isFormDirty = useMemo(() => {
    if (!editingEvent || !savedFormState) return false;
    return !formStatesEqual(formState, savedFormState);
  }, [editingEvent, formState, savedFormState]);

  const canEditEventSheet = editingEvent
    ? canEditCalendarEvent({ canManageCalendar, endAt: editingEvent.endAt })
    : canManageCalendar;

  const filteredDayEvents = useMemo(() => {
    const query = dayEventSearchQuery.trim().toLowerCase();
    if (!query) return selectedDayEvents;

    return selectedDayEvents.filter((event) => {
      const customer = findEventCustomer(event);
      const assigned = findAssignedUser(event);
      const { range } = formatEventListTimeRange(event, displayTimeZone);
      const haystack = [
        event.title,
        event.location,
        event.link,
        event.description,
        customer?.displayName,
        customer?.email,
        assigned?.displayName,
        assigned?.email,
        range,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [dayEventSearchQuery, displayTimeZone, selectedDayEvents]);

  const eventFilterCounts = useMemo(() => {
    if (events === undefined) return undefined;
    if (assignedToMeOnly) {
      return {
        all: undefined,
        assigned: events.length,
      };
    }
    const assigned =
      currentUser === undefined || currentUser === null
        ? 0
        : events.filter(
            (event) => findAssignedUser(event)?.userId === currentUser._id,
          ).length;
    return {
      all: events.length,
      assigned,
    };
  }, [assignedToMeOnly, currentUser, events]);

  const handleSelectDate = (date: Date | undefined) => {
    if (!date) return;
    const nextDate = startOfDay(date);
    setSelectedDate(nextDate);
    setSelectedDayKey(dateKey(nextDate));
    setVisibleMonth(startOfMonth(nextDate));
    setSelectedEventId(null);
    setDayEventSearchQuery('');
  };

  const handleChangeTimeZone = async (timeZone: string) => {
    const nextTimeZone = normalizeCalendarTimeZone(timeZone);
    const previousTimeZone = displayTimeZone;
    setDisplayTimeZone(nextTimeZone);
    setSelectedDayKey(dateKey(selectedDate));
    setFormState((current) => ({ ...current, timeZone: nextTimeZone }));
    try {
      await updateTeamTimeZone({ timeZone: nextTimeZone });
    } catch (err) {
      setDisplayTimeZone(previousTimeZone);
      setSelectedDayKey(dateKey(selectedDate));
      setFormState((current) => ({ ...current, timeZone: previousTimeZone }));
      toast.error(err instanceof Error ? err.message : 'Could not update time zone');
    }
  };

  const openCreateEventSheet = (date = selectedDate) => {
    setEditingEvent(null);
    setFormState(
      createInitialFormState(
        date,
        displayTimeZone,
        currentUser?._id as Id<'users'> | undefined,
      ),
    );
    setEventSheetOpen(true);
  };


  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEventId(event._id);
    setDetailsDialogEventId(event._id);
    setDetailsDialogOpen(true);
  };



  useEffect(() => {
    const editEventId = searchParams.get('editEvent');
    if (!editEventId || events === undefined || !canManageCalendar) return;

    const event = events.find((item) => item._id === editEventId);
    if (!event) return;

    setEditDialogEventId(event._id);
    setEditDialogOpen(true);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('editEvent');
    setSearchParams(nextParams, { replace: true });
  }, [canManageCalendar, events, searchParams, setSearchParams]);

  const handleChangeMonth = (date: Date) => {
    const nextMonth = startOfMonth(date);
    setVisibleMonth(nextMonth);
    if (!isSameMonth(selectedDate, nextMonth)) {
      setSelectedDate(nextMonth);
      setSelectedEventId(null);
    }
  };

  const updateForm = (patch: Partial<EventFormState>) => {
    setFormState((current) => ({ ...current, ...patch }));
  };

  const updateCollectedField = (key: string, value: string) => {
    setFormState((current) => ({
      ...current,
      collectedFields: {
        ...current.collectedFields,
        [key]: value,
      },
    }));
  };

  const handleSaveEvent = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canEditEventSheet) return;
    if (!formState.title.trim()) {
      toast.error('Event title is required');
      return;
    }
    if (!formState.customerId || !formState.assignedUserId) {
      toast.error('Select a customer and assigned team member');
      return;
    }
    const eventTimeZone = formState.timeZone || displayTimeZone;
    const timeRange = formState.allDay
      ? getAllDayBounds(formState.date, eventTimeZone)
      : {
          startAt: combineDateTime(formState.date, formState.startTime, eventTimeZone),
          endAt: combineDateTime(formState.date, formState.endTime, eventTimeZone),
        };
    const { startAt, endAt } = timeRange;
    if (startAt === null || endAt === null) {
      toast.error('Enter a valid start and end time');
      return;
    }
    if (endAt <= startAt) {
      toast.error('End time must be after start time');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        title: formState.title,
        description: formState.description || undefined,
        link: formState.link || undefined,
        startAt,
        endAt,
        timeZone: eventTimeZone,
        allDay: formState.allDay,
        startDate: formState.allDay ? formState.date : undefined,
        endDate: formState.allDay ? formState.date : undefined,
        customerId: formState.customerId as Id<'customers'>,
        assignedUserId: formState.assignedUserId as Id<'users'>,
        attendeeUserIds: formState.attendeeUserIds as Id<'users'>[],
      };

      if (editingEvent) {
        await updateEvent({
          eventId: editingEvent._id,
          ...payload,
          ...(isEditingAppointmentBooking
            ? {
                customFieldResponses: buildCustomFieldResponses(
                  formState.collectedFields,
                  editingAppointmentDetails?.serviceFields ?? [],
                ),
                remarks: formState.remarks.trim(),
              }
            : {}),
        });
        setSelectedEventId(editingEvent._id);
        toast.success('Event updated');
      } else {
        const eventId = await createEvent(payload);
        setSelectedEventId(eventId);
        toast.success('Event created');
      }

      const nextDayKey = dateKeyInTimeZone(startAt, eventTimeZone);
      const nextDate = startOfDay(new Date(`${nextDayKey}T00:00:00`));
      setSelectedDate(nextDate);
      setSelectedDayKey(nextDayKey);
      setVisibleMonth(startOfMonth(nextDate));
      setEventSheetOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save event');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!editingEvent) return;
    setIsDeleting(true);
    try {
      await removeEvent({ eventId: editingEvent._id });
      toast.success('Event deleted');
      setSelectedEventId(null);
      setEditingEvent(null);
      setEventSheetOpen(false);
      setDeleteDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete event');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!agentId) return null;
  if (!permissionsLoading && !canReadCalendar) {
    return <Navigate to={`/dashboard/${agentId}`} replace />;
  }

  const isLoading =
    permissionsLoading ||
    events === undefined ||
    currentUser === undefined ||
    teamUsers === undefined ||
    customerOptions === undefined;

  const teamUserRows =
    teamUsers && teamUsers.length > 0
      ? teamUsers
      : currentUser
        ? [currentUser]
        : [];

  return (
    <div className="grid h-full min-h-0 grid-cols-[18rem_minmax(0,1fr)_20rem] overflow-hidden bg-background">
      <aside className={cn(inboxColumnClassName, 'border-r border-border')}>
        <div className={cn(inboxColumnHeaderClassName, 'px-[0.675rem]')}>
          <h1 className={inboxSidebarHeaderTitleClassName}>Calendar</h1>
        </div>
        <div className={cn(inboxColumnScrollClassName, 'no-scrollbar px-[0.45rem] py-[0.675rem]')}>
          {canManageCalendar && (
            <div className="px-3 pb-3">
              <Button
                type="button"
                size="lg"
                className="mt-2 h-11 w-full gap-2 px-5 py-3"
                onClick={() => setCreateBookingOpen(true)}
              >
                <Plus data-icon="inline-start" />
                New Booking
              </Button>
            </div>
          )}

          <div className="flex justify-center pb-[0.675rem]">
            <Calendar
              mode="single"
              selected={selectedDate}
              month={visibleMonth}
              onMonthChange={handleChangeMonth}
              // onSelect={handleSelectDate}
              className="rounded-xl border border-border bg-card p-2"
            />
          </div>

          <CalendarSidebarFilterSection title="View">
            <CalendarSidebarFilterRow
              label="All events"
              icon={<CalendarIcon className="text-muted-foreground" />}
              isActive={!assignedToMeOnly}
              count={eventFilterCounts?.all}
              onClick={() => setAssignedToMeOnly(false)}
            />
            <CalendarSidebarFilterRow
              label="Assigned to me"
              icon={<User className="text-muted-foreground" />}
              isActive={assignedToMeOnly}
              count={eventFilterCounts?.assigned}
              onClick={() => setAssignedToMeOnly(true)}
              disabled={!currentUser}
            />
          </CalendarSidebarFilterSection>

        </div>
      </aside>

      <section className={cn(inboxColumnClassName, 'border-r border-border')}>
        <div className={cn(inboxColumnHeaderClassName, 'justify-between px-4')}>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {format(visibleMonth, 'MMMM yyyy')}
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            <TimeZoneSelect
              value={displayTimeZone}
              options={CALENDAR_TIMEZONE_OPTIONS}
              onChange={handleChangeTimeZone}
              showGlobe
              triggerAriaLabel="Calendar time zone"
              triggerClassName="w-fit border-transparent bg-input/50 px-2.5 py-1.5 hover:bg-input/50"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSelectDate(new Date(`${todayKey}T00:00:00`))}
            >
              Today
            </Button>
            <div className="flex items-center">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleChangeMonth(subMonths(visibleMonth, 1))}
                aria-label="Previous month"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleChangeMonth(addMonths(visibleMonth, 1))}
                aria-label="Next month"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        <div
          className="grid min-h-0 flex-1 grid-cols-7 overflow-hidden [&>*:nth-child(7n)]:border-r-0"
          style={{
            gridTemplateRows: `2rem repeat(${Math.ceil(days.length / 7)}, minmax(0, 1fr))`,
          }}
        >
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="flex items-center justify-center border-b border-r border-border bg-muted/20 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              {day}
            </div>
          ))}

          {days.map((day) => (
            <CalendarDayGridCell
              key={dateKey(day)}
              day={day}
              dayEvents={eventsByDay.get(dateKey(day)) ?? []}
              isSelected={isSameDay(day, selectedDate)}
              selectedEventId={selectedEventId}
              visibleMonth={visibleMonth}
              canManageCalendar={canManageCalendar}
              timeZone={displayTimeZone}
              todayKey={todayKey}
              onSelectDate={(nextDay) => handleSelectDate(nextDay)}
              onSelectEvent={(nextDay, eventId) => {
                setSelectedDate(startOfDay(nextDay));
                const calendarEvent = (events ?? []).find((item) => item._id === eventId);
                if (calendarEvent) handleSelectEvent(calendarEvent);
              }}
              onCreateEvent={(nextDay) => {
                handleSelectDate(nextDay);
                openCreateEventSheet(nextDay);
              }}
            />
          ))}
        </div>
      </section>

      <aside className={inboxColumnClassName}>
        <div className={cn(inboxColumnHeaderClassName, 'justify-between px-4')}>
          <div className="flex min-w-0 items-center gap-2">
            {selectedDayKey === todayKey ? (
              <div className="flex min-w-0 items-center gap-2">
                <h2 className="truncate text-sm font-semibold text-red-500">Today</h2>
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
                  {format(selectedDate, 'd')}
                </span>
              </div>
            ) : (
              <h2 className="truncate text-sm font-semibold text-foreground">
                {format(selectedDate, 'EEEE, MMM d')}
              </h2>
            )}
          </div>
        </div>

        <div className={cn(inboxColumnScrollClassName, 'min-h-0 flex-1 p-3')}>
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Spinner className="size-6 text-muted-foreground" />
            </div>
          ) : selectedDayEvents.length > 0 ? (
            <div className="flex flex-col gap-3">
              <div className="relative">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  placeholder="Search events..."
                  value={dayEventSearchQuery}
                  onChange={(event) => setDayEventSearchQuery(event.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-background py-0 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
                />
              </div>

              {filteredDayEvents.length > 0 ? (
                <div className="flex flex-col gap-0.5">
                  {filteredDayEvents.map((event) => (
                    <CalendarDayEventRow
                      key={event._id}
                      event={event}
                      isNotPast={
                        selectedDayKey === todayKey &&
                        isCalendarEventNotPast(event, currentTimestamp)
                      }
                      timeZone={displayTimeZone}
                      stripeColor={getEventAssigneeColor(event)}
                      onSelect={() => handleSelectEvent(event)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
                  <Search className="mb-3 size-7 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">No matching events</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Try a different search term for this day.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-4 text-center">
              <CalendarIcon className="mb-3 size-8 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">No events</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Nothing scheduled for this day yet.
              </p>
            </div>
          )}
        </div>
      </aside>

      {agentId ? (
        <CalendarCreateBookingDialog
          open={createBookingOpen}
          onOpenChange={setCreateBookingOpen}
          agentId={agentId as Id<'agents'>}
          initialDate={format(selectedDate, 'yyyy-MM-dd')}
        />
      ) : null}

      <Sheet
        open={eventSheetOpen}
        onOpenChange={(open) => {
          setEventSheetOpen(open);
          if (!open) {
            setEditingEvent(null);
          }
        }}
      >
        <SheetContent className="w-full p-0 sm:max-w-md">
          <form onSubmit={handleSaveEvent} className="flex h-full min-h-0 flex-col">
            <SheetHeader className="border-b border-border px-6 py-6">
              <SheetTitle className="truncate">
                {editingEvent ? 'Event Details' : 'New Event'}
              </SheetTitle>
            </SheetHeader>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <div className="grid gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="event-title">Title</Label>
                  <Input
                    id="event-title"
                    value={formState.title}
                    onChange={(event) => updateForm({ title: event.target.value })}
                    placeholder="Event title"
                    autoFocus={canEditEventSheet && !editingEvent}
                    disabled={!canEditEventSheet}
                  />
                </div>

                <div className="grid gap-4 rounded-xl border border-border bg-card p-4">
                  <CalendarDatePickerField
                    value={formState.date}
                    onChange={(value) => updateForm({ date: value })}
                    disabled={!canEditEventSheet}
                  />

                  <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2.5">
                    <Label htmlFor="event-all-day" className="text-sm">
                      All day
                    </Label>
                    <Switch
                      id="event-all-day"
                      checked={formState.allDay}
                      onCheckedChange={(checked) => updateForm({ allDay: checked })}
                      disabled={!canEditEventSheet}
                    />
                  </div>

                  {!formState.allDay && (
                    <div className="grid grid-cols-2 gap-4">
                      <TimeSelectInput
                        label="From"
                        value={formState.startTime}
                        onChange={(value) => updateForm({ startTime: value })}
                        disabled={!canEditEventSheet}
                      />
                      <TimeSelectInput
                        label="To"
                        value={formState.endTime}
                        onChange={(value) => updateForm({ endTime: value })}
                        disabled={!canEditEventSheet}
                      />
                    </div>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label>Customer</Label>
                  <SearchableSelect
                    value={formState.customerId || undefined}
                    placeholder="Select customer"
                    searchPlaceholder="Search customers..."
                    emptyText="No customers found."
                    options={(customerOptions ?? []).map((customer: CustomerOption) => ({
                      value: customer._id,
                      label: customerLabel(customer),
                      searchValue: `${customerLabel(customer)} ${customer.email ?? ''} ${customer.phone ?? ''}`,
                    }))}
                    onChange={(value) => updateForm({ customerId: value })}
                    disabled={!canEditEventSheet}
                  />
                </div>

                {isEditingAppointmentBooking ? (
                  isLoadingEditingAppointmentDetails ? (
                    <CustomerDetailFormSkeleton />
                  ) : (
                  <div className="grid gap-4 rounded-xl border border-border bg-card p-4">
                    <p className="text-xs font-semibold text-muted-foreground">Customer detail</p>

                    <div className="grid gap-2">
                      <Label htmlFor="booking-customer-name">Customer name</Label>
                      <Input
                        id="booking-customer-name"
                        value={formState.collectedFields.name ?? ''}
                        onChange={(event) => updateCollectedField('name', event.target.value)}
                        placeholder="Customer name"
                        disabled={!canEditEventSheet}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="booking-customer-phone">Phone</Label>
                      <Input
                        id="booking-customer-phone"
                        value={formState.collectedFields.phone ?? ''}
                        onChange={(event) => updateCollectedField('phone', event.target.value)}
                        placeholder="Phone number"
                        disabled={!canEditEventSheet}
                      />
                    </div>

                    {customerServiceFields.map((field) => {
                      const fieldId = `booking-field-${field.key}`;
                      const value = formState.collectedFields[field.key] ?? '';

                      if (field.type === 'boolean') {
                        return (
                          <div
                            key={field.key}
                            className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2.5"
                          >
                            <Label htmlFor={fieldId} className="text-sm">
                              {field.label}
                            </Label>
                            <Switch
                              id={fieldId}
                              checked={value.toLowerCase() === 'yes' || value.toLowerCase() === 'true'}
                              onCheckedChange={(checked) =>
                                updateCollectedField(field.key, checked ? 'Yes' : 'No')
                              }
                              disabled={!canEditEventSheet}
                            />
                          </div>
                        );
                      }

                      if (field.type === 'select' && field.options && field.options.length > 0) {
                        return (
                          <div key={field.key} className="grid gap-2">
                            <Label>{field.label}</Label>
                            <SearchableSelect
                              value={value || undefined}
                              placeholder={`Select ${field.label.toLowerCase()}`}
                              searchPlaceholder={`Search ${field.label.toLowerCase()}...`}
                              emptyText="No options found."
                              options={field.options.map((option) => ({
                                value: option,
                                label: option,
                                searchValue: option,
                              }))}
                              onChange={(nextValue) => updateCollectedField(field.key, nextValue)}
                              disabled={!canEditEventSheet}
                            />
                          </div>
                        );
                      }

                      return (
                        <div key={field.key} className="grid gap-2">
                          <Label htmlFor={fieldId}>{field.label}</Label>
                          <Input
                            id={fieldId}
                            type={field.type === 'number' ? 'number' : 'text'}
                            value={value}
                            onChange={(event) =>
                              updateCollectedField(field.key, event.target.value)
                            }
                            placeholder={field.label}
                            disabled={!canEditEventSheet}
                          />
                        </div>
                      );
                    })}
                  </div>
                  )
                ) : null}

                {isEditingAppointmentBooking && !isLoadingEditingAppointmentDetails ? (
                  <div className="grid gap-2">
                    <Label htmlFor="event-remarks">Remarks</Label>
                    <Textarea
                      id="event-remarks"
                      value={formState.remarks}
                      onChange={(event) => updateForm({ remarks: event.target.value })}
                      placeholder="Add internal notes for this booking"
                      className="min-h-24"
                      disabled={!canEditEventSheet}
                    />
                  </div>
                ) : null}

                <div className="grid gap-2">
                  <Label>Team member</Label>
                  <SearchableSelect
                    value={formState.assignedUserId || undefined}
                    placeholder="Select team member"
                    searchPlaceholder="Search team members..."
                    emptyText="No team members found."
                    options={teamUserRows.map((user) => {
                      const role = 'role' in user ? formatOrgRoleLabel(user.role) : 'Member';
                      return {
                        value: user._id,
                        label: memberLabel(user),
                        tag: role,
                        searchValue: `${memberLabel(user)} ${user.email} ${role}`,
                      };
                    })}
                    onChange={(value) => updateForm({ assignedUserId: value })}
                    disabled={!canEditEventSheet}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="event-link">Link</Label>
                  <Input
                    id="event-link"
                    type="url"
                    value={formState.link}
                    onChange={(event) => updateForm({ link: event.target.value })}
                    placeholder="https://meet.google.com/..."
                    disabled={!canEditEventSheet}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="event-description">Description</Label>
                  <Textarea
                    id="event-description"
                    value={formState.description}
                    onChange={(event) => updateForm({ description: event.target.value })}
                    placeholder="Optional notes"
                    className="min-h-32"
                    disabled={!canEditEventSheet}
                  />
                </div>
              </div>
            </div>

            <SheetFooter className="flex-row items-center justify-end gap-1.5 border-t border-border px-6 py-4">
              {canEditEventSheet && (!editingEvent || isFormDirty) ? (
                <Button type="submit" className="w-auto" disabled={isSaving}>
                  {isSaving ? <Spinner className="mr-2 size-4" /> : null}
                  {editingEvent ? 'Save Changes' : 'Save'}
                </Button>
              ) : null}
              {editingEvent && canEditEventSheet ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                  aria-label="Delete event"
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEventSheetOpen(false)}
              >
                {!canEditEventSheet || (editingEvent && !isFormDirty) ? 'Close' : 'Cancel'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>


      <CalendarEventDetailsDialog
        eventId={detailsDialogEventId}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        canEdit={canManageCalendar}
        onDeleteSuccess={() => setSelectedEventId(null)}
      />

      {editDialogOpen && editDialogEventId && (
        <EditBookingDialog
          eventId={editDialogEventId}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          agentId={agentId}
          onDeleteSuccess={() => setSelectedEventId(null)}
        />
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete event?</DialogTitle>
            <DialogDescription>
              This removes the appointment from the shared team calendar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteEvent}
              disabled={isDeleting}
            >
              {isDeleting ? <Spinner className="mr-2 size-4" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
