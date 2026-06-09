import { useEffect, useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router';
import { useMutation, useQuery } from 'convex/react';
import {
  addMonths,
  addDays,
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  inboxColumnClassName,
  inboxColumnHeaderClassName,
  inboxColumnScrollClassName,
} from '@/components/inbox/inboxLayout';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '../../shared/permissions';
import { cn } from '@/lib/utils';
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
};

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

function formatTimeOption(totalMinutes: number) {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) =>
  formatTimeOption(index * 30),
);

function parseTimeInput(value: string) {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, ' ');
  const match = normalized.match(/^(\d{1,2})(?::?(\d{2}))?\s*(AM|PM)?$/);
  if (!match) return null;

  const rawHour = Number(match[1]);
  const minutes = match[2] === undefined ? 0 : Number(match[2]);
  const period = match[3];

  if (!Number.isInteger(rawHour) || !Number.isInteger(minutes) || minutes > 59) {
    return null;
  }

  let hours24 = rawHour;
  if (period) {
    if (rawHour < 1 || rawHour > 12) return null;
    hours24 = rawHour % 12;
    if (period === 'PM') hours24 += 12;
  } else if (rawHour > 23) {
    return null;
  }

  return {
    hours24,
    minutes,
    label: formatTimeOption(hours24 * 60 + minutes),
  };
}

function combineDateTime(date: string, time: string) {
  const parsed = parseTimeInput(time);
  if (!parsed) return null;

  return new Date(
    `${date}T${parsed.hours24.toString().padStart(2, '0')}:${parsed.minutes
      .toString()
      .padStart(2, '0')}:00`,
  ).getTime();
}

