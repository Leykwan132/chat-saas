import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import {
  googleCalendarOperationError,
  type GoogleCalendarOperationFailure,
  type GoogleCalendarOperationResult,
} from "./contracts";

export type GoogleCalendarBookingGate =
  | { kind: "local" }
  | { kind: "google"; connectionId: Id<"googleCalendarConnections"> }
  | { kind: "error"; result: GoogleCalendarOperationFailure };

export async function loadGoogleCalendarConnectionForUser(
  ctx: MutationCtx,
  userId: Id<"users">,
) {
  return await ctx.db
    .query("googleCalendarConnections")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
}

export function googleCalendarBookingGate(
  connection: Doc<"googleCalendarConnections"> | null,
): GoogleCalendarBookingGate {
  if (connection === null) return { kind: "local" };
  if (connection.state === "disconnected") {
    return { kind: "error", result: googleCalendarOperationError("not_connected") };
  }
  if (
    connection.state === "needs_reauthorization" ||
    connection.lastErrorKind === "needs_reauthorization" ||
    connection.lastErrorKind === "forbidden"
  ) {
    return { kind: "error", result: googleCalendarOperationError("needs_reauthorization") };
  }
  if (connection.state !== "connected" && connection.state !== "syncing") {
    return { kind: "error", result: googleCalendarOperationError("needs_reauthorization") };
  }
  return { kind: "google", connectionId: connection._id };
}

export function bookingFailureFromGoogle(
  result: GoogleCalendarOperationResult,
) {
  if (result.kind === "success") {
    throw new Error("Google Calendar booking failure requires an error result");
  }
  return {
    success: false as const,
    message: result.message,
    kind: result.kind,
  };
}
