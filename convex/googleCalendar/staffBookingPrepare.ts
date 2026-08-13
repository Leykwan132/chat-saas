import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import { resolveAvailableInterval } from "../appointmentBooking/availability";
import {
  assertAppointmentBookingManage,
  loadService,
  resolveTeamForAgent,
} from "../appointmentBooking/access";
import { resolveCustomerForConversation } from "../appointmentBooking/calendarHelpers";
import { getAuthContext, resolveChannelOrgId } from "../authUtils";
import { validateManualBookingInterval } from "../appointmentBooking/manualBookingCore";
import { manualBookingFieldsForCustomer } from "../appointmentBooking/manualBookingFields";
import { createStaffBooking } from "../appointmentBooking/staffBooking";
import { collectedFieldsValidator } from "../appointmentBooking/validators";
import type { CollectedFields } from "../appointmentBooking/types";
import {
  bookingFailureFromGoogle,
  googleCalendarBookingGate,
  loadGoogleCalendarConnectionForUser,
} from "./bookingGate";
import { googleCalendarWriteInputFromEvent } from "./bookingPayload";
import { googleCalendarWriteInputValidator } from "./writeTypes";

export const staffPrepareResultValidator = v.union(
  v.object({
    kind: v.literal("completed"),
    eventId: v.id("calendarEvents"),
    sessionId: v.id("appointmentBookingSessions"),
  }),
  v.object({ kind: v.literal("failed"), message: v.string() }),
  v.object({
    kind: v.literal("needs_refresh"),
    connectionId: v.id("googleCalendarConnections"),
  }),
  v.object({
    kind: v.literal("google"),
    connectionId: v.id("googleCalendarConnections"),
    calendarEventId: v.id("calendarEvents"),
    sessionId: v.id("appointmentBookingSessions"),
    operationKey: v.string(),
    event: googleCalendarWriteInputValidator,
    now: v.number(),
  }),
);

type StaffPrepareResult =
  | { kind: "completed"; eventId: Id<"calendarEvents">; sessionId: Id<"appointmentBookingSessions"> }
  | { kind: "failed"; message: string }
  | { kind: "needs_refresh"; connectionId: Id<"googleCalendarConnections"> }
  | {
      kind: "google";
      connectionId: Id<"googleCalendarConnections">;
      calendarEventId: Id<"calendarEvents">;
      sessionId: Id<"appointmentBookingSessions">;
      operationKey: string;
      event: ReturnType<typeof googleCalendarWriteInputFromEvent>;
      now: number;
    };

async function resolveStaffSlot(
  ctx: MutationCtx,
  args: {
    service: Doc<"appointmentServices">;
    conversation?: Doc<"conversations">;
    teamId: Id<"teams">;
    startAt: number;
    endAt: number;
  },
) {
  const selectedSlot = await resolveAvailableInterval(ctx, args);
  if (selectedSlot !== null) return { kind: "slot" as const, selectedSlot };
  const unhealthySlot = await resolveAvailableInterval(ctx, { ...args, ignoreGoogleHealth: true });
  if (unhealthySlot !== null) {
    const connection = await loadGoogleCalendarConnectionForUser(ctx, unhealthySlot.assignedUserId);
    const gate = googleCalendarBookingGate(connection);
    if (gate.kind === "error") {
      return { kind: "failed" as const, message: bookingFailureFromGoogle(gate.result).message };
    }
  }
  return { kind: "failed" as const, message: "That slot is no longer available." };
}

