import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import {
  removeParticipantAvailabilityIntervals,
  syncCalendarEventAvailabilityIntervals,
} from "../calendarAvailabilityIntervals";
import {
  assertCalendarAccess,
  calendarEventCreateArgs,
  type CalendarEventCreateInput,
  insertParticipants,
  validateTime,
} from "../calendarEventsHelpers";
import { Permission } from "../../shared/permissions";
import { normalizeTimeZone } from "../teamHelpers";
import {
  googleCalendarBookingGate,
  loadGoogleCalendarConnectionForUser,
} from "./bookingGate";
import {
  googleCalendarEventOperationKey,
  googleCalendarWriteInputFromEvent,
} from "./bookingPayload";
import { googleCalendarWriteInputValidator, type GoogleCalendarWriteInput } from "./writeTypes";

const calendarEventCreatePreparationValidator = v.union(
  v.object({ kind: v.literal("local"), eventId: v.id("calendarEvents") }),
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

export type CalendarEventCreatePreparation =
  | { kind: "local"; eventId: Id<"calendarEvents"> }
  | { kind: "needs_refresh"; connectionId: Id<"googleCalendarConnections"> }
  | {
      kind: "google";
      connectionId: Id<"googleCalendarConnections">;
      calendarEventId: Id<"calendarEvents">;
      operationKey: string;
      event: GoogleCalendarWriteInput;
      now: number;
    };

async function insertCalendarEvent(
  ctx: MutationCtx,
  args: CalendarEventCreateInput,
  creatorId: Id<"users">,
  teamId: Id<"teams">,
  pendingGoogleEvent: boolean,
) {
  const now = Date.now();
  const eventId = await ctx.db.insert("calendarEvents", {
    teamId,
    title: args.title.trim(),
    description: args.description?.trim() || undefined,
    location: args.location?.trim() || undefined,
    link: args.link?.trim() || undefined,
    startAt: args.startAt,
    endAt: args.endAt,
    timeZone: normalizeTimeZone(args.timeZone),
    allDay: args.allDay,
    startDate: args.startDate,
    endDate: args.endDate,
    status: args.status ?? "confirmed",
    createdBy: creatorId,
    createdAt: now,
    updatedAt: now,
  });
  if (pendingGoogleEvent) {
    await ctx.db.patch(eventId, {
      externalProvider: "google",
      externalCalendarId: "primary",
      externalOwnerUserId: creatorId,
      externalOrigin: "kilobot",
      externalStatus: "confirmed",
      externalTransparency: "opaque",
      externalCanEdit: true,
      externalSyncState: "pending",
      externalOperationKey: googleCalendarEventOperationKey(eventId, "create"),
      updatedAt: now,
    });
  }
  await insertParticipants(ctx, {
    eventId,
    teamId,
    customerId: args.customerId,
    assignedUserId: args.assignedUserId,
    attendeeUserIds: args.attendeeUserIds,
    eventStartAt: args.startAt,
    eventEndAt: args.endAt,
    now,
  });
  return { eventId, now };
}

export const prepareCreate = internalMutation({
  args: { ...calendarEventCreateArgs, refreshed: v.optional(v.boolean()) },
  returns: calendarEventCreatePreparationValidator,
  handler: async (ctx, args): Promise<CalendarEventCreatePreparation> => {
    const auth = await assertCalendarAccess(ctx, Permission.CALENDAR_MANAGE);
    validateTime(args);
    if (!args.title.trim()) throw new Error("Event title is required");
    const connection = await loadGoogleCalendarConnectionForUser(ctx, auth.userDbId);
    if (connection === null || connection.state === "disconnected") {
      const created = await insertCalendarEvent(ctx, args, auth.userDbId, auth.activeTeamId, false);
      await syncCalendarEventAvailabilityIntervals(ctx, created.eventId, created.now);
      return { kind: "local", eventId: created.eventId };
    }
    const gate = googleCalendarBookingGate(connection);
    if (gate.kind === "error") throw new Error(gate.result.message);
    if (args.refreshed !== true) {
      return { kind: "needs_refresh", connectionId: gate.connectionId };
    }
    const created = await insertCalendarEvent(ctx, args, auth.userDbId, auth.activeTeamId, true);
    const event = await ctx.db.get(created.eventId);
    if (event === null) throw new Error("Calendar event was not created");
    return {
      kind: "google",
      connectionId: gate.connectionId,
      calendarEventId: event._id,
      operationKey: googleCalendarEventOperationKey(event._id, "create"),
      event: googleCalendarWriteInputFromEvent(event),
      now: created.now,
    };
  },
});

export const rollbackCreate = internalMutation({
  args: { eventId: v.id("calendarEvents") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (event === null || event.externalSyncState !== "pending") return null;
    const participants = await ctx.db
      .query("calendarEventParticipants")
      .withIndex("by_eventId", (q) => q.eq("eventId", event._id))
      .take(100);
    for (const participant of participants) {
      await removeParticipantAvailabilityIntervals(ctx, participant._id);
      await ctx.db.delete(participant._id);
    }
    await ctx.db.delete(event._id);
    return null;
  },
});
