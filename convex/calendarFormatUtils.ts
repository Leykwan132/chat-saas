import { normalizeTimeZone } from "./teamHelpers";

export function formatCalendarDateTime(
  startAt: number,
  endAt: number,
  timeZone: string,
) {
  const tz = normalizeTimeZone(timeZone);
  const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
  });
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    month: "long",
    day: "numeric",
  });
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
  });

  const weekday = weekdayFormatter.format(new Date(startAt));
  const datePart = dateFormatter.format(new Date(startAt));

  return {
    date: `${datePart} (${weekday})`,
    timeRange: `${timeFormatter.format(new Date(startAt))} - ${timeFormatter.format(new Date(endAt))}`,
  };
}

export function formatCalendarAllDayDate(startAt: number, timeZone: string) {
  const tz = normalizeTimeZone(timeZone);
  const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
  });
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    month: "long",
    day: "numeric",
  });

  const weekday = weekdayFormatter.format(new Date(startAt));
  const datePart = dateFormatter.format(new Date(startAt));

  return `${datePart} (${weekday})`;
}
