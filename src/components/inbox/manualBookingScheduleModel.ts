import {
  combineDateTimeInTimeZone,
  minutesToCalendarTimeLabel,
  parseCalendarTimeLabel,
} from '../../lib/calendarTimeUtils';

export type ManualBookingCollectedFields = Record<string, string | number | boolean | null>;

export function manualBookingCustomerFields<T extends { key: string }>(fields: T[]) {
  return fields.filter((field) => !['date', 'time'].includes(field.key.toLowerCase()));
}

export function buildManualBookingCollectedFields(
  fields: ManualBookingCollectedFields,
  date: string,
  time: string,
) {
  return { ...fields, date, time };
}

export function defaultManualBookingEndTime(startTime: string, durationMinutes: number) {
  const parsed = parseCalendarTimeLabel(startTime);
  if (parsed === null) return '';
  const endMinutes = parsed.hours24 * 60 + parsed.minutes + durationMinutes;
  return minutesToCalendarTimeLabel(endMinutes % (24 * 60));
}

export function getManualBookingSelection(
  serviceId: string,
  date: string,
  startTime: string,
  endTime: string,
  timeZone: string,
) {
  if (!serviceId || !date || !startTime || !endTime || !timeZone) {
    return { kind: 'incomplete' as const };
  }
  const startAt = combineDateTimeInTimeZone(date, startTime, timeZone);
  const endAt = combineDateTimeInTimeZone(date, endTime, timeZone);
  if (startAt === null || endAt === null) {
    return { kind: 'invalid' as const, message: 'Enter a valid start and end time.' };
  }
  if (endAt <= startAt) {
    return { kind: 'invalid' as const, message: 'End time must be after start time.' };
  }
  return {
    kind: 'ready' as const,
    key: [serviceId, date, startTime, endTime, timeZone].join('|'),
    startAt,
    endAt,
  };
}
