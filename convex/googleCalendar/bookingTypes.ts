import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { googleCalendarErrorKindValidator } from "./contracts";
import { googleCalendarWriteInputValidator, type GoogleCalendarWriteInput } from "./writeTypes";

export const bookingToolResultValidator = v.object({
  success: v.boolean(),
  message: v.string(),
  bookingId: v.optional(v.id("calendarEvents")),
  serviceName: v.optional(v.string()),
  startAt: v.optional(v.number()),
  endAt: v.optional(v.number()),
  assignedTo: v.optional(v.string()),
  missingFields: v.optional(v.array(v.string())),
  kind: v.optional(googleCalendarErrorKindValidator),
});

export type BookingToolResult = {
  success: boolean;
  message: string;
  bookingId?: Id<"calendarEvents">;
  serviceName?: string;
  startAt?: number;
  endAt?: number;
  assignedTo?: string;
  missingFields?: string[];
  kind?:
    | "not_connected"
    | "needs_reauthorization"
    | "retryable"
    | "conflict"
    | "not_found"
    | "forbidden"
    | "invalid_request"
    | "failed";
};

export const prepareBookResultValidator = v.union(
  v.object({ kind: v.literal("completed"), result: bookingToolResultValidator }),
  v.object({ kind: v.literal("failed"), result: bookingToolResultValidator }),
  v.object({
    kind: v.literal("needs_refresh"),
    connectionId: v.id("googleCalendarConnections"),
  }),
  v.object({
    kind: v.literal("google"),
    connectionId: v.id("googleCalendarConnections"),
    calendarEventId: v.id("calendarEvents"),
    operationKey: v.string(),
    event: googleCalendarWriteInputValidator,
    now: v.number(),
  }),
);

export type PrepareBookResult =
  | { kind: "completed"; result: BookingToolResult }
  | { kind: "failed"; result: BookingToolResult }
  | { kind: "needs_refresh"; connectionId: Id<"googleCalendarConnections"> }
  | {
      kind: "google";
      connectionId: Id<"googleCalendarConnections">;
      calendarEventId: Id<"calendarEvents">;
      operationKey: string;
      event: GoogleCalendarWriteInput;
      now: number;
    };
