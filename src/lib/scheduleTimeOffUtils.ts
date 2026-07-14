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

export function formatDateRangePreview(range: { from?: Date; to?: Date } | undefined) {
  if (!range?.from) return null;
  const end = range.to ?? range.from;
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };
  const formatDate = (date: Date) => date.toLocaleDateString(undefined, options);
  if (
    range.to === undefined
    || startOfDay(range.from).getTime() === startOfDay(end).getTime()
  ) {
    return formatDate(range.from);
  }
  return `${formatDate(range.from)} – ${formatDate(end)}`;
}

export function formatTimeOffRange(startAt: number, endAt: number) {
  const formatTimestamp = (timestamp: number) =>
    new Date(timestamp).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  return `${formatTimestamp(startAt)} – ${formatTimestamp(endAt)}`;
}

export function isCurrentlyOnTimeOff(
  timeOff: Array<{ startAt: number; endAt: number }>,
  now = Date.now(),
) {
  return timeOff.some((row) => now >= row.startAt && now <= row.endAt);
}

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
