import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { getAuthContext, resolveChannelOrgId } from "../authUtils";
import { generateSlots, resolveAvailableInterval } from "./availability";
import {
  assertAppointmentBookingManage,
  listActiveManualBookingServicesForAgent,
  loadService,
  resolveTeamForAgent,
} from "./access";
import { serviceSnapshot, serviceTimeZone } from "./fields";
import { validateManualBookingInterval } from "./manualBookingCore";
import { manualBookingFieldsForCustomer } from "./manualBookingFields";
import { createStaffBooking } from "./staffBooking";
import { collectedFieldsValidator } from "./validators";

async function loadCalendarBookingScope(
  ctx: MutationCtx,
  args: { agentId: Id<"agents">; customerId: Id<"customers"> },
) {
  const agent = await assertAppointmentBookingManage(ctx, args.agentId);
  const team = await resolveTeamForAgent(ctx, agent);
  const auth = await getAuthContext(ctx);
  const customer = await ctx.db.get(args.customerId);
  const orgId = resolveChannelOrgId(auth.orgId, auth.userId);
  if (customer === null || customer.orgId !== orgId) {
    throw new Error("Customer not found");
  }
  const conversation = customer.lastConversationId
    ? await ctx.db.get(customer.lastConversationId)
    : null;
  return {
    agent,
    team,
    customer,
    conversation:
      conversation?.assignedAgentId === agent._id ? conversation : undefined,
  };
}

async function resolveCalendarSlot(
  ctx: MutationCtx,
  args: {
    service: Doc<"appointmentServices">;
    conversation?: Doc<"conversations">;
    teamId: Id<"teams">;
    startAt: number;
    endAt: number;
  },
) {
  return await resolveAvailableInterval(ctx, args);
}

export const getCreateOptions = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const agent = await assertAppointmentBookingManage(ctx, args.agentId);
    const team = await resolveTeamForAgent(ctx, agent);
    const services = await listActiveManualBookingServicesForAgent(ctx, agent._id);
    return services.map((service) => ({
      ...serviceSnapshot(service),
      fields: service.fields,
      timeZone: serviceTimeZone(service, team),
    }));
  },
});

export const getNextAvailableSlot = mutation({
  args: {
    agentId: v.id("agents"),
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
    const agent = await assertAppointmentBookingManage(ctx, args.agentId);
    const team = await resolveTeamForAgent(ctx, agent);
    const service = await loadService(ctx, args.serviceId);
    if (service.agentId !== agent._id || !service.isActive) {
      throw new Error("Selected service is not available");
    }
    const now = Date.now();
    const [slot] = await generateSlots(ctx, {
      service,
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
    agentId: v.id("agents"),
    customerId: v.id("customers"),
    serviceId: v.id("appointmentServices"),
    startAt: v.number(),
    endAt: v.number(),
  },
  handler: async (ctx, args) => {
    validateManualBookingInterval(args.startAt, args.endAt);
    const scope = await loadCalendarBookingScope(ctx, args);
    const service = await loadService(ctx, args.serviceId);
    if (service.agentId !== scope.agent._id || !service.isActive) {
      throw new Error("Selected service is not available");
    }
    const slot = await resolveCalendarSlot(ctx, {
      service,
      conversation: scope.conversation,
      teamId: scope.team._id,
      startAt: args.startAt,
      endAt: args.endAt,
    });
    return slot
      ? { available: true as const }
      : { available: false as const, message: "That slot is no longer available." };
  },
});

export const create = mutation({
  args: {
    agentId: v.id("agents"),
    customerId: v.id("customers"),
    serviceId: v.id("appointmentServices"),
    collectedFields: collectedFieldsValidator,
    remarks: v.optional(v.string()),
    startAt: v.number(),
    endAt: v.number(),
  },
  handler: async (ctx, args) => {
    validateManualBookingInterval(args.startAt, args.endAt);
    const scope = await loadCalendarBookingScope(ctx, args);
    const service = await loadService(ctx, args.serviceId);
    if (service.agentId !== scope.agent._id || !service.isActive) {
      throw new Error("Selected service is not available");
    }
    const selectedSlot = await resolveCalendarSlot(ctx, {
      service,
      conversation: scope.conversation,
      teamId: scope.team._id,
      startAt: args.startAt,
      endAt: args.endAt,
    });
    if (selectedSlot === null) throw new Error("That slot is no longer available.");
    const assignedUser = await ctx.db.get(selectedSlot.assignedUserId);
    if (assignedUser === null) throw new Error("Assigned teammate not found");
    const collectedFields = manualBookingFieldsForCustomer(
      scope.customer,
      args.collectedFields,
    );
    return await createStaffBooking(ctx, {
      service,
      team: scope.team,
      customer: scope.customer,
      conversation: scope.conversation,
      assignedUser,
      selectedSlot,
      collectedFields,
      remarks: args.remarks,
      recordInboxBooking: false,
    });
  },
});
