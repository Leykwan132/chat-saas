import { formatTimeZoneDisplayLabel } from '@/lib/calendarTimeUtils';

export const SCHEDULE_DAYS = [
  { dayOfWeek: 0, label: 'Sunday' },
  { dayOfWeek: 1, label: 'Monday' },
  { dayOfWeek: 2, label: 'Tuesday' },
  { dayOfWeek: 3, label: 'Wednesday' },
  { dayOfWeek: 4, label: 'Thursday' },
  { dayOfWeek: 5, label: 'Friday' },
  { dayOfWeek: 6, label: 'Saturday' },
] as const;

export type ScheduleShift = {
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
};

export const MINUTES_PER_DAY = 24 * 60;

export const DEFAULT_SHIFT_START_MINUTES = 9 * 60;
export const DEFAULT_SHIFT_END_MINUTES = 17 * 60;

export type DayAvailabilityMode = 'unavailable' | 'all-day' | 'custom';

export function getDayAvailabilityMode(shifts: ScheduleShift[]): DayAvailabilityMode {
  if (shifts.length === 0) return 'unavailable';
  if (shifts.length === 1 && isAllDayShift(shifts[0]!)) return 'all-day';
  return 'custom';
}

export function formatDayAvailabilityDetail(shifts: ScheduleShift[]): string {
  const mode = getDayAvailabilityMode(shifts);
  if (mode === 'unavailable') return 'Not receiving leads';
  if (mode === 'all-day') return 'Available anytime';
  return shifts
    .map(
      (shift) =>
        `${formatMinutes(shift.startMinutes)} – ${formatMinutes(shift.endMinutes)}`,
    )
    .join(', ');
}

const DAY_SHORT_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function scheduleKeyForDay(shifts: ScheduleShift[]): string {
  const mode = getDayAvailabilityMode(shifts);
  if (mode === 'unavailable') return '';
  if (mode === 'all-day') return 'all-day';
  return shifts.map((shift) => `${shift.startMinutes}-${shift.endMinutes}`).join('|');
}

