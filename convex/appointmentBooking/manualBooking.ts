import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { generateSlots, resolveAvailableInterval } from "./availability";
import {
  assertAppointmentBookingManage,
  listActiveManualBookingServicesForAgent,
  loadService,
  resolveTeamForAgent,
} from "./access";
import { resolveCustomerForConversation } from "./calendarHelpers";
import {
  serviceSnapshot,
  serviceTimeZone,
} from "./fields";
import { collectedFieldsValidator } from "./validators";
import { validateManualBookingInterval } from "./manualBookingCore";
import { manualBookingFieldsForCustomer } from "./manualBookingFields";
import { createStaffBooking } from "./staffBooking";

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
    endAt: number;
  },
) {
  return await resolveAvailableInterval(ctx, {
    service: args.service,
    conversation: args.conversation,
    teamId: args.teamId,
    startAt: args.startAt,
    endAt: args.endAt,
  });
}

export const getCreateOptions = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const { conversation, agent, team } = await loadManualBookingScope(ctx, args.conversationId);
    const customer = conversation.customerId ? await ctx.db.get(conversation.customerId) : null;
    const services = await listActiveManualBookingServicesForAgent(ctx, agent._id);
    return {
      customer: {
        name: customer?.name,
        email: customer?.email,
        phone: customer?.phone,
        contactAddress: customer?.contactAddress,
        service: customer?.service,
      },
      services: services.map((service) => ({
        ...serviceSnapshot(service),
        fields: service.fields,
        timeZone: serviceTimeZone(service, team),
      })),
    };
  },
});

export const getNextAvailableSlot = mutation({
  args: {
    conversationId: v.id("conversations"),
    serviceId: v.id("appointmentServices"),
  },
  returns: v.union(
    v.object({
      startAt: v.number(),
      endAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const { conversation, agent, team } = await loadManualBookingScope(ctx, args.conversationId);
    const service = await loadService(ctx, args.serviceId);
    if (service.agentId !== agent._id || !service.isActive) {
      throw new Error("Selected service is not available");
    }
    const now = Date.now();
    const [slot] = await generateSlots(ctx, {
      service,
      conversation,
      teamId: team._id,
      rangeStartAt: now,
      rangeEndAt: now + 14 * 24 * 60 * 60 * 1000,
      limit: 1,
      prioritizePreferredTimes: false,
    });
    return slot ? { startAt: slot.startAt, endAt: slot.endAt } : null;
  },
});

export const checkAvailability = mutation({
  args: {
    conversationId: v.id("conversations"),
    serviceId: v.id("appointmentServices"),
    startAt: v.number(),
    endAt: v.number(),
  },
  handler: async (ctx, args) => {
    validateManualBookingInterval(args.startAt, args.endAt);
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
      endAt: args.endAt,
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
    remarks: v.optional(v.string()),
    startAt: v.number(),
    endAt: v.number(),
  },
  handler: async (ctx, args) => {
    validateManualBookingInterval(args.startAt, args.endAt);
    const { conversation, agent, team } = await loadManualBookingScope(ctx, args.conversationId);
    const service = await loadService(ctx, args.serviceId);
    if (service.agentId !== agent._id || !service.isActive) {
      throw new Error("Selected service is not available");
    }
    const selectedSlot = await resolveManualBookingSlot(ctx, {
      service,
      conversation,
      teamId: team._id,
      startAt: args.startAt,
      endAt: args.endAt,
    });
    if (selectedSlot === null) throw new Error("That slot is no longer available.");
    const assignedUser = await ctx.db.get(selectedSlot.assignedUserId);
    if (assignedUser === null) throw new Error("Assigned teammate not found");
    const customer = await resolveCustomerForConversation(ctx, conversation, args.collectedFields);
    const collectedFields = manualBookingFieldsForCustomer(customer, args.collectedFields);
    return await createStaffBooking(ctx, {
      service,
      team,
      customer,
      conversation,
      assignedUser,
      selectedSlot,
      collectedFields,
      remarks: args.remarks,
      recordInboxBooking: true,
    });
  },
});
