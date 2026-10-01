import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internalMutation } from "../triggers";
import { AppointmentBookingBatchStatus } from "../appointmentBookingBatchStatus";
import { AppointmentBookingSessionStatus } from "../appointmentBookingSessionStatus";
import { logConversationEvent } from "../conversationLogs";
import { loadService, resolveTeamForAgent } from "./access";
import { resolveAvailableInterval } from "./availability";
import { missingBatchServiceFields } from "./batchAvailability";
import { getActiveBatch } from "./batchStore";
import { insertCalendarParticipants, resolveCustomerForConversation } from "./calendarHelpers";
import { handleBookingCreated } from "./bookingEvents";
import {
  bookingDisplayName,
  buildCalendarEventDescription,
  serviceBookingLocation,
  serviceTimeZone,
} from "./fields";
import type { BookingSlot } from "./types";

export type PreparedBatch = {
  batch: Doc<"appointmentBookingBatches">;
  conversation: Doc<"conversations">;
  agent: Doc<"agents">;
  service: Doc<"appointmentServices">;
  team: Doc<"teams">;
  slots: BookingSlot[];
};

function failed(message: string) {
  return { kind: "failed" as const, result: { success: false, message } };
}

function exactStartList(expected: BookingSlot[], received: number[]) {
  return expected.length === received.length &&
    expected.every((slot, index) => slot.startAt === received[index]);
}

export async function prepareLocalBatch(
  ctx: MutationCtx,
  args: {
    conversationId: Id<"conversations">;
    serviceId: Id<"appointmentServices">;
    startAts: number[];
  },
) {
  const conversation = await ctx.db.get(args.conversationId);
  if (conversation === null || conversation.assignedAgentId === undefined) {
    throw new Error("Conversation is not assigned to an agent");
  }
  const agent = await ctx.db.get(conversation.assignedAgentId);
  if (agent === null) throw new Error("Agent not found");
  const service = await loadService(ctx, args.serviceId);
  if (service.agentId !== agent._id || !service.isActive) {
    return failed("Selected service is not available.");
  }
  const batch = await getActiveBatch(ctx, conversation._id);
  if (batch === undefined) {
    return failed("No active booking batch. Check availability first.");
  }
  if (batch.serviceId !== service._id) {
    return failed("The active booking batch is for a different service.");
  }
  if (batch.status !== AppointmentBookingBatchStatus.Confirming ||
      batch.customerConfirmationMessageId === undefined) {
    return failed("The customer must confirm every requested time before booking.");
  }
  if (!exactStartList(batch.requestedSlots, args.startAts)) {
    return failed("Book the exact ordered list returned by checkAvailability.");
  }
  const missingFields = missingBatchServiceFields(service, batch.collectedFields);
  if (missingFields.length > 0) {
    return failed(`Missing required booking details: ${missingFields.join(", ")}.`);
  }
  const team = await resolveTeamForAgent(ctx, agent);
  const ownEventIdByStart = new Map<number, Id<"calendarEvents">>();
  for (const eventId of batch.calendarEventIds ?? []) {
    const event = await ctx.db.get(eventId);
    if (
      event !== null && event.status !== "cancelled" &&
      (event.externalSyncState === "pending" || event.externalSyncState === "synced")
    ) {
      ownEventIdByStart.set(event.startAt, event._id);
    }
  }
  const slots: BookingSlot[] = [];
  let assignmentService = service;
  for (const startAt of [...args.startAts].sort((a, b) => a - b)) {
    const slot = await resolveAvailableInterval(ctx, {
      service: assignmentService,
      conversation,
      teamId: team._id,
      startAt,
      endAt: startAt + service.durationMinutes * 60 * 1000,
      excludeEventId: ownEventIdByStart.get(startAt),
    });
    if (slot === null) {
      return failed("One or more requested times are no longer available. Check availability again.");
    }
    slots.push(slot);
    if (service.assignmentStrategy === "round_robin") {
      assignmentService = {
        ...assignmentService,
        lastAssignedWorkosUserId: slot.assignedWorkosUserId,
      };
    }
  }
  return { kind: "prepared" as const, prepared: { batch, conversation, agent, service, team, slots } };
}

export async function createLocalBatchRecords(ctx: MutationCtx, prepared: PreparedBatch) {
  const { batch, conversation, agent, service, team, slots } = prepared;
  const now = Date.now();
  const attendeeName = bookingDisplayName(batch.collectedFields);
  const customer = await resolveCustomerForConversation(ctx, conversation, batch.collectedFields);
  const bookingTimeZone = serviceTimeZone(service, team);
  const calendarEventIds: Id<"calendarEvents">[] = [];
  const sessionIds: Id<"appointmentBookingSessions">[] = [];
  const bookings = [];
  await ctx.db.patch(batch._id, { status: AppointmentBookingBatchStatus.Creating, updatedAt: now });
  for (const slot of slots) {
    const assignedUser = await ctx.db.get(slot.assignedUserId);
    if (assignedUser === null) throw new Error("Assigned teammate not found");
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
      timeZone: bookingTimeZone,
      status: "confirmed",
      createdBy: assignedUser._id,
      agentId: agent._id,
      conversationId: conversation._id,
      appointmentServiceId: service._id,
      bookingSource: "ai",
      customFieldResponses: batch.collectedFields,
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
    const sessionId = await ctx.db.insert("appointmentBookingSessions", {
      conversationId: conversation._id,
      agentId: agent._id,
      serviceId: service._id,
      status: AppointmentBookingSessionStatus.Booked,
      collectedFields: batch.collectedFields,
      selectedSlot: slot,
      customerConfirmationMessageId: batch.customerConfirmationMessageId,
      calendarEventId: eventId,
      createdAt: now,
      updatedAt: now,
    });
    await logConversationEvent(ctx, {
      conversationId: conversation._id,
      action: "event_booked",
      actor: { type: "ai", name: agent.name, agentId: agent._id },
      metadata: { eventId, eventTitle: `${service.name} - ${attendeeName}`, startAt: slot.startAt },
    });
    await handleBookingCreated(ctx, eventId);
    calendarEventIds.push(eventId);
    sessionIds.push(sessionId);
    bookings.push({
      bookingId: eventId,
      sessionId,
      startAt: slot.startAt,
      endAt: slot.endAt,
      assignedTo: slot.assignedDisplayName ?? assignedUser.email,
    });
  }
  await ctx.db.patch(batch._id, {
    status: AppointmentBookingBatchStatus.Booked,
    calendarEventIds,
    sessionIds,
    updatedAt: now,
  });
  await ctx.db.patch(conversation._id, { status: "booked", updatedAt: now });
  if (service.assignmentStrategy === "round_robin") {
    const lastSlot = slots.at(-1);
    if (lastSlot !== undefined) {
      await ctx.db.patch(service._id, {
        lastAssignedWorkosUserId: lastSlot.assignedWorkosUserId,
        lastAssignedAt: now,
        updatedAt: now,
      });
    }
  }
  return { batchId: batch._id, bookings };
}

export const createLocalBatch = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    serviceId: v.id("appointmentServices"),
    startAts: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const preparation = await prepareLocalBatch(ctx, args);
    if (preparation.kind === "failed") return preparation.result;
    const created = await createLocalBatchRecords(ctx, preparation.prepared);
    return {
      success: true,
      ...created,
      message: "Bookings created. Call sendBatchBookingConfirmation next and send the returned confirmation message to the customer.",
    };
  },
});
