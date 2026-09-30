import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internalMutation } from "../triggers";
import { AppointmentBookingBatchStatus } from "../appointmentBookingBatchStatus";
import { AppointmentBookingSessionStatus } from "../appointmentBookingSessionStatus";
import { removeParticipantAvailabilityIntervals } from "../calendarAvailabilityIntervals";
import { prepareLocalBatch } from "../appointmentBooking/batchCreate";
import { insertCalendarParticipants, resolveCustomerForConversation } from "../appointmentBooking/calendarHelpers";
import {
  bookingDisplayName,
  buildCalendarEventDescription,
  serviceBookingLocation,
  serviceTimeZone,
} from "../appointmentBooking/fields";
import { googleCalendarBookingGate, loadGoogleCalendarConnectionForUser } from "./bookingGate";
import {
  googleCalendarBookingOperationKey,
  googleCalendarWriteInputFromEvent,
  pendingKilobotGoogleEventFields,
} from "./bookingPayload";
import type { PrepareBatchBookResult, PreparedBatchWrite } from "./batchBookingTypes";
import type { PreparedBatch } from "../appointmentBooking/batchCreate";

function reusableCalendarEvent(event: Doc<"calendarEvents">) {
  return event.status !== "cancelled" && (
    (event.externalOrigin === "kilobot" && event.externalSyncState === "pending") ||
    (event.externalSyncState === "synced" && event.externalEventId !== undefined)
  );
}

async function clearPendingBatchChildren(
  ctx: MutationCtx,
  batchId: Id<"appointmentBookingBatches">,
) {
  const batch = await ctx.db.get(batchId);
  if (batch === null) return;
  for (const eventId of batch.calendarEventIds ?? []) {
    const event = await ctx.db.get(eventId);
    if (event === null || event.externalSyncState === "synced") continue;
    const participants = await ctx.db
      .query("calendarEventParticipants")
      .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
      .take(100);
    for (const participant of participants) {
      await removeParticipantAvailabilityIntervals(ctx, participant._id);
      await ctx.db.delete(participant._id);
    }
    await ctx.db.delete(eventId);
  }
  for (const sessionId of batch.sessionIds ?? []) {
    const session = await ctx.db.get(sessionId);
    if (session !== null && session.status !== AppointmentBookingSessionStatus.Booked) {
      await ctx.db.delete(sessionId);
    }
  }
  await ctx.db.patch(batchId, {
    calendarEventIds: undefined,
    sessionIds: undefined,
    updatedAt: Date.now(),
  });
}

async function reusePendingBatchWrites(
  ctx: MutationCtx,
  args: { refreshed: boolean },
  prepared: PreparedBatch,
): Promise<PrepareBatchBookResult | null> {
  const { batch, service, slots } = prepared;
  const eventIds = batch.calendarEventIds ?? [];
  if (eventIds.length === 0) return null;
  const events: Doc<"calendarEvents">[] = [];
  for (const eventId of eventIds) {
    const event = await ctx.db.get(eventId);
    if (event !== null) events.push(event);
  }
  const sessionByEventId = new Map<Id<"calendarEvents">, Doc<"appointmentBookingSessions">>();
  for (const sessionId of batch.sessionIds ?? []) {
    const session = await ctx.db.get(sessionId);
    if (session?.calendarEventId !== undefined) sessionByEventId.set(session.calendarEventId, session);
  }
  const matched = slots.map((slot) => {
    const event = events.find((row) => row.startAt === slot.startAt && reusableCalendarEvent(row));
    const session = event === undefined ? undefined : sessionByEventId.get(event._id);
    return event === undefined || session === undefined ? null : { event, session, slot };
  });
  if (matched.some((row) => row === null)) {
    if (events.some((event) => event.externalSyncState === "synced")) {
      return {
        kind: "failed",
        result: { success: false, message: "One or more requested times are no longer available. Check availability again." },
      };
    }
    await clearPendingBatchChildren(ctx, batch._id);
    return null;
  }
  const now = Date.now();
  const writes: PreparedBatchWrite[] = [];
  for (const row of matched) {
    if (row === null) continue;
    const operationKey = row.event.externalOperationKey
      ?? googleCalendarBookingOperationKey(row.session._id, "create");
    if (row.event.externalSyncState === "synced") {
      writes.push({
        kind: "local",
        calendarEventId: row.event._id,
        sessionId: row.session._id,
        operationKey,
        event: googleCalendarWriteInputFromEvent(row.event),
        now,
      });
      continue;
    }
    const connection = await loadGoogleCalendarConnectionForUser(ctx, row.slot.assignedUserId);
    const gate = googleCalendarBookingGate(connection);
    if (gate.kind !== "google") {
      return { kind: "failed", result: { success: false, message: "Google Calendar needs to be reconnected." } };
    }
    writes.push({
      kind: "google",
      connectionId: gate.connectionId,
      calendarEventId: row.event._id,
      sessionId: row.session._id,
      operationKey,
      event: googleCalendarWriteInputFromEvent(row.event, {
        conferenceRequestId: service.locationMode === "remote" ? operationKey : undefined,
      }),
      now,
    });
  }
  const connectionIds = [...new Set(writes.flatMap((write) =>
    write.connectionId === undefined ? [] : [write.connectionId]
  ))];
  if (connectionIds.length > 0 && !args.refreshed) {
    return { kind: "needs_refresh", connectionIds };
  }
  for (const write of writes) {
    if (write.kind !== "google") continue;
    const event = await ctx.db.get(write.calendarEventId);
    if (event === null || event.externalEventId !== undefined) continue;
    const ownerUserId = event.externalOwnerUserId ?? event.createdBy;
    await ctx.db.patch(event._id, await pendingKilobotGoogleEventFields({
      ownerUserId,
      operationKey: write.operationKey,
    }));
  }
  await ctx.db.patch(batch._id, {
    status: AppointmentBookingBatchStatus.Creating,
    updatedAt: now,
  });
  return { kind: "prepared", batchId: batch._id, writes };
}

