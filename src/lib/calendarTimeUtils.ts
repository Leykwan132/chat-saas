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
