import { formatTimestampInTimeZone } from '../../lib/calendarTimeUtils';

export function formatCompactBookingSchedule(
  startAt: number,
  _endAt: number,
  timeZone: string,
) {
  const date = formatTimestampInTimeZone(startAt, timeZone, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const time = formatTimestampInTimeZone(startAt, timeZone, {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${date}, ${time}`;
}
