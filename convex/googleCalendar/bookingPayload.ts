import type { Doc } from "../_generated/dataModel";
import type { GoogleCalendarWriteInput } from "./writeTypes";

export function googleCalendarWriteInputFromEvent(
  event: Doc<"calendarEvents">,
): GoogleCalendarWriteInput {
  if (event.allDay === true && event.startDate !== undefined && event.endDate !== undefined) {
    return {
      summary: event.title,
      description: event.description,
      location: event.location,
      start: { date: event.startDate },
      end: { date: event.endDate },
    };
  }
  return {
    summary: event.title,
    description: event.description,
    location: event.location,
    start: {
      dateTime: new Date(event.startAt).toISOString(),
      timeZone: event.timeZone,
    },
    end: {
      dateTime: new Date(event.endAt).toISOString(),
      timeZone: event.timeZone,
    },
  };
}

export function googleCalendarBookingOperationKey(
  sessionId: string,
  action: "create" | "update" | "delete",
) {
  return `booking:${sessionId}:${action}`;
}

export function googleCalendarEventOperationKey(
  eventId: string,
  action: "create" | "update" | "delete",
) {
  return `calendar:${eventId}:${action}`;
}
