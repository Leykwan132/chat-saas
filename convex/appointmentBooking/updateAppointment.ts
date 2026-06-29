import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { AppointmentBookingSessionStatus } from "../appointmentBookingSessionStatus";
import { logConversationEvent } from "../conversationLogs";
import { generateSlots } from "./availability";
import { loadService, resolveTeamForAgent } from "./access";
import { replaceCalendarParticipants, resolveCustomerForConversation } from "./calendarHelpers";
import {
  bookingDisplayName,
  buildCalendarEventDescription,
  missingServiceFields,
  serviceTimeZone,
} from "./fields";
import { getActiveSession } from "./sessionStore";

export const updateBookingAppointment = internalMutation({
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
    const agent = await ctx.db.get(conversation.assignedAgentId);
    if (agent === null) {
      throw new Error("Agent not found");
    }
    const service = await loadService(ctx, args.serviceId);
    if (service.agentId !== conversation.assignedAgentId || !service.isActive) {
      throw new Error("Selected service is not available");
    }
    const session = await getActiveSession(ctx, conversation._id);
    if (session === undefined || session.calendarEventId === undefined) {
      return { success: false, message: "No booking edit in progress. Call beginBookingEdit first." };
    }
    if (session.serviceId !== undefined && session.serviceId !== service._id) {
      return { success: false, message: "The active booking edit is for a different service." };
    }

    const event = await ctx.db.get(session.calendarEventId);
    if (event === null || event.status === "cancelled") {
      return { success: false, message: "The booking to update could not be found." };
    }

    const collectedFields = session.collectedFields;
    const missing = missingServiceFields(service, collectedFields);
    if (missing.length > 0) {
      return {
        success: false,
        missingFields: missing,
        message: `Missing required booking details: ${missing.join(", ")}. Call startBookingSession with the missing details.`,
      };
    }

    const team = await resolveTeamForAgent(ctx, agent);
    const slots = await generateSlots(ctx, {
      service,
      conversation,
      teamId: team._id,
      rangeStartAt: args.startAt,
      rangeEndAt: args.startAt + service.durationMinutes * 60 * 1000,
      limit: 1,
      excludeEventId: session.calendarEventId,
    });
    const selectedSlot = slots.find((slot) => slot.startAt === args.startAt);
    if (!selectedSlot) {
      return { success: false, message: "That slot is no longer available. Please check availability again." };
    }
    const assignedUser = await ctx.db.get(selectedSlot.assignedUserId);
    if (assignedUser === null) {
      throw new Error("Assigned teammate not found");
    }

    const customer = await resolveCustomerForConversation(ctx, conversation, collectedFields);
    const now = Date.now();
    const attendeeName = bookingDisplayName(collectedFields);
    const bookingTimeZone = serviceTimeZone(service, team);
    await ctx.db.patch(event._id, {
      title: `${service.name} - ${attendeeName}`,
      description: buildCalendarEventDescription({
        service,
        customer,
        conversation,
        collectedFields,
      }),
      startAt: selectedSlot.startAt,
      endAt: selectedSlot.endAt,
      timeZone: bookingTimeZone,
      customFieldResponses: collectedFields,
      updatedAt: now,
    });
    await replaceCalendarParticipants(ctx, {
      eventId: event._id,
      teamId: team._id,
      customer,
      assignedUser,
      bookingDisplayName: attendeeName,
      eventStartAt: selectedSlot.startAt,
      now,
    });
    await ctx.db.patch(session._id, {
      serviceId: service._id,
      status: AppointmentBookingSessionStatus.Booked,
      collectedFields,
      selectedSlot,
      calendarEventId: event._id,
      updatedAt: now,
    });
    await logConversationEvent(ctx, {
      conversationId: conversation._id,
      action: "event_updated",
      actor: { type: "ai", name: agent.name, agentId: agent._id },
      metadata: {
        eventId: event._id,
        eventTitle: `${service.name} - ${attendeeName}`,
        startAt: selectedSlot.startAt,
      },
    });
    if (service.assignmentStrategy === "round_robin") {
      await ctx.db.patch(service._id, {
        lastAssignedWorkosUserId: selectedSlot.assignedWorkosUserId,
        lastAssignedAt: now,
        updatedAt: now,
      });
    }
    return {
      success: true,
      bookingId: event._id,
      serviceName: service.name,
      startAt: selectedSlot.startAt,
      endAt: selectedSlot.endAt,
      assignedTo: selectedSlot.assignedDisplayName ?? assignedUser.email,
      message: "Booking updated. Call sendBookingUpdateConfirmation next and send the returned confirmation message to the customer.",
    };
  },
});
