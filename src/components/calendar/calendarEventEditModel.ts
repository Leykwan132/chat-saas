import type { Doc, Id } from '../../../convex/_generated/dataModel';
import {
  combineDateTimeInTimeZone,
  dateKeyInTimeZone,
  formatTimestampInTimeZone,
} from '@/lib/calendarTimeUtils';

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

export type CalendarEventForEditing = Doc<'calendarEvents'> & {
  participants: CalendarParticipant[];
};

export type ServiceFieldDefinition = {
  key: string;
  label: string;
  type: string;
  options?: string[];
};

export type TeamUserOption = Pick<Doc<'users'>, '_id' | 'firstName' | 'lastName' | 'email'> & {
  role?: string;
};

export type EventEditFormState = {
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

export const DEFAULT_COLLECTED_FIELD_KEYS = new Set(['date', 'time', 'name', 'phone']);

export function memberLabel(user: Pick<Doc<'users'>, 'firstName' | 'lastName' | 'email'>) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return name || user.email;
}

export function customerDetailServiceFields(serviceFields: ServiceFieldDefinition[]) {
  return serviceFields.filter(
    (field) => !DEFAULT_COLLECTED_FIELD_KEYS.has(field.key.toLowerCase()),
  );
}

export function collectedFieldsToFormValues(
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

export function parseCollectedFieldFormValue(
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

export function buildCustomFieldResponses(
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

function findEventCustomer(event: CalendarEventForEditing) {
  return event.participants.find((participant) => participant.role === 'customer');
}

function findAssignedUser(event: CalendarEventForEditing) {
  return event.participants.find((participant) => participant.role === 'assigned');
}

export function formStateFromEvent(event: CalendarEventForEditing): EventEditFormState {
  const customer = findEventCustomer(event);
  const assigned = findAssignedUser(event);
  const timeZone = event.timeZone;
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

export function combineDateTime(date: string, time: string, timeZone: string) {
  return combineDateTimeInTimeZone(date, time, timeZone);
}

export function getAllDayBounds(date: string, timeZone: string) {
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
