import { v } from "convex/values";
import { action, mutation, query } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { resolveAvailableInterval } from "./availability";
import {
  assertAppointmentBookingManage,
  listActiveManualBookingServicesForAgent,
  loadService,
  resolveTeamForAgent,
} from "./access";
import {
  serviceSnapshot,
  serviceTimeZone,
} from "./fields";
import { collectedFieldsValidator } from "./validators";
import { validateManualBookingInterval } from "./manualBookingCore";
import { runInboxStaffBooking } from "../googleCalendar/staffBookingSync";

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

export const create = action({
  args: {
    conversationId: v.id("conversations"),
    serviceId: v.id("appointmentServices"),
    collectedFields: collectedFieldsValidator,
    remarks: v.optional(v.string()),
    startAt: v.number(),
    endAt: v.number(),
  },
  returns: v.object({
    eventId: v.id("calendarEvents"),
    sessionId: v.id("appointmentBookingSessions"),
  }),
  handler: async (ctx, args) => runInboxStaffBooking(ctx, args),
});