async function completeStaffBooking(
  ctx: MutationCtx,
  args: {
    service: Doc<"appointmentServices">;
    team: Doc<"teams">;
    customer: Doc<"customers">;
    conversation?: Doc<"conversations">;
    startAt: number;
    endAt: number;
    collectedFields: CollectedFields;
    remarks?: string;
    recordInboxBooking: boolean;
    refreshed?: boolean;
  },
): Promise<StaffPrepareResult> {
  const resolved = await resolveStaffSlot(ctx, {
    service: args.service,
    conversation: args.conversation,
    teamId: args.team._id,
    startAt: args.startAt,
    endAt: args.endAt,
  });
  if (resolved.kind === "failed") return resolved;
  const assignedUser = await ctx.db.get(resolved.selectedSlot.assignedUserId);
  if (assignedUser === null) throw new Error("Assigned teammate not found");
  const connection = await loadGoogleCalendarConnectionForUser(ctx, assignedUser._id);
  const gate = googleCalendarBookingGate(connection);
  if (gate.kind === "error") return { kind: "failed", message: bookingFailureFromGoogle(gate.result).message };
  if (gate.kind === "google" && args.refreshed !== true) {
    return { kind: "needs_refresh", connectionId: gate.connectionId };
  }
  const operationKey = `staff:${args.customer._id}:${args.startAt}:create`;
  const ids = await createStaffBooking(ctx, {
    service: args.service,
    team: args.team,
    customer: args.customer,
    conversation: args.conversation,
    assignedUser,
    selectedSlot: resolved.selectedSlot,
    collectedFields: args.collectedFields,
    remarks: args.remarks,
    recordInboxBooking: args.recordInboxBooking,
    googlePending: gate.kind === "google"
      ? { ownerUserId: assignedUser._id, operationKey }
      : undefined,
  });
  if (gate.kind !== "google") return { kind: "completed", ...ids };
  const event = await ctx.db.get(ids.eventId);
  if (event === null) throw new Error("Booking event was not created");
  return {
    kind: "google",
    connectionId: gate.connectionId,
    calendarEventId: ids.eventId,
    sessionId: ids.sessionId,
    operationKey,
    event: googleCalendarWriteInputFromEvent(event),
    now: Date.now(),
  };
}

export const prepareCalendarStaffBook = internalMutation({
  args: {
    agentId: v.id("agents"),
    customerId: v.id("customers"),
    serviceId: v.id("appointmentServices"),
    collectedFields: collectedFieldsValidator,
    remarks: v.optional(v.string()),
    startAt: v.number(),
    endAt: v.number(),
    refreshed: v.optional(v.boolean()),
  },
  returns: staffPrepareResultValidator,
  handler: async (ctx, args) => {
    validateManualBookingInterval(args.startAt, args.endAt);
    const agent = await assertAppointmentBookingManage(ctx, args.agentId);
    const team = await resolveTeamForAgent(ctx, agent);
    const auth = await getAuthContext(ctx);
    const customer = await ctx.db.get(args.customerId);
    const orgId = resolveChannelOrgId(auth.orgId, auth.userId);
    if (customer === null || customer.orgId !== orgId) throw new Error("Customer not found");
    const service = await loadService(ctx, args.serviceId);
    if (service.agentId !== agent._id || !service.isActive) {
      throw new Error("Selected service is not available");
    }
    const conversation = customer.lastConversationId
      ? await ctx.db.get(customer.lastConversationId)
      : null;
    return await completeStaffBooking(ctx, {
      service,
      team,
      customer,
      conversation: conversation?.assignedAgentId === agent._id ? conversation : undefined,
      startAt: args.startAt,
      endAt: args.endAt,
      collectedFields: manualBookingFieldsForCustomer(customer, args.collectedFields),
      remarks: args.remarks,
      recordInboxBooking: false,
      refreshed: args.refreshed,
    });
  },
});

export const prepareInboxStaffBook = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    serviceId: v.id("appointmentServices"),
    collectedFields: collectedFieldsValidator,
    remarks: v.optional(v.string()),
    startAt: v.number(),
    endAt: v.number(),
    refreshed: v.optional(v.boolean()),
  },
  returns: staffPrepareResultValidator,
  handler: async (ctx, args) => {
    validateManualBookingInterval(args.startAt, args.endAt);
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation === null || conversation.assignedAgentId === undefined) {
      throw new Error("Conversation is not assigned to an agent");
    }
    const agent = await assertAppointmentBookingManage(ctx, conversation.assignedAgentId);
    const team = await resolveTeamForAgent(ctx, agent);
    const service = await loadService(ctx, args.serviceId);
    if (service.agentId !== agent._id || !service.isActive) {
      throw new Error("Selected service is not available");
    }
    const customer = await resolveCustomerForConversation(ctx, conversation, args.collectedFields);
    return await completeStaffBooking(ctx, {
      service,
      team,
      customer,
      conversation,
      startAt: args.startAt,
      endAt: args.endAt,
      collectedFields: manualBookingFieldsForCustomer(customer, args.collectedFields),
      remarks: args.remarks,
      recordInboxBooking: true,
      refreshed: args.refreshed,
    });
  },
});
