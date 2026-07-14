import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { AppointmentBookingSessionStatus } from "../appointmentBookingSessionStatus";
import { insertCalendarParticipants } from "./calendarHelpers";
import {
  bookingDisplayName,
  buildCalendarEventDescription,
  serviceTimeZone,
} from "./fields";
import type { BookingSlot, CollectedFields } from "./types";

export function validateManualBookingInterval(startAt: number, endAt: number) {
  if (endAt <= startAt) throw new Error("End time must be after start time.");
  if (endAt - startAt > 24 * 60 * 60 * 1000) {
    throw new Error("Booking duration cannot exceed 24 hours.");
  }
}

export async function createManualBookingRecords(
  ctx: MutationCtx,
  args: {
    service: Doc<"appointmentServices">;
    team: Doc<"teams">;
    customer: Doc<"customers">;
    conversation?: Doc<"conversations">;
    assignedUser: Doc<"users">;
    selectedSlot: BookingSlot;
    collectedFields: CollectedFields;
    bookingSource: "manual" | "ai";
  },
) {
  const now = Date.now();
  const attendeeName = bookingDisplayName(args.collectedFields);
  const timeZone = serviceTimeZone(args.service, args.team);
  const eventId = await ctx.db.insert("calendarEvents", {
    teamId: args.team._id,
    title: `${args.service.name} - ${attendeeName}`,
    description: buildCalendarEventDescription({
      service: args.service,
      customer: args.customer,
      conversation: args.conversation,
      collectedFields: args.collectedFields,
    }),
    startAt: args.selectedSlot.startAt,
    endAt: args.selectedSlot.endAt,
    timeZone,
    status: "confirmed",
    createdBy: args.assignedUser._id,
    agentId: args.service.agentId,
    conversationId: args.conversation?._id,
    appointmentServiceId: args.service._id,
    bookingSource: args.bookingSource,
    customFieldResponses: args.collectedFields,
    createdAt: now,
    updatedAt: now,
  });
  await insertCalendarParticipants(ctx, {
    eventId,
    teamId: args.team._id,
    customer: args.customer,
    assignedUser: args.assignedUser,
    bookingDisplayName: attendeeName,
    eventStartAt: args.selectedSlot.startAt,
    now,
  });
  const sessionId = await ctx.db.insert("appointmentBookingSessions", {
    conversationId: args.conversation?._id,
    customerId: args.customer._id,
    agentId: args.service.agentId,
    serviceId: args.service._id,
    status: AppointmentBookingSessionStatus.Booked,
    collectedFields: args.collectedFields,
    selectedSlot: args.selectedSlot,
    calendarEventId: eventId,
    createdAt: now,
    updatedAt: now,
  });
  if (args.service.assignmentStrategy === "round_robin") {
    await ctx.db.patch(args.service._id, {
      lastAssignedWorkosUserId: args.selectedSlot.assignedWorkosUserId,
      lastAssignedAt: now,
      updatedAt: now,
    });
  }
  return { eventId, sessionId };
}

export type ManualBookingRecordIds = {
  eventId: Id<"calendarEvents">;
  sessionId: Id<"appointmentBookingSessions">;
};
