export type GoogleCalendarEventDateTime = {
  date?: string;
  dateTime?: string;
  timeZone?: string;
};

export type GoogleCalendarEvent = {
  id: string;
  status: "confirmed" | "tentative" | "cancelled";
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  hangoutLink?: string;
  iCalUID?: string;
  etag?: string;
  updated?: string;
  transparency?: "opaque" | "transparent";
  recurringEventId?: string;
  originalStartTime?: GoogleCalendarEventDateTime;
  organizer?: { self?: boolean };
  start?: GoogleCalendarEventDateTime;
  end?: GoogleCalendarEventDateTime;
};

export type MappedGoogleCalendarEvent = {
  eventId: string;
  status: "confirmed" | "tentative" | "cancelled";
  title?: string;
  description?: string;
  location?: string;
  link?: string;
  htmlLink?: string;
  iCalUID?: string;
  etag?: string;
  updatedAt?: number;
  transparency: "opaque" | "transparent";
  blocksAvailability: boolean;
  canEdit: boolean;
  recurringEventId?: string;
  originalStartAt?: number;
  startAt?: number;
  endAt?: number;
  timeZone?: string;
  allDay?: boolean;
  startDate?: string;
  endDate?: string;
};

function requiredEventId(eventId: string) {
  if (eventId.trim().length === 0) {
    throw new Error("Google Calendar event ID is required");
  }
  return eventId;
}

function parsedInstant(value: string, field: string) {
  const instant = Date.parse(value);
  if (!Number.isFinite(instant)) {
    throw new Error(`Google Calendar ${field} is invalid`);
  }
  return instant;
}

function parsedDate(value: string, field: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Google Calendar ${field} is invalid`);
  }
  return parsedInstant(`${value}T00:00:00.000Z`, field);
}

function timeZoneOffsetMs(timestamp: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map((part) => [part.type, Number(part.value)]));
  return Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second,
  ) - Math.floor(timestamp / 1000) * 1000;
}

function dateAtTimeZoneStart(value: string, field: string, timeZone: string) {
  const utcMidnight = parsedDate(value, field);
  let instant = utcMidnight;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    instant = utcMidnight - timeZoneOffsetMs(instant, timeZone);
  }
  return instant;
}

function originalStartAt(event: GoogleCalendarEvent, calendarTimeZone?: string) {
  const original = event.originalStartTime;
  if (original?.dateTime !== undefined) {
    return parsedInstant(original.dateTime, "original start time");
  }
  if (original?.date !== undefined) {
    const timeZone = original.timeZone ?? calendarTimeZone;
    if (timeZone === undefined) {
      throw new Error("Google Calendar original start date time zone is required");
    }
    return dateAtTimeZoneStart(original.date, "original start date", timeZone);
  }
  return undefined;
}

function activeTimes(event: GoogleCalendarEvent, calendarTimeZone?: string) {
  if (event.start?.date !== undefined || event.end?.date !== undefined) {
    if (event.start?.date === undefined || event.end?.date === undefined) {
      throw new Error("Google Calendar all-day event dates are incomplete");
    }
    const timeZone = event.start.timeZone ?? event.end.timeZone ?? calendarTimeZone;
    if (timeZone === undefined) {
      throw new Error("Google Calendar all-day event time zone is required");
    }
    return {
      allDay: true,
      startDate: event.start.date,
      endDate: event.end.date,
      startAt: dateAtTimeZoneStart(event.start.date, "start date", timeZone),
      endAt: dateAtTimeZoneStart(event.end.date, "end date", timeZone),
      timeZone,
    };
  }
  if (event.start?.dateTime === undefined || event.end?.dateTime === undefined) {
    throw new Error("Google Calendar timed event boundaries are required");
  }
  const timeZone = event.start.timeZone ?? event.end.timeZone ?? calendarTimeZone;
  if (timeZone === undefined) {
    throw new Error("Google Calendar timed event time zone is required");
  }
  return {
    allDay: false,
    startAt: parsedInstant(event.start.dateTime, "start time"),
    endAt: parsedInstant(event.end.dateTime, "end time"),
    timeZone,
  };
}

export function mapGoogleEvent(
  event: GoogleCalendarEvent,
  calendarTimeZone?: string,
): MappedGoogleCalendarEvent {
  const eventId = requiredEventId(event.id);
  const transparency = event.transparency ?? "opaque";
  const recurringOriginalStartAt = originalStartAt(event, calendarTimeZone);
  const updatedAt = event.updated === undefined
    ? undefined
    : parsedInstant(event.updated, "updated time");
  const common = {
    eventId,
    status: event.status,
    transparency,
    blocksAvailability: event.status !== "cancelled" && transparency === "opaque",
    canEdit: event.organizer?.self === true,
    recurringEventId: event.recurringEventId,
    originalStartAt: recurringOriginalStartAt,
    etag: event.etag,
    updatedAt,
  };
  if (event.status === "cancelled") {
    return common;
  }
  const times = activeTimes(event, calendarTimeZone);
  return {
    ...common,
    ...times,
    originalStartAt: recurringOriginalStartAt ?? times.startAt,
    title: event.summary ?? "",
    description: event.description,
    location: event.location,
    link: event.hangoutLink,
    htmlLink: event.htmlLink,
    iCalUID: event.iCalUID,
    etag: event.etag,
    updatedAt,
  };
}