function getAllDayBounds(date: string) {
  const start = new Date(`${date}T00:00:00`);
  return {
    startAt: start.getTime(),
    endAt: addDays(start, 1).getTime(),
  };
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

function formatCompactEventTime(event: CalendarEvent) {
  if (event.allDay) return 'All day';
  const minutes = new Date(event.startAt).getMinutes();
  return minutes === 0
    ? format(event.startAt, 'h a')
    : format(event.startAt, 'h:mm a');
}

function formatEventListTimeRange(event: CalendarEvent): {
  range: string;
  duration: string | null;
} {
  if (event.allDay) {
    return { range: 'All day', duration: null };
  }

  const startPeriod = format(event.startAt, 'a');
  const endPeriod = format(event.endAt, 'a');
  const range =
    startPeriod === endPeriod
      ? `${format(event.startAt, 'h')}\u2013${format(event.endAt, 'h a')}`
      : `${format(event.startAt, 'h a')}\u2013${format(event.endAt, 'h a')}`;

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
  onClick,
}: {
  event: CalendarEvent;
  isSelected: boolean;
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
        {formatCompactEventTime(event)}
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
          isSameDay(day, new Date()) && 'bg-red-500 text-white',
        )}
      >
        {format(day, 'd')}
      </span>
      <span className="flex min-h-0 w-full flex-col gap-1 overflow-hidden">
        {visibleEvents.map((event) => (
          <CalendarGridEventItem
            key={event._id}
            event={event}
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
  stripeColor,
  onSelect,
}: {
  event: CalendarEvent;
  stripeColor: string;
  onSelect: () => void;
}) {
  const { range, duration } = formatEventListTimeRange(event);
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
        <span className="block truncate text-[0.9375rem] font-normal text-foreground/80">
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

function createInitialFormState(date: Date, currentUserId?: Id<'users'>): EventFormState {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
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
  };
}

function formStateFromEvent(event: CalendarEvent): EventFormState {
  const customer = findEventCustomer(event);
  const assigned = findAssignedUser(event);
  return {
    title: event.title,
    customerId: customer?.customerId ?? '',
    assignedUserId: assigned?.userId ?? '',
    attendeeUserIds: event.participants
      .filter((participant) => participant.role === 'attendee' && participant.userId)
      .map((participant) => participant.userId!),
    date: dateKey(event.startAt),
    startTime: format(event.startAt, 'h:mm a'),
    endTime: format(event.endAt, 'h:mm a'),
    allDay: event.allDay ?? false,
    timeZone: event.timeZone,
    description: event.description ?? '',
    link: event.link ?? '',
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
    a.link === b.link
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
  const { can, isLoading: permissionsLoading } = usePermissions();
  const canReadCalendar = can(Permission.CALENDAR_READ);
  const canManageCalendar = can(Permission.CALENDAR_MANAGE);

  const currentUser = useQuery(api.users.currentUser);
  const teamUsers = useQuery(api.users.getUsers, {});
  const customerOptions = useQuery(calendarApi.listCustomerOptions, {});

  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [assignedToMeOnly, setAssignedToMeOnly] = useState(false);
  const [eventSheetOpen, setEventSheetOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [formState, setFormState] = useState<EventFormState>(() =>
    createInitialFormState(new Date()),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dayEventSearchQuery, setDayEventSearchQuery] = useState('');

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

  const days = useMemo(
    () => eachDayOfInterval({ start: monthRange.start, end: monthRange.end }),
    [monthRange],
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events ?? []) {
      const key = dateKey(event.startAt);
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
  }, [events]);

  const selectedDayEvents = useMemo(
    () => eventsByDay.get(dateKey(selectedDate)) ?? [],
    [eventsByDay, selectedDate],
  );

  const savedFormState = useMemo(
    () => (editingEvent ? formStateFromEvent(editingEvent) : null),
    [editingEvent],
  );

  const isFormDirty = useMemo(() => {
    if (!editingEvent || !savedFormState) return false;
    return !formStatesEqual(formState, savedFormState);
  }, [editingEvent, formState, savedFormState]);

  const isEditingPastEvent = editingEvent !== null && isEventPast(editingEvent);
  const canEditEventSheet = canManageCalendar && !isEditingPastEvent;

  const filteredDayEvents = useMemo(() => {
    const query = dayEventSearchQuery.trim().toLowerCase();
    if (!query) return selectedDayEvents;

    return selectedDayEvents.filter((event) => {
      const customer = findEventCustomer(event);
      const assigned = findAssignedUser(event);
      const { range } = formatEventListTimeRange(event);
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
  }, [dayEventSearchQuery, selectedDayEvents]);

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
    setVisibleMonth(startOfMonth(nextDate));
    setSelectedEventId(null);
    setDayEventSearchQuery('');
  };

  const openCreateSheet = (date = selectedDate) => {
    setEditingEvent(null);
    setFormState(createInitialFormState(date, currentUser?._id as Id<'users'> | undefined));
    setEventSheetOpen(true);
  };

  const openEditSheet = (event: CalendarEvent) => {
    setEditingEvent(event);
    setFormState(formStateFromEvent(event));
    setEventSheetOpen(true);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEventId(event._id);
    openEditSheet(event);
  };

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
    const timeRange = formState.allDay
      ? getAllDayBounds(formState.date)
      : {
          startAt: combineDateTime(formState.date, formState.startTime),
          endAt: combineDateTime(formState.date, formState.endTime),
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
        timeZone: formState.timeZone,
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
        });
        setSelectedEventId(editingEvent._id);
        toast.success('Event updated');
      } else {
        const eventId = await createEvent(payload);
        setSelectedEventId(eventId);
        toast.success('Event created');
      }

      const nextDate = startOfDay(new Date(startAt));
      setSelectedDate(nextDate);
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
                className="w-full gap-2 mt-2"
                onClick={() => openCreateSheet()}
              >
                <Plus className="size-4" />
                New Event
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
              variant="outline"
              size="sm"
              onClick={() => handleSelectDate(new Date())}
            >
              Today
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
              onSelectDate={(nextDay) => handleSelectDate(nextDay)}
              onSelectEvent={(nextDay, eventId) => {
                setSelectedDate(startOfDay(nextDay));
                const calendarEvent = (events ?? []).find((item) => item._id === eventId);
                if (calendarEvent) handleSelectEvent(calendarEvent);
              }}
              onCreateEvent={(nextDay) => {
                handleSelectDate(nextDay);
                openCreateSheet(nextDay);
              }}
            />
          ))}
        </div>
      </section>

      <aside className={inboxColumnClassName}>
        <div className={cn(inboxColumnHeaderClassName, 'justify-between px-4')}>
          <div className="flex min-w-0 items-center gap-2">
            {isSameDay(selectedDate, new Date()) ? (
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
                  <DatePickerField
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

                <div className="grid gap-2">
                  <Label>Team member</Label>
                  <SearchableSelect
                    value={formState.assignedUserId || undefined}
                    placeholder="Select team member"
                    searchPlaceholder="Search team members..."
                    emptyText="No team members found."
                    options={teamUserRows.map((user: Doc<'users'>) => ({
                      value: user._id,
                      label: memberLabel(user),
                      searchValue: `${memberLabel(user)} ${user.email}`,
                    }))}
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
                variant="outline"
                onClick={() => setEventSheetOpen(false)}
              >
                {!canEditEventSheet || (editingEvent && !isFormDirty) ? 'Close' : 'Cancel'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

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

function TimeSelectInput({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <SearchableSelect
        value={value}
        placeholder="Select time"
        searchPlaceholder="Search times..."
        emptyText="No times found."
        options={TIME_OPTIONS.map((time) => ({ value: time, label: time }))}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}

function DatePickerField({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = new Date(`${value}T00:00:00`);

  return (
    <div className="grid gap-2">
      <Label>Date</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full justify-between border-input bg-background text-left font-normal"
            disabled={disabled}
          >
            {format(selected, 'MMM d, yyyy')}
            <CalendarIcon className="size-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        {!disabled ? (
          <PopoverContent className="w-auto rounded-xl p-0" align="start">
            <Calendar
              mode="single"
              selected={selected}
              onSelect={(date) => {
                if (!date) return;
                onChange(dateKey(date));
                setOpen(false);
              }}
              defaultMonth={selected}
              className="rounded-xl border-0 bg-card p-2"
            />
          </PopoverContent>
        ) : null}
      </Popover>
    </div>
  );
}

type SearchableSelectOption = {
  value: string;
  label: string;
  searchValue?: string;
};

function SearchableSelectSearch({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="shrink-0 p-2">
      <div className="relative">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-9 pl-9"
        />
      </div>
    </div>
  );
}

function SearchableSelectList({
  options,
  selectedValue,
  emptyText,
  onSelect,
}: {
  options: SearchableSelectOption[];
  selectedValue?: string;
  emptyText: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="p-1">
      {options.length === 0 ? (
        <div className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyText}</div>
      ) : (
        options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className={cn(
              'flex w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted',
              option.value === selectedValue && 'bg-muted text-foreground',
            )}
          >
            <span className="truncate">{option.label}</span>
          </button>
        ))
      )}
    </div>
  );
}

