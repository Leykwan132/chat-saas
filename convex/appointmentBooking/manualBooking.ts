import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { AppointmentBookingSessionStatus } from "../appointmentBookingSessionStatus";
import { logConversationEvent } from "../conversationLogs";
import { generateSlots } from "./availability";
import {
  assertAppointmentBookingManage,
  listActiveBookingServicesForAgent,
  loadService,
  resolveTeamForAgent,
} from "./access";
import { insertCalendarParticipants, resolveCustomerForConversation } from "./calendarHelpers";
import {
  bookingDisplayName,
  buildCalendarEventDescription,
  missingServiceFields,
  serviceSnapshot,
  serviceTimeZone,
} from "./fields";
import { collectedFieldsValidator } from "./validators";
import { scheduleWorkflowRemindersForAppointment } from "../workflowReminderRuntime";

async function loadManualBookingScope(
  ctx: Parameters<typeof assertAppointmentBookingManage>[0],
  conversationId: Parameters<typeof ctx.db.get<"conversations">>[0],
) {
  const conversation = await ctx.db.get(conversationId);
  if (conversation === null || conversation.assignedAgentId === undefined) {
    throw new Error("Conversation is not assigned to an agent");
  }
  const agent = await assertAppointmentBookingManage(ctx, conversation.assignedAgentId);
  const team = await resolveTeamForAgent(ctx, agent);
  return { conversation, agent, team };
}

async function resolveManualBookingSlot(
  ctx: MutationCtx,
  args: {
    service: Doc<"appointmentServices">;
    conversation: Doc<"conversations">;
    teamId: Id<"teams">;
    startAt: number;
  },
) {
  const slots = await generateSlots(ctx, {
    service: args.service,
    conversation: args.conversation,
    teamId: args.teamId,
    rangeStartAt: args.startAt,
    rangeEndAt: args.startAt + args.service.durationMinutes * 60_000,
    limit: 1,
  });
  return slots.find((slot) => slot.startAt === args.startAt) ?? null;
}

export const getCreateOptions = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const { conversation, agent, team } = await loadManualBookingScope(ctx, args.conversationId);
    const customer = conversation.customerId ? await ctx.db.get(conversation.customerId) : null;
    const services = await listActiveBookingServicesForAgent(ctx, agent._id);
    return {
      customer: {
        name: customer?.name,
        email: customer?.email,
        phone: customer?.phone,
      },
      services: services.map((service) => ({
        ...serviceSnapshot(service),
        fields: service.fields,
        timeZone: serviceTimeZone(service, team),
      })),
    };
  },
});

export const checkAvailability = mutation({
  args: {
    conversationId: v.id("conversations"),
    serviceId: v.id("appointmentServices"),
    startAt: v.number(),
  },
  handler: async (ctx, args) => {
    const { conversation, agent, team } = await loadManualBookingScope(ctx, args.conversationId);
    const service = await loadService(ctx, args.serviceId);
    if (service.agentId !== agent._id || !service.isActive) {
      throw new Error("Selected service is not available");
    }
    const slot = await resolveManualBookingSlot(ctx, {
      service,
      conversation,
      teamId: team._id,
      startAt: args.startAt,
    });
    if (slot === null) {
      return {
        available: false as const,
        message: "That slot is no longer available.",
      };
    }
    return { available: true as const };
  },
});

export const create = mutation({
  args: {
    conversationId: v.id("conversations"),
    serviceId: v.id("appointmentServices"),
    collectedFields: collectedFieldsValidator,
    startAt: v.number(),
  },
  handler: async (ctx, args) => {
    const { conversation, agent, team } = await loadManualBookingScope(ctx, args.conversationId);
    const service = await loadService(ctx, args.serviceId);
    if (service.agentId !== agent._id || !service.isActive) {
      throw new Error("Selected service is not available");
    }
    const missingFields = missingServiceFields(service, args.collectedFields);
    if (missingFields.length > 0) {
      throw new Error(`Missing required booking details: ${missingFields.join(", ")}`);
    }
    const selectedSlot = await resolveManualBookingSlot(ctx, {
      service,
      conversation,
      teamId: team._id,
      startAt: args.startAt,
    });
    if (selectedSlot === null) throw new Error("That slot is no longer available.");
    const assignedUser = await ctx.db.get(selectedSlot.assignedUserId);
    if (assignedUser === null) throw new Error("Assigned teammate not found");
    const customer = await resolveCustomerForConversation(ctx, conversation, args.collectedFields);
    const now = Date.now();
    const attendeeName = bookingDisplayName(args.collectedFields);
    const timeZone = serviceTimeZone(service, team);
    const eventId = await ctx.db.insert("calendarEvents", {
      teamId: team._id,
      title: `${service.name} - ${attendeeName}`,
      description: buildCalendarEventDescription({
        service,
        customer,
        conversation,
        collectedFields: args.collectedFields,
      }),
      startAt: selectedSlot.startAt,
      endAt: selectedSlot.endAt,
      timeZone,
      status: "confirmed",
      createdBy: assignedUser._id,
      agentId: agent._id,
      conversationId: conversation._id,
      appointmentServiceId: service._id,
      bookingSource: "manual",
      customFieldResponses: args.collectedFields,
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
    const sessionId = await ctx.db.insert("appointmentBookingSessions", {
      conversationId: conversation._id,
      agentId: agent._id,
      serviceId: service._id,
      status: AppointmentBookingSessionStatus.Booked,
      collectedFields: args.collectedFields,
      selectedSlot,
      calendarEventId: eventId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(conversation._id, { status: "booked", updatedAt: now });
    await logConversationEvent(ctx, {
      conversationId: conversation._id,
      action: "event_booked",
      metadata: { eventId, eventTitle: `${service.name} - ${attendeeName}`, startAt: selectedSlot.startAt },
    });
    if (service.assignmentStrategy === "round_robin") {
      await ctx.db.patch(service._id, {
        lastAssignedWorkosUserId: selectedSlot.assignedWorkosUserId,
        lastAssignedAt: now,
        updatedAt: now,
      });
    }
    await scheduleWorkflowRemindersForAppointment(ctx, eventId);
    return { eventId, sessionId };
  },
});
