import { v } from "convex/values";
import { internalMutation, type MutationCtx } from "../_generated/server";
import {
  assertMutableCalendarEvent,
  calendarEventUpdateArgs,
} from "../calendarEventsHelpers";
import { applyKilobotBookingGoogleCancellation } from "./bookingGoogleChange";
import {
  googleCalendarBookingGate,
  loadGoogleCalendarConnectionForUser,
} from "./bookingGate";
import { googleCalendarOperationError } from "./contracts";
import { googleCalendarEventOperationKey, googleCalendarWriteInputFromEvent } from "./bookingPayload";
import { googleCalendarWriteInputValidator } from "./writeTypes";
import type { Doc, Id } from "../_generated/dataModel";

const calendarEventPrepareValidator = v.union(
  v.object({ kind: v.literal("local") }),
  v.object({
    kind: v.literal("needs_refresh"),
    connectionId: v.id("googleCalendarConnections"),
  }),
  v.object({
    kind: v.literal("google"),
    connectionId: v.id("googleCalendarConnections"),
    calendarEventId: v.id("calendarEvents"),
    operationKey: v.string(),
    action: v.union(v.literal("update"), v.literal("delete")),
    event: googleCalendarWriteInputValidator,
    now: v.number(),
  }),
);

function needsGoogleWrite(args: {
  title?: string;
  description?: string;
  location?: string;
  startAt?: number;
  endAt?: number;
  timeZone?: string;
  allDay?: boolean;
  startDate?: string;
  endDate?: string;
  status?: "confirmed" | "tentative" | "cancelled";
}) {
  return args.title !== undefined || args.description !== undefined || args.location !== undefined
    || args.startAt !== undefined || args.endAt !== undefined || args.timeZone !== undefined
    || args.allDay !== undefined || args.startDate !== undefined || args.endDate !== undefined
    || args.status !== undefined;
}

async function googleWriteGate(
  ctx: MutationCtx,
  event: Doc<"calendarEvents">,
  refreshed: boolean | undefined,
  requireWrite: boolean,
) {
  const ownerId = event.externalOwnerUserId ?? event.createdBy;
  const connection = await loadGoogleCalendarConnectionForUser(ctx, ownerId);
  const gate = googleCalendarBookingGate(connection);
  if (event.externalOrigin === "google") {
    if (gate.kind === "error") throw new Error(gate.result.message);
    if (gate.kind !== "google") {
      throw new Error(googleCalendarOperationError("not_connected").message);
    }
    if (!requireWrite) return { kind: "local" as const };
    if (refreshed !== true) {
      return { kind: "needs_refresh" as const, connectionId: gate.connectionId };
    }
    return { kind: "google" as const, connectionId: gate.connectionId };
  }
  if (gate.kind === "error") throw new Error(gate.result.message);
  if (gate.kind !== "google" || event.externalOrigin !== "kilobot" || !requireWrite) {
    return { kind: "local" as const };
  }
  if (refreshed !== true) {
    return { kind: "needs_refresh" as const, connectionId: gate.connectionId };
  }
  return { kind: "google" as const, connectionId: gate.connectionId };
}

function googleWriteResult(
  connectionId: Id<"googleCalendarConnections">,
  event: Doc<"calendarEvents">,
  action: "update" | "delete",
  next: Doc<"calendarEvents">,
) {
  return {
    kind: "google" as const,
    connectionId,
    calendarEventId: event._id,
    operationKey: googleCalendarEventOperationKey(event._id, action),
    action,
    event: googleCalendarWriteInputFromEvent(next),
    now: Date.now(),
  };
}

export const prepareUpdate = internalMutation({
  args: { ...calendarEventUpdateArgs, refreshed: v.optional(v.boolean()) },
  returns: calendarEventPrepareValidator,
  handler: async (ctx, args) => {
    const { event } = await assertMutableCalendarEvent(ctx, args.eventId);
    const gated = await googleWriteGate(ctx, event, args.refreshed, needsGoogleWrite(args));
    if (gated.kind !== "google") return gated;
    const next = {
      ...event,
      title: args.title?.trim() || event.title,
      description: args.description === undefined ? event.description : args.description.trim() || undefined,
      location: args.location === undefined ? event.location : args.location.trim() || undefined,
      startAt: args.startAt ?? event.startAt,
      endAt: args.endAt ?? event.endAt,
      timeZone: args.timeZone ?? event.timeZone,
      allDay: args.allDay ?? event.allDay,
      startDate: args.startDate ?? event.startDate,
      endDate: args.endDate ?? event.endDate,
    };
    return googleWriteResult(
      gated.connectionId,
      event,
      args.status === "cancelled" ? "delete" : "update",
      next,
    );
  },
});

export const prepareRemove = internalMutation({
  args: { eventId: v.id("calendarEvents"), refreshed: v.optional(v.boolean()) },
  returns: calendarEventPrepareValidator,
  handler: async (ctx, args) => {
    const { event } = await assertMutableCalendarEvent(ctx, args.eventId);
    const gated = await googleWriteGate(ctx, event, args.refreshed, true);
    if (gated.kind !== "google") return gated;
    return googleWriteResult(gated.connectionId, event, "delete", event);
  },
});

export const applyGoogleCancellation = internalMutation({
  args: { eventId: v.id("calendarEvents") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (event === null) return null;
    await applyKilobotBookingGoogleCancellation(ctx, event, Date.now());
    return null;
  },
});