function SearchableSelect({
  value,
  placeholder,
  searchPlaceholder,
  emptyText,
  options,
  onChange,
  disabled = false,
}: {
  value?: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  options: SearchableSelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const selectedOption = options.find((option) => option.value === value);

  const filteredOptions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return options;

    return options.filter((option) =>
      `${option.label} ${option.searchValue ?? ''}`.toLowerCase().includes(query),
    );
  }, [options, searchQuery]);

  useEffect(() => {
    if (!open) setSearchQuery('');
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-10 w-full justify-between border-input bg-background text-left font-normal"
          disabled={disabled}
        >
          <span className={cn('truncate', !selectedOption && 'text-muted-foreground')}>
            {selectedOption?.label ?? placeholder}
          </span>
          <ChevronRight className="size-4 rotate-90 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="flex w-[var(--radix-popover-trigger-width)] flex-col gap-0 overflow-hidden rounded-xl p-0"
        align="start"
        onWheel={(event) => event.stopPropagation()}
      >
        <SearchableSelectSearch
          value={searchQuery}
          placeholder={searchPlaceholder}
          onChange={setSearchQuery}
        />
        <ScrollArea className="h-60 overflow-hidden">
          <SearchableSelectList
            options={filteredOptions}
            selectedValue={value}
            emptyText={emptyText}
            onSelect={(nextValue) => {
              onChange(nextValue);
              setOpen(false);
            }}
          />
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
