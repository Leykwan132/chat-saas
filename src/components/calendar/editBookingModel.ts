import type { Doc, Id } from '../../../convex/_generated/dataModel';
import {
  combineDateTimeInTimeZone,
  dateKeyInTimeZone,
  formatTimestampInTimeZone,
} from '../../lib/calendarTimeUtils';
import type { AppointmentBookingDisplayStatus } from '../../lib/appointmentBookingStatusPresentation';

export type CalendarParticipant = {
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

export type CalendarEvent = {
  _id: Id<'calendarEvents'>;
  teamId: string;
  title: string;
  description?: string;
  link?: string;
  startAt: number;
  endAt: number;
  timeZone: string;
  allDay?: boolean;
  bookingSource?: 'manual' | 'ai';
  appointmentServiceId?: Id<'appointmentServices'>;
  customFieldResponses?: Record<string, string | number | boolean | null>;
  remarks?: string;
  participants: CalendarParticipant[];
};

export type CustomerOption = {
  _id: Id<'customers'>;
  name?: string;
  email?: string;
  phone?: string;
  contactAddress: string;
};

export type ServiceFieldDefinition = {
  key: string;
  label: string;
  type: string;
  options?: string[];
};

export type EventFormState = {
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
  status?: AppointmentBookingDisplayStatus;
};

type EditBookingStatusResult =
  | undefined
  | { kind: 'missing_event' | 'missing_session' }
  | { kind: 'unsupported_status'; status: string }
  | { kind: 'editable'; status: string };

export type AppointmentBookingEditStatusState =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'unsupported' }
  | { kind: 'editable'; status: AppointmentBookingDisplayStatus };

type EditBookingDialogContentInput = {
  open: boolean;
  eventData: CalendarEvent | null | undefined;
  statusLoading: boolean;
  statusError: string | null;
  formState: EventFormState | null;
};

export function resolveEditBookingDialogContent({
  open,
  eventData,
  statusLoading,
  statusError,
  formState,
}: EditBookingDialogContentInput) {
  if (eventData === null) return 'notFound';
  if (open && (eventData === undefined || statusLoading || (!statusError && formState === null))) return 'loading';
  if (statusError) return 'error';
  if (formState) return 'form';
  return 'notFound';
}

export function bookingMutationErrorMessage(error: unknown) {
  if (!(error instanceof Error)) throw error;
  return error.message;
}

export function resolveAppointmentBookingEditStatus(
  result: EditBookingStatusResult,
): AppointmentBookingEditStatusState {
  if (result === undefined) return { kind: 'loading' };
  if (result.kind === 'missing_event' || result.kind === 'missing_session') return { kind: 'missing' };
  if (result.kind !== 'editable') return { kind: 'unsupported' };
  const { status } = result;
  if (
    status === 'booked' ||
    status === 'completed' ||
    status === 'cancelled' ||
    status === 'no_show'
  ) {
    return { kind: 'editable', status };
  }
  return { kind: 'unsupported' };
}

const DEFAULT_FIELD_KEYS = new Set(['date', 'time', 'name', 'phone']);

const toFormValues = (
  fields: Record<string, string | number | boolean | null | undefined>,
) => Object.fromEntries(Object.entries(fields).map(([key, value]) => [
  key,
  value === null || value === undefined ? '' : typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value),
]));

const parseValue = (raw: string, field?: ServiceFieldDefinition) => {
  const value = raw.trim();
  if (!value) return null;
  if (field?.type === 'number') {
    const number = Number(value);
    return Number.isFinite(number) ? number : value;
  }
  if (field?.type === 'boolean') return ['yes', 'true'].includes(value.toLowerCase());
  return value;
};

export function buildCustomFieldResponses(
  values: Record<string, string>,
  fields: ServiceFieldDefinition[],
) {
  const result: Record<string, string | number | boolean | null> = {};
  const definitions = new Map(fields.map((field) => [field.key, field]));
  for (const [key, value] of Object.entries(values)) {
    if (DEFAULT_FIELD_KEYS.has(key.toLowerCase()) && key !== 'name' && key !== 'phone') continue;
    result[key] = parseValue(value, definitions.get(key));
  }
  return result;
}

export const customerDetailServiceFields = (fields: ServiceFieldDefinition[]) =>
  fields.filter((field) => !DEFAULT_FIELD_KEYS.has(field.key.toLowerCase()));

export const memberLabel = (user: Pick<Doc<'users'>, 'firstName' | 'lastName' | 'email'>) =>
  [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email;

export const customerLabel = (customer: CustomerOption) =>
  customer.name?.trim() || customer.email?.trim() || customer.phone?.trim() || customer.contactAddress;

export function formStateFromEvent(
  event: CalendarEvent,
  displayTimeZone: string,
  status?: AppointmentBookingDisplayStatus,
): EventFormState {
  const customer = event.participants.find((participant) => participant.role === 'customer');
  const assigned = event.participants.find((participant) => participant.role === 'assigned');
  const timeZone = event.timeZone || displayTimeZone;
  return {
    title: event.title,
    customerId: customer?.customerId ?? '',
    assignedUserId: assigned?.userId ?? '',
    attendeeUserIds: event.participants.filter((participant) => participant.role === 'attendee' && participant.userId).map((participant) => participant.userId!),
    date: dateKeyInTimeZone(event.startAt, timeZone),
    startTime: formatTimestampInTimeZone(event.startAt, timeZone, { hour: 'numeric', minute: '2-digit', hour12: true }),
    endTime: formatTimestampInTimeZone(event.endAt, timeZone, { hour: 'numeric', minute: '2-digit', hour12: true }),
    allDay: event.allDay ?? false,
    timeZone,
    description: event.description ?? '',
    link: event.link ?? '',
    remarks: event.remarks ?? '',
    collectedFields: toFormValues(event.customFieldResponses ?? {}),
    ...(status ? { status } : {}),
  };
}

export const eventBounds = (state: EventFormState, timeZone: string) => {
  const startAt = combineDateTimeInTimeZone(state.date, state.allDay ? '12:00 AM' : state.startTime, timeZone);
  if (!state.allDay || startAt === null) {
    return { startAt, endAt: combineDateTimeInTimeZone(state.date, state.endTime, timeZone) };
  }
  const nextDate = dateKeyInTimeZone(startAt + 36 * 60 * 60 * 1000, timeZone);
  return { startAt, endAt: combineDateTimeInTimeZone(nextDate, '12:00 AM', timeZone) };
};
