import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalMutation } from "../triggers";
import { AppointmentBookingBatchStatus } from "../appointmentBookingBatchStatus";
import { AppointmentBookingSessionStatus } from "../appointmentBookingSessionStatus";
import { prepareLocalBatch } from "../appointmentBooking/batchCreate";
import { insertCalendarParticipants, resolveCustomerForConversation } from "../appointmentBooking/calendarHelpers";
import {
  bookingDisplayName,
  buildCalendarEventDescription,
  serviceBookingLocation,
  serviceTimeZone,
} from "../appointmentBooking/fields";
import { googleCalendarBookingGate, loadGoogleCalendarConnectionForUser } from "./bookingGate";
import { googleCalendarBookingOperationKey, googleCalendarWriteInputFromEvent } from "./bookingPayload";
import type { PrepareBatchBookResult, PreparedBatchWrite } from "./batchBookingTypes";

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
        ...(gate.kind === "google" ? {
          externalProvider: "google" as const,
          externalCalendarId: "primary",
          externalOwnerUserId: assignedUser._id,
          externalOrigin: "kilobot" as const,
          externalStatus: "confirmed" as const,
          externalTransparency: "opaque" as const,
          externalCanEdit: true,
          externalSyncState: "pending" as const,
          externalOperationKey: operationKey,
        } : {}),
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
