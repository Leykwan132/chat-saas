import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internalMutation } from "../triggers";
import { resolveTeamForAgent } from "../appointmentBooking/access";
import { resolveAvailableInterval } from "../appointmentBooking/availability";
import { validateAvailabilityDates } from "../appointmentBooking/dateValidation";
import { sessionForCustomerBooking } from "../appointmentBooking/editing";
import { serviceTimeZone } from "../appointmentBooking/fields";
import type { BookingSlot } from "../appointmentBooking/types";
import { googleCalendarBookingGate, loadGoogleCalendarConnectionForUser } from "./bookingGate";
import { googleCalendarWriteInputFromEvent } from "./bookingPayload";
import { finalizeUpdateBatch } from "./batchBookingUpdateFinalize";
import type { BatchBookingUpdate, PrepareBatchUpdateResult } from "./batchBookingUpdateTypes";

type PlannedUpdate = {
  event: Doc<"calendarEvents">;
  session: Doc<"appointmentBookingSessions">;
  slot: BookingSlot;
  connectionId?: Id<"googleCalendarConnections">;
};

const NOT_UPDATABLE = "This booking cannot be updated from this conversation.";

async function planUpdate(
  ctx: MutationCtx,
  args: {
    conversation: Doc<"conversations">;
    team: Doc<"teams">;
    targetIds: Id<"calendarEvents">[];
    update: BatchBookingUpdate;
  },
): Promise<PlannedUpdate | string> {
  const { conversation, team, update } = args;
  const event = await ctx.db.get(update.bookingId);
  if (event === null || event.status === "cancelled" ||
      (event.externalOrigin ?? "kilobot") !== "kilobot" ||
      event.appointmentServiceId === undefined) return NOT_UPDATABLE;
  const session = await sessionForCustomerBooking(ctx, conversation, event._id);
  const service = await ctx.db.get(event.appointmentServiceId);
  if (session === undefined || service === null ||
      service.agentId !== conversation.assignedAgentId) return NOT_UPDATABLE;
  const pastDate = validateAvailabilityDates({
    now: Date.now(),
    timeZone: serviceTimeZone(service, team),
    preferredStartAt: update.startAt,
  });
  if (pastDate !== null) return `The new time must be on ${pastDate.todayDate} or later.`;
  const slot = await resolveAvailableInterval(ctx, {
    service,
    conversation,
    teamId: team._id,
    startAt: update.startAt,
    endAt: update.startAt + (event.endAt - event.startAt),
    excludeEventIds: args.targetIds,
  });
  if (slot === null) return "That time is not available.";
  if (event.externalProvider !== "google") return { event, session, slot };
  if (event.externalSyncState !== "synced" || event.externalOwnerUserId === undefined) {
    return "This booking is still syncing with Google Calendar.";
  }
  const gate = googleCalendarBookingGate(
    await loadGoogleCalendarConnectionForUser(ctx, event.externalOwnerUserId),
  );
  if (gate.kind === "error") return gate.result.message;
  if (gate.kind === "local") return "Google Calendar needs to be reconnected.";
  return { event, session, slot, connectionId: gate.connectionId };
}

function hasOverlap(planned: PlannedUpdate[]) {
  const sorted = [...planned].sort((a, b) => a.slot.startAt - b.slot.startAt);
  return sorted.some((row, index) => index > 0 && row.slot.startAt < sorted[index - 1]!.slot.endAt);
}

function failed(message: string, failures?: Array<{ bookingId: Id<"calendarEvents">; message: string }>) {
  return { kind: "failed" as const, result: { success: false, message, failures } };
}

export const prepareBatchUpdate = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    updates: v.array(v.object({ bookingId: v.id("calendarEvents"), startAt: v.number() })),
    refreshed: v.boolean(),
  },
  handler: async (ctx, args): Promise<PrepareBatchUpdateResult> => {
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation === null || conversation.assignedAgentId === undefined) {
      throw new Error("Conversation is not assigned to an agent");
    }
    const agent = await ctx.db.get(conversation.assignedAgentId);
    if (agent === null) throw new Error("Agent not found");
    const targetIds = args.updates.map((update) => update.bookingId);
    if (targetIds.length < 1 || targetIds.length > 10 || new Set(targetIds).size !== targetIds.length) {
      return failed("Provide between 1 and 10 distinct booking updates.");
    }
    const team = await resolveTeamForAgent(ctx, agent);
    const planned: PlannedUpdate[] = [];
    const failures = [];
    for (const update of args.updates) {
      const plan = await planUpdate(ctx, { conversation, team, targetIds, update });
      if (typeof plan === "string") failures.push({ bookingId: update.bookingId, message: plan });
      else planned.push(plan);
    }
    if (failures.length > 0) {
      return failed("No bookings were changed. Tell the customer which requested times cannot be used.", failures);
    }
    if (hasOverlap(planned)) return failed("No bookings were changed. The requested times overlap each other.");
    const connectionIds = [...new Set(planned.flatMap((row) => row.connectionId ?? []))];
    if (connectionIds.length > 0 && !args.refreshed) return { kind: "needs_refresh", connectionIds };
    const now = Date.now();
    const batchId = await ctx.db.insert("appointmentBookingUpdateBatches", {
      conversationId: conversation._id,
      agentId: agent._id,
      status: "prepared",
      items: planned.map((row) => ({
        calendarEventId: row.event._id,
        sessionId: row.session._id,
        originalStartAt: row.event.startAt,
        originalEndAt: row.event.endAt,
        slot: row.slot,
        connectionId: row.connectionId,
      })),
      createdAt: now,
      updatedAt: now,
    });
    if (connectionIds.length === 0) {
      return { kind: "completed", result: await finalizeUpdateBatch(ctx, batchId) };
    }
    return {
      kind: "prepared",
      batchId,
      writes: planned.flatMap((row) => row.connectionId === undefined ? [] : [{
        calendarEventId: row.event._id,
        connectionId: row.connectionId,
        event: googleCalendarWriteInputFromEvent({
          ...row.event,
          startAt: row.slot.startAt,
          endAt: row.slot.endAt,
        }),
        original: googleCalendarWriteInputFromEvent(row.event),
        now,
      }]),
    };
  },
});
