import spacetime from 'spacetime';

export const DEFAULT_CALENDAR_TIMEZONE = 'Asia/Kuala_Lumpur';

const CALENDAR_TIMEZONE_IDS = [
  DEFAULT_CALENDAR_TIMEZONE,
  'Asia/Singapore',
  'Asia/Bangkok',
  'Asia/Jakarta',
  'Asia/Manila',
  'Asia/Hong_Kong',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Dubai',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Australia/Sydney',
] as const;

export function normalizeCalendarTimeZone(timeZone: string | null | undefined) {
  return timeZone?.trim() || DEFAULT_CALENDAR_TIMEZONE;
}

function formatGmtOffset(offsetMinutes: number) {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;
  if (minutes === 0) {
    return `GMT${sign}${hours}`;
  }
  return `GMT${sign}${hours}:${String(minutes).padStart(2, '0')}`;
}

function formatTimeZoneCityName(timeZone: string) {
  if (timeZone === 'UTC') return 'UTC';
  const segment = timeZone.split('/').pop() ?? timeZone;
  return segment.replace(/_/g, ' ');
}

export function formatTimeZoneDisplayLabel(timeZone: string) {
  const normalized = timeZone.trim() === 'UTC' ? 'UTC' : normalizeCalendarTimeZone(timeZone);
  const offset = formatGmtOffset(spacetime.now(normalized).offset());
  return `(${offset}) ${formatTimeZoneCityName(normalized)}`;
}

export const CALENDAR_TIMEZONE_OPTIONS = CALENDAR_TIMEZONE_IDS.map((value) => ({
  value,
  label: formatTimeZoneDisplayLabel(value),
}));

export function getClientTimeZone() {
  return normalizeCalendarTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
}

export function dateKeyInTimeZone(date: Date | number, timeZone: string) {
  return spacetime(
    typeof date === 'number' ? date : date.getTime(),
    normalizeCalendarTimeZone(timeZone),
  ).format('iso-short');
}

export function formatTimestampInTimeZone(
  timestamp: number,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: normalizeCalendarTimeZone(timeZone),
    ...options,
  }).format(new Date(timestamp));
}

export function combineDateTimeInTimeZone(
  date: string,
  time: string,
  timeZone: string,
): number | null {
  const parsed = parseCalendarTimeLabel(time);
  if (!parsed) return null;

  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) return null;

  return spacetime([year, month - 1, day], normalizeCalendarTimeZone(timeZone))
    .hour(parsed.hours24)
    .minute(parsed.minutes)
    .second(0)
    .millisecond(0)
    .epoch;
}

export function formatCalendarTimeOption(totalMinutes: number) {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export const CALENDAR_TIME_OPTIONS = Array.from({ length: 48 }, (_, index) =>
  formatCalendarTimeOption(index * 30),
);

export function parseCalendarTimeLabel(value: string) {
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
    label: formatCalendarTimeOption(hours24 * 60 + minutes),
  };
}

export function calendarTimeLabelToMinutes(value: string) {
  const parsed = parseCalendarTimeLabel(value);
  if (!parsed) return null;
  return parsed.hours24 * 60 + parsed.minutes;
}

export function minutesToCalendarTimeLabel(minutes: number) {
  return formatCalendarTimeOption(minutes);
}
