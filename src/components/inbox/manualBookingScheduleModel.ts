import { combineDateTimeInTimeZone } from '../../lib/calendarTimeUtils';

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

export function getManualBookingSelection(
  serviceId: string,
  date: string,
  time: string,
  timeZone: string,
) {
  if (!serviceId || !date || !time || !timeZone) return null;
  const startAt = combineDateTimeInTimeZone(date, time, timeZone);
  if (startAt === null) return null;
  return {
    key: [serviceId, date, time, timeZone].join('|'),
    startAt,
  };
}
