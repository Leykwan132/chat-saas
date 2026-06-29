import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { AppointmentBookingSessionStatus } from "../appointmentBookingSessionStatus";
import { logConversationEvent } from "../conversationLogs";
import { generateSlots } from "./availability";
import { loadService, resolveTeamForAgent } from "./access";
import { insertCalendarParticipants, resolveCustomerForConversation } from "./calendarHelpers";
import {
  bookingDisplayName,
  buildCalendarEventDescription,
  missingServiceFields,
  serviceTimeZone,
} from "./fields";
import { getActiveSession } from "./sessionStore";

export const bookAppointment = internalMutation({
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
    if (session === undefined) {
      return { success: false, message: "No active booking session. Call startBookingSession first." };
    }
    if (session.calendarEventId !== undefined) {
      return { success: false, message: "This session is editing an existing booking. Call updateBookingAppointment instead of bookAppointment." };
    }
    if (session.serviceId !== undefined && session.serviceId !== service._id) {
      return { success: false, message: "The active booking session is for a different service." };
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
    const eventId = await ctx.db.insert("calendarEvents", {
      teamId: team._id,
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
      status: "confirmed",
      createdBy: assignedUser._id,
      agentId: service.agentId,
      conversationId: conversation._id,
      appointmentServiceId: service._id,
      bookingSource: "ai",
      customFieldResponses: collectedFields,
      createdAt: now,
      updatedAt: now,
    });
    await insertCalendarParticipants(ctx, {
      eventId,
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
      calendarEventId: eventId,
      updatedAt: now,
    });
    await ctx.db.patch(conversation._id, {
      status: "booked",
      updatedAt: now,
    });
    await logConversationEvent(ctx, {
      conversationId: conversation._id,
      action: "event_booked",
      actor: { type: "ai", name: agent.name, agentId: agent._id },
      metadata: {
        eventId,
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
      bookingId: eventId,
      serviceName: service.name,
      startAt: selectedSlot.startAt,
      endAt: selectedSlot.endAt,
      assignedTo: selectedSlot.assignedDisplayName ?? assignedUser.email,
      message: "Booking created. Call sendBookingConfirmation next and send the returned confirmation message to the customer.",
    };
  },
});
