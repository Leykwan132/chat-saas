import type { Doc, Id } from "../_generated/dataModel";
import { deriveGoogleCalendarEventId } from "./writeFingerprint";
import type { GoogleCalendarWriteInput } from "./writeTypes";

export function googleCalendarWriteInputFromEvent(
  event: Doc<"calendarEvents">,
  options?: { conferenceRequestId?: string },
): GoogleCalendarWriteInput {
  if (event.allDay === true && event.startDate !== undefined && event.endDate !== undefined) {
    return {
      summary: event.title,
      description: event.description,
      location: event.location,
      start: { date: event.startDate },
      end: { date: event.endDate },
      conferenceRequestId: options?.conferenceRequestId,
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
    conferenceRequestId: options?.conferenceRequestId,
  };
}

export function googleCalendarBookingOperationKey(
  sessionId: string,
  action: "create" | "update" | "delete",
) {
  return `booking:${sessionId}:${action}`;
}

export async function pendingKilobotGoogleEventFields(args: {
  ownerUserId: Id<"users">;
  operationKey: string;
}) {
  return {
    externalProvider: "google" as const,
    externalCalendarId: "primary" as const,
    externalOwnerUserId: args.ownerUserId,
    externalOrigin: "kilobot" as const,
    externalEventId: await deriveGoogleCalendarEventId(args.operationKey),
    externalStatus: "confirmed" as const,
    externalTransparency: "opaque" as const,
    externalCanEdit: true,
    externalSyncState: "pending" as const,
    externalOperationKey: args.operationKey,
  };
}

export function googleCalendarEventOperationKey(
  eventId: string,
  action: "create" | "update" | "delete",
) {
  return `calendar:${eventId}:${action}`;
}
