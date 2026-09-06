import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { AppointmentBookingSessionStatus } from "../appointmentBookingSessionStatus";
import { generateSlots } from "./availability";
import { resolveBookingService, resolveTeamForAgent } from "./access";
import {
  mergeCollectedFields,
  missingServiceFields,
  serviceSnapshot,
} from "./fields";
import { collectedFieldsValidator } from "./validators";
import { getActiveSession, getOrCreateSession } from "./sessionStore";

export const startBookingSession = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    serviceId: v.optional(v.id("appointmentServices")),
    collectedFields: v.optional(collectedFieldsValidator),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation === null || conversation.assignedAgentId === undefined) {
      throw new Error("Conversation is not assigned to an agent");
    }

    const { services, service } = await resolveBookingService(ctx, conversation.assignedAgentId, args.serviceId);
    if (services.length === 0) {
      return { success: false, message: "No active Services are configured." };
    }
    if (!service) {
      return {
        success: false,
        requiresServiceSelection: true,
        services: services.map((row) => ({
          serviceId: row._id,
          name: row.name,
          description: row.description,
          durationMinutes: row.durationMinutes,
        })),
        message: "Ask the customer which service they want before starting the booking session.",
      };
    }

    const now = Date.now();
    const session = await getOrCreateSession(ctx, conversation._id, conversation.assignedAgentId);
    const collectedFields = mergeCollectedFields(session.collectedFields, args.collectedFields);
    const missing = missingServiceFields(service, collectedFields);
    const isEditing = session.calendarEventId !== undefined;
    const nextStatus = isEditing
      ? AppointmentBookingSessionStatus.Editing
      : AppointmentBookingSessionStatus.Collecting;

    await ctx.db.patch(session._id, {
      serviceId: service._id,
      collectedFields,
      status: nextStatus,
      proposedSlots: undefined,
      selectedSlot: undefined,
      customerConfirmationMessageId: undefined,
      updatedAt: now,
    });

    return {
      success: true,
      sessionId: session._id,
      status: nextStatus,
      isEditing,
      bookingId: session.calendarEventId,
      service: serviceSnapshot(service),
      collectedFields,
      missingFields: missing,
      readyForAvailability: missing.length === 0,
      message:
        missing.length > 0
          ? `${isEditing ? "Booking edit in progress" : "Booking session started"}. Still collecting: ${missing.join(", ")}`
          : isEditing
            ? "Booking details updated. Check availability if the time changed, then call updateBookingAppointment after the customer confirms."
            : "Booking session started. All required details are collected - you can check availability next.",
    };
  },
});

export const checkAvailability = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    serviceId: v.optional(v.id("appointmentServices")),
    preferredStartAt: v.optional(v.number()),
    rangeStartAt: v.optional(v.number()),
    rangeEndAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation === null || conversation.assignedAgentId === undefined) {
      throw new Error("Conversation is not assigned to an agent");
    }
    const agent = await ctx.db.get(conversation.assignedAgentId);
    if (agent === null) {
      throw new Error("Agent not found");
    }

    const session = await getActiveSession(ctx, conversation._id);
    if (session === undefined) {
      return { success: false, message: "No active booking session. Call startBookingSession first when the customer wants to book.", slots: [] };
    }

    const { services, service } = await resolveBookingService(
      ctx,
      conversation.assignedAgentId,
      args.serviceId ?? session.serviceId,
    );
    if (services.length === 0) {
      return { success: false, slots: [], message: "No active Services are configured." };
    }
    if (!service) {
      return {
        success: false,
        requiresServiceSelection: true,
        services: services.map((row) => ({
          serviceId: row._id,
          name: row.name,
          description: row.description,
          durationMinutes: row.durationMinutes,
        })),
        slots: [],
        message: "The booking session does not have a selected service yet.",
      };
    }
    if (session.serviceId !== undefined && session.serviceId !== service._id) {
      return { success: false, message: "The active booking session is for a different service. Cancel it or continue with the same service.", slots: [] };
    }

    const collectedFields = session.collectedFields;
    const missing = missingServiceFields(service, collectedFields);
    if (missing.length > 0) {
      return {
        success: false,
        status: AppointmentBookingSessionStatus.Collecting,
        service: serviceSnapshot(service),
        missingFields: missing,
        slots: [],
        message: `Still collecting booking details: ${missing.join(", ")}. Call startBookingSession with the new details.`,
      };
    }

    const team = await resolveTeamForAgent(ctx, agent);
    const now = Date.now();
    const rangeStartAt = Math.max(args.rangeStartAt ?? now + 60 * 60 * 1000, now);
    const rangeEndAt = args.preferredStartAt
      ? args.preferredStartAt + service.durationMinutes * 60 * 1000
      : args.rangeEndAt ?? rangeStartAt + 14 * 24 * 60 * 60 * 1000;
    const startAt = args.preferredStartAt ?? rangeStartAt;
    const limit = args.preferredStartAt ? 1 : 5;
    const isEditing = session.calendarEventId !== undefined;
    const slots = await generateSlots(ctx, {
      service,
      conversation,
      teamId: team._id,
      rangeStartAt: startAt,
      rangeEndAt,
      limit,
      excludeEventId: session.calendarEventId,
    });

    await ctx.db.patch(session._id, {
      serviceId: service._id,
      collectedFields,
      proposedSlots: slots,
      selectedSlot: undefined,
      customerConfirmationMessageId: undefined,
      status: AppointmentBookingSessionStatus.Confirming,
      updatedAt: now,
    });

    return {
      success: true,
      isEditing,
      bookingId: session.calendarEventId,
      status: AppointmentBookingSessionStatus.Confirming,
      service: serviceSnapshot(service),
      slots,
      message: isEditing
        ? "Slots ready for the booking update. Call updateBookingAppointment after the customer confirms."
        : undefined,
    };
  },
});

