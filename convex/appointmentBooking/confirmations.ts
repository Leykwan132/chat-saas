import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation } from "../_generated/server";
import {
  buildBookingsConfirmationMessage,
  type BookingConfirmationAppointment,
} from "./confirmationMessage";
import { buildBookingConfirmationMessage, serviceTimeZone } from "./fields";
import { getLatestBookedBatch } from "./batchStore";
import { activeSessionSnapshot, getActiveSession, getLatestBookedSession } from "./sessionStore";
import type { CollectedFields } from "./types";

async function batchConfirmationMessage(
  ctx: Parameters<typeof getLatestBookedSession>[0],
  args: {
    service: Doc<"appointmentServices">;
    collectedFields: CollectedFields;
    timeZone: string;
    eventIds: Id<"calendarEvents">[];
  },
) {
  const appointments: BookingConfirmationAppointment[] = [];
  for (const eventId of args.eventIds) {
    const event = await ctx.db.get(eventId);
    if (event === null) return null;
    const participants = await ctx.db
      .query("calendarEventParticipants")
      .withIndex("by_eventId", (q) => q.eq("eventId", event._id))
      .take(20);
    const assigned = participants.find((row) => row.role === "assigned");
    appointments.push({
      startAt: event.startAt,
      endAt: event.endAt,
      bookingId: event._id,
      assignedTo: assigned?.displayName ?? assigned?.email,
      meetingLink: event.link,
    });
  }
  return buildBookingsConfirmationMessage({
    service: args.service,
    collectedFields: args.collectedFields,
    timeZone: args.timeZone,
    appointments,
  });
}

async function buildConfirmation(ctx: Parameters<typeof getLatestBookedSession>[0], conversationId: Parameters<typeof getLatestBookedSession>[1], updated: boolean) {
  const active = await getActiveSession(ctx, conversationId);
  const session = await getLatestBookedSession(ctx, conversationId);
  if (session === undefined || session.calendarEventId === undefined || session.serviceId === undefined) {
    return {
      success: false,
      hasActiveSession: active !== undefined,
      activeSession: active === undefined ? null : activeSessionSnapshot(active),
      message: active
        ? `No completed booking found. Active session status is ${active.status}. Call bookAppointment first.`
        : updated
          ? "No updated booking found. Call updateBookingAppointment first."
          : "No completed booking found. Call bookAppointment first.",
    };
  }

  const [event, service] = await Promise.all([
    ctx.db.get(session.calendarEventId),
    ctx.db.get(session.serviceId),
  ]);
  if (event === null || service === null) {
    return { success: false, message: "Booking details could not be found." };
  }

  const participants = await ctx.db
    .query("calendarEventParticipants")
    .withIndex("by_eventId", (q) => q.eq("eventId", event._id))
    .take(20);
  const assigned = participants.find((row) => row.role === "assigned");
  const team = await ctx.db.get(event.teamId);
  const batch = updated ? undefined : await getLatestBookedBatch(ctx, conversationId);
  const batchEventIds = batch?.calendarEventIds ?? [];
  if (batchEventIds.length > 1 && batchEventIds.includes(event._id) && batch?.serviceId !== undefined) {
    const confirmationMessage = await batchConfirmationMessage(ctx, {
      service,
      collectedFields: batch.collectedFields,
      timeZone: serviceTimeZone(service, team ?? undefined),
      eventIds: batchEventIds,
    });
    if (confirmationMessage === null) {
      return { success: false, message: "Booking details could not be found." };
    }
    return {
      success: true,
      confirmationMessage,
      bookingId: event._id,
      serviceName: service.name,
      startAt: event.startAt,
      endAt: event.endAt,
    };
  }
  const confirmationMessage = buildBookingConfirmationMessage({
    service,
    collectedFields: session.collectedFields,
    startAt: event.startAt,
    endAt: event.endAt,
    timeZone: serviceTimeZone(service, team ?? undefined),
    assignedTo: assigned?.displayName ?? assigned?.email,
    bookingId: event._id,
    meetingLink: event.link,
    updated,
  });

  return {
    success: true,
    confirmationMessage,
    bookingId: event._id,
    serviceName: service.name,
    startAt: event.startAt,
    endAt: event.endAt,
  };
}

export const sendBookingConfirmation = internalMutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await buildConfirmation(ctx, args.conversationId, false);
  },
});

export const sendBookingUpdateConfirmation = internalMutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await buildConfirmation(ctx, args.conversationId, true);
  },
});

export const sendBatchBookingConfirmation = internalMutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const batch = await getLatestBookedBatch(ctx, args.conversationId);
    if (batch === undefined || batch.serviceId === undefined || batch.calendarEventIds === undefined) {
      return { success: false, message: "No completed booking batch found. Call bookAppointments first." };
    }
    const service = await ctx.db.get(batch.serviceId);
    if (service === null) return { success: false, message: "Booking service could not be found." };
    const team = await Promise.all(batch.calendarEventIds.map((eventId) => ctx.db.get(eventId)))
      .then((events) => events.find((event) => event !== null))
      .then((event) => event === undefined || event === null ? null : ctx.db.get(event.teamId));
    const confirmationMessage = await batchConfirmationMessage(ctx, {
      service,
      collectedFields: batch.collectedFields,
      timeZone: serviceTimeZone(service, team ?? undefined),
      eventIds: batch.calendarEventIds,
    });
    if (confirmationMessage === null) {
      return { success: false, message: "Booking details could not be found." };
    }
    return {
      success: true,
      confirmationMessage,
      batchId: batch._id,
      bookingIds: batch.calendarEventIds,
    };
  },
});
