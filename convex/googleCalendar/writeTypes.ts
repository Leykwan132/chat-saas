import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MappedGoogleCalendarEvent } from "./eventMapping";
import type { GoogleCalendarCredentialResult } from "./workosToken";
import type { GoogleCalendarOperationResult } from "./contracts";

const eventDateTimeValidator = v.object({
  date: v.optional(v.string()),
  dateTime: v.optional(v.string()),
  timeZone: v.optional(v.string()),
});

export const googleCalendarWriteInputValidator = v.object({
  summary: v.string(),
  description: v.optional(v.string()),
  location: v.optional(v.string()),
  start: eventDateTimeValidator,
  end: eventDateTimeValidator,
  transparency: v.optional(v.union(v.literal("opaque"), v.literal("transparent"))),
  attendees: v.optional(v.array(v.object({
    email: v.string(),
    displayName: v.optional(v.string()),
  }))),
});

export type GoogleCalendarWriteInput = {
  summary: string;
  description?: string;
  location?: string;
  start: { date?: string; dateTime?: string; timeZone?: string };
  end: { date?: string; dateTime?: string; timeZone?: string };
  transparency?: "opaque" | "transparent";
  attendees?: Array<{ email: string; displayName?: string }>;
};

export type GoogleCalendarWriteArgs = {
  connectionId: Id<"googleCalendarConnections">;
  calendarEventId: Id<"calendarEvents">;
  operationKey: string;
  now: number;
};

export type GoogleCalendarEventWriteArgs = GoogleCalendarWriteArgs & {
  event: GoogleCalendarWriteInput;
};

export type GoogleCalendarPreparedWrite =
  | { kind: "error"; result: GoogleCalendarOperationResult }
  | {
      kind: "ready";
      operationId: Id<"googleCalendarWriteOperations">;
      workosUserId: string;
      timeZone: string;
      externalEventId: string;
      knownEtag?: string;
    };

export type GoogleCalendarWriteDependencies = {
  prepare(args: {
    connectionId: Id<"googleCalendarConnections">;
    calendarEventId: Id<"calendarEvents">;
    operationKey: string;
    action: "create" | "update" | "delete";
    externalEventId?: string;
    now: number;
  }): Promise<GoogleCalendarPreparedWrite>;
  finalizeEvent(args: {
    operationId: Id<"googleCalendarWriteOperations">;
    event: MappedGoogleCalendarEvent;
    now: number;
  }): Promise<string>;
  finalizeDelete(args: {
    operationId: Id<"googleCalendarWriteOperations">;
    now: number;
  }): Promise<string>;
  recordOutcome(args: {
    operationId: Id<"googleCalendarWriteOperations">;
    kind: Exclude<GoogleCalendarOperationResult["kind"], "success">;
    now: number;
  }): Promise<null>;
  getCredential(workosUserId: string): Promise<GoogleCalendarCredentialResult>;
  refresh(args: { connectionId: Id<"googleCalendarConnections"> }): Promise<unknown>;
  fetchImplementation: typeof fetch;
};