export function formatMinutesAmPm(minutes: number) {
  if (minutes >= MINUTES_PER_DAY) {
    return '12:00 AM';
  }
  const hours24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${String(mins).padStart(2, '0')} ${period}`;
}

function formatShiftHoursAmPm(shifts: ScheduleShift[]) {
  return shifts
    .map(
      (shift) =>
        `${formatMinutesAmPm(shift.startMinutes)} - ${formatMinutesAmPm(shift.endMinutes)}`,
    )
    .join(', ');
}

function formatDayRangeLabel(startIndex: number, endIndex: number) {
  const start = DAY_SHORT_LABELS[SCHEDULE_DAYS[startIndex]!.dayOfWeek];
  const end = DAY_SHORT_LABELS[SCHEDULE_DAYS[endIndex]!.dayOfWeek];
  return startIndex === endIndex ? start : `${start} - ${end}`;
}

/** Cal.com-style lines, e.g. "Mon - Fri, 9:00 AM - 5:00 PM". */
export function describeWeeklyAvailabilityLines(shifts: ScheduleShift[]): string[] {
  const grouped = groupShiftsByDay(shiftsForDisplay(shifts));
  const slots = SCHEDULE_DAYS.map((day, index) => {
    const dayShifts = grouped.get(day.dayOfWeek) ?? [];
    const mode = getDayAvailabilityMode(dayShifts);
    return {
      index,
      mode,
      shifts: dayShifts,
      scheduleKey: scheduleKeyForDay(dayShifts),
    };
  });

  const availableCount = slots.filter((slot) => slot.mode !== 'unavailable').length;
  if (availableCount === 0) {
    return ['No available hours'];
  }

  type SlotGroup = {
    startIndex: number;
    endIndex: number;
    scheduleKey: string;
    mode: DayAvailabilityMode;
    shifts: ScheduleShift[];
  };

  const groups: SlotGroup[] = [];
  for (const slot of slots) {
    if (slot.mode === 'unavailable') continue;

    const last = groups[groups.length - 1];
    if (
      last &&
      last.scheduleKey === slot.scheduleKey &&
      last.endIndex === slot.index - 1
    ) {
      last.endIndex = slot.index;
      continue;
    }

    groups.push({
      startIndex: slot.index,
      endIndex: slot.index,
      scheduleKey: slot.scheduleKey,
      mode: slot.mode,
      shifts: slot.shifts,
    });
  }

  const lines = groups.map((group) => {
    const dayLabel = formatDayRangeLabel(group.startIndex, group.endIndex);
    return `${dayLabel}, ${formatShiftHoursAmPm(group.shifts)}`;
  });

  return lines.slice(0, 2);
}

export function isAllDayShift(shift: ScheduleShift): boolean {
  return shift.startMinutes === 0 && shift.endMinutes === MINUTES_PER_DAY;
}

/** Maps legacy all-day (midnight–midnight) rows to the standard 9am–5pm default. */
export function normalizeScheduleShift(shift: ScheduleShift): ScheduleShift {
  if (!isAllDayShift(shift)) return shift;
  return {
    dayOfWeek: shift.dayOfWeek,
    startMinutes: DEFAULT_SHIFT_START_MINUTES,
    endMinutes: DEFAULT_SHIFT_END_MINUTES,
  };
}

export function normalizeScheduleShifts(shifts: ScheduleShift[]): ScheduleShift[] {
  return shifts.map(normalizeScheduleShift);
}

export const DEFAULT_SCHEDULE_TIMEZONE = 'Asia/Kuala_Lumpur';

export function resolveScheduleTimezone(timezone: string | undefined | null): string {
  const trimmed = timezone?.trim();
  return trimmed || DEFAULT_SCHEDULE_TIMEZONE;
}

const SCHEDULE_TIMEZONE_IDS = [
  DEFAULT_SCHEDULE_TIMEZONE,
  'Asia/Singapore',
  'Asia/Bangkok',
  'Asia/Jakarta',
  'Asia/Manila',
  'Asia/Hong_Kong',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Europe/London',
  'America/New_York',
  'America/Los_Angeles',
  'UTC',
] as const;

export const SCHEDULE_TIMEZONE_OPTIONS = SCHEDULE_TIMEZONE_IDS.map((value) => ({
  value,
  label: formatTimeZoneDisplayLabel(value),
}));

export function formatMinutesCalLabel(minutes: number) {
  return formatMinutesAmPm(minutes).replace(' AM', 'am').replace(' PM', 'pm');
}

export function buildScheduleTimeOptions(stepMinutes = 15) {
  const options: Array<{ value: string; label: string }> = [];
  for (let minutes = 0; minutes < MINUTES_PER_DAY; minutes += stepMinutes) {
    options.push({
      value: String(minutes),
      label: formatMinutesCalLabel(minutes),
    });
  }
  // Midnight end-of-day (15-minute grid); start selects exclude this via value < MINUTES_PER_DAY.
  options.push({
    value: String(MINUTES_PER_DAY),
    label: formatMinutesCalLabel(MINUTES_PER_DAY),
  });
  return options;
}

/** Precomputed once — avoids rebuilding 90+ options on every editor mount. */
export const SCHEDULE_TIME_OPTIONS = buildScheduleTimeOptions();

/** Default weekly hours: 9:00am–5:00pm, every day. */
export const DEFAULT_SCHEDULE_SHIFTS: ScheduleShift[] = SCHEDULE_DAYS.map((day) => ({
  dayOfWeek: day.dayOfWeek,
  startMinutes: DEFAULT_SHIFT_START_MINUTES,
  endMinutes: DEFAULT_SHIFT_END_MINUTES,
}));

export function shiftsForDisplay(shifts: ScheduleShift[]): ScheduleShift[] {
  const source = shifts.length > 0 ? shifts : DEFAULT_SCHEDULE_SHIFTS;
  return normalizeScheduleShifts(source);
}

export function memberLabel(u: {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}) {
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return name.length > 0 ? name : u.email;
}

export function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function minutesFromTimeValue(value: string): number | null {
  const [hours, mins] = value.split(':').map((part) => Number.parseInt(part, 10));
  if (Number.isNaN(hours) || Number.isNaN(mins)) return null;
  if (hours < 0 || hours > 23 || mins < 0 || mins > 59) return null;
  return hours * 60 + mins;
}

export function groupShiftsByDay(shifts: ScheduleShift[]) {
  const grouped = new Map<number, ScheduleShift[]>();
  for (const day of SCHEDULE_DAYS) {
    grouped.set(day.dayOfWeek, []);
  }
  for (const shift of shifts) {
    const list = grouped.get(shift.dayOfWeek) ?? [];
    list.push(shift);
    grouped.set(shift.dayOfWeek, list);
  }
  for (const [dayOfWeek, list] of grouped) {
    list.sort((a, b) => a.startMinutes - b.startMinutes);
    grouped.set(dayOfWeek, list);
  }
  return grouped;
}

export function formatDateRangePreview(range: { from?: Date; to?: Date } | undefined) {
  if (!range?.from) return null;
  const end = range.to ?? range.from;
  const opts: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };
  const fmt = (date: Date) => date.toLocaleDateString(undefined, opts);
  if (
    range.to === undefined ||
    startOfDay(range.from).getTime() === startOfDay(end).getTime()
  ) {
    return fmt(range.from);
  }
  return `${fmt(range.from)} – ${fmt(end)}`;
}

export function formatTimeOffRange(startAt: number, endAt: number) {
  const fmt = (ts: number) =>
    new Date(ts).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  return `${fmt(startAt)} – ${fmt(endAt)}`;
}

export function isCurrentlyOnTimeOff(
  timeOff: Array<{ startAt: number; endAt: number }>,
  now = Date.now(),
) {
  return timeOff.some((row) => now >= row.startAt && now <= row.endAt);
}

export function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

export function endOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

/** Each calendar day covered by a time-off entry (for highlighting on the picker). */
export function calendarDaysForTimeOff(
  timeOff: Array<{ startAt: number; endAt: number }>,
): Date[] {
  const seen = new Set<string>();
  const days: Date[] = [];

  for (const entry of timeOff) {
    const cursor = startOfDay(new Date(entry.startAt));
    const last = startOfDay(new Date(entry.endAt));

    while (cursor <= last) {
      const key = cursor.toISOString().slice(0, 10);
      if (!seen.has(key)) {
        seen.add(key);
        days.push(new Date(cursor));
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return days;
}
