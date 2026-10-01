import { formatTimestampInTimeZone } from '../../lib/calendarTimeUtils';

type ClockTime = {
  hour: string;
  minute: string;
  period: string;
};

function clockTime(timestamp: number, timeZone: string): ClockTime {
  const formatted = formatTimestampInTimeZone(timestamp, timeZone, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const match = formatted.match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (!match) throw new Error(`Unexpected booking time format: ${formatted}`);
  return {
    hour: match[1],
    minute: match[2],
    period: match[3].toLowerCase(),
  };
}

function formatBookingTimeRange(startAt: number, endAt: number, timeZone: string) {
  const start = clockTime(startAt, timeZone);
  const end = clockTime(endAt, timeZone);
  const startClock = `${start.hour}:${start.minute}`;
  const endClock = `${end.hour}:${end.minute}${end.period}`;
  return start.period === end.period
    ? `${startClock} – ${endClock}`
    : `${startClock}${start.period} – ${endClock}`;
}

export function formatCompactBookingSchedule(
  startAt: number,
  endAt: number,
  timeZone: string,
) {
  const weekday = formatTimestampInTimeZone(startAt, timeZone, { weekday: 'long' });
  const day = formatTimestampInTimeZone(startAt, timeZone, { day: 'numeric' });
  const month = formatTimestampInTimeZone(startAt, timeZone, { month: 'short' });
  return `${weekday}, ${day} ${month} · ${formatBookingTimeRange(startAt, endAt, timeZone)}`;
}