export const confirmBookingSlot = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    serviceId: v.id("appointmentServices"),
    startAt: v.number(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation === null || conversation.assignedAgentId === undefined) {
      throw new Error("Conversation is not assigned to an agent");
    }
    const session = await getActiveSession(ctx, conversation._id);
    if (session === undefined) {
      return { success: false, message: "No active booking session. Call startBookingSession first." };
    }
    if (session.serviceId !== args.serviceId) {
      return { success: false, message: "The active booking session is for a different service." };
    }
    if (session.status !== AppointmentBookingSessionStatus.Confirming) {
      return { success: false, message: "Check availability before confirming a booking slot." };
    }
    const selectedSlot = session.proposedSlots?.find((slot) => slot.startAt === args.startAt);
    if (selectedSlot === undefined) {
      return { success: false, message: "Confirm a slot returned by checkAvailability." };
    }
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversationId_and_createdAt", (q) => q.eq("conversationId", conversation._id))
      .order("desc")
      .take(50);
    const confirmationMessage = messages.find((message) => message.direction === "incoming");
    const confirmationReaction = confirmationMessage?.reactions?.find(
      (reaction) =>
        reaction.source === "ai" &&
        reaction.actorAgentId === conversation.assignedAgentId &&
        reaction.updatedAt >= session.updatedAt,
    );
    if (
      confirmationReaction === undefined ||
      confirmationMessage === undefined ||
      confirmationMessage.createdAt <= session.updatedAt
    ) {
      return { success: false, message: "React to the customer's confirmation before booking the selected slot." };
    }
    await ctx.db.patch(session._id, {
      selectedSlot,
      customerConfirmationMessageId: confirmationMessage._id,
      updatedAt: Date.now(),
    });
    return { success: true, selectedSlot };
  },
});

export const shouldSuppressUnverifiedConfirmationReply = internalQuery({
  args: { conversationId: v.id("conversations") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation?.assignedAgentId === undefined) return false;
    const sessions = await ctx.db
      .query("appointmentBookingSessions")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
      .take(100);
    const session = sessions.find((row) => row.status === AppointmentBookingSessionStatus.Confirming);
    if (session === undefined) return false;
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversationId_and_createdAt", (q) => q.eq("conversationId", args.conversationId))
      .order("desc")
      .take(50);
    const latestIncoming = messages.find((message) => message.direction === "incoming");
    if (latestIncoming === undefined || latestIncoming.createdAt <= session.updatedAt) return false;
    return latestIncoming.reactions?.some(
      (reaction) =>
        reaction.source === "ai" &&
        reaction.actorAgentId === conversation.assignedAgentId &&
        reaction.updatedAt >= session.updatedAt,
    ) ?? false;
  },
});