export const prepareBatchBook = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    serviceId: v.id("appointmentServices"),
    startAts: v.array(v.number()),
    refreshed: v.boolean(),
  },
  handler: async (ctx, args): Promise<PrepareBatchBookResult> => {
    const preparation = await prepareLocalBatch(ctx, args);
    if (preparation.kind === "failed") {
      return { kind: "failed", result: preparation.result };
    }
    const reused = await reusePendingBatchWrites(ctx, args, preparation.prepared);
    if (reused !== null) return reused;
    const { batch, conversation, agent, service, team, slots } = preparation.prepared;
    const gates = [];
    for (const slot of slots) {
      const connection = await loadGoogleCalendarConnectionForUser(ctx, slot.assignedUserId);
      const gate = googleCalendarBookingGate(connection);
      if (gate.kind === "error") {
        return { kind: "failed", result: { success: false, ...gate.result } };
      }
      gates.push(gate);
    }
    const connectionIds = [...new Set(gates.flatMap((gate) =>
      gate.kind === "google" ? [gate.connectionId] : []
    ))];
    if (connectionIds.length > 0 && !args.refreshed) {
      return { kind: "needs_refresh", connectionIds };
    }
    const now = Date.now();
    const attendeeName = bookingDisplayName(batch.collectedFields);
    const customer = await resolveCustomerForConversation(ctx, conversation, batch.collectedFields);
    const timeZone = serviceTimeZone(service, team);
    const eventIds: Id<"calendarEvents">[] = [];
    const sessionIds: Id<"appointmentBookingSessions">[] = [];
    const writes: PreparedBatchWrite[] = [];
    for (const [index, slot] of slots.entries()) {
      const assignedUser = await ctx.db.get(slot.assignedUserId);
      if (assignedUser === null) throw new Error("Assigned teammate not found");
      const gate = gates[index]!;
      const sessionId = await ctx.db.insert("appointmentBookingSessions", {
        conversationId: conversation._id,
        agentId: agent._id,
        serviceId: service._id,
        status: AppointmentBookingSessionStatus.Confirming,
        collectedFields: batch.collectedFields,
        selectedSlot: slot,
        customerConfirmationMessageId: batch.customerConfirmationMessageId,
        createdAt: now,
        updatedAt: now,
      });
      const operationKey = googleCalendarBookingOperationKey(sessionId, "create");
      const eventId = await ctx.db.insert("calendarEvents", {
        teamId: team._id,
        title: `${service.name} - ${attendeeName}`,
        description: buildCalendarEventDescription({
          service,
          customer,
          conversation,
          collectedFields: batch.collectedFields,
        }),
        location: serviceBookingLocation(service),
        startAt: slot.startAt,
        endAt: slot.endAt,
        timeZone,
        status: "confirmed",
        createdBy: assignedUser._id,
        agentId: agent._id,
        conversationId: conversation._id,
        appointmentServiceId: service._id,
        bookingSource: "ai",
        customFieldResponses: batch.collectedFields,
        ...(gate.kind === "google" ? await pendingKilobotGoogleEventFields({
          ownerUserId: assignedUser._id,
          operationKey,
        }) : {}),
        createdAt: now,
        updatedAt: now,
      });
      await insertCalendarParticipants(ctx, {
        eventId,
        teamId: team._id,
        customer,
        assignedUser,
        bookingDisplayName: attendeeName,
        eventStartAt: slot.startAt,
        eventEndAt: slot.endAt,
        now,
      });
      await ctx.db.patch(sessionId, { calendarEventId: eventId });
      const event = await ctx.db.get(eventId);
      if (event === null) throw new Error("Booking event was not created");
      eventIds.push(eventId);
      sessionIds.push(sessionId);
      writes.push({
        kind: gate.kind,
        connectionId: gate.kind === "google" ? gate.connectionId : undefined,
        calendarEventId: eventId,
        sessionId,
        operationKey,
        event: googleCalendarWriteInputFromEvent(event, {
          conferenceRequestId: service.locationMode === "remote" ? operationKey : undefined,
        }),
        now,
      });
    }
    await ctx.db.patch(batch._id, {
      status: AppointmentBookingBatchStatus.Creating,
      calendarEventIds: eventIds,
      sessionIds,
      updatedAt: now,
    });
    return { kind: "prepared", batchId: batch._id, writes };
  },
});
