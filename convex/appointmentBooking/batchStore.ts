import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import {
  AppointmentBookingBatchStatus,
  isActiveAppointmentBookingBatchStatus,
} from "../appointmentBookingBatchStatus";
import { isActiveAppointmentBookingSessionStatus } from "../appointmentBookingSessionStatus";
import type { BookingSlot, CollectedFields, DbCtx } from "./types";

export async function getActiveBatch(
  ctx: DbCtx,
  conversationId: Id<"conversations">,
) {
  const batches = await ctx.db
    .query("appointmentBookingBatches")
    .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
    .order("desc")
    .take(20);
  return batches.find((batch) => isActiveAppointmentBookingBatchStatus(batch.status));
}

export async function getLatestBookedBatch(
  ctx: DbCtx,
  conversationId: Id<"conversations">,
) {
  const batches = await ctx.db
    .query("appointmentBookingBatches")
    .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
    .order("desc")
    .take(20);
  return batches.find((batch) => batch.status === AppointmentBookingBatchStatus.Booked);
}

export async function getActiveBookingState(
  ctx: DbCtx,
  conversationId: Id<"conversations">,
) {
  const batch = await getActiveBatch(ctx, conversationId);
  if (batch !== undefined) return { kind: "batch" as const, row: batch };
  const sessions = await ctx.db
    .query("appointmentBookingSessions")
    .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
    .order("desc")
    .take(100);
  const session = sessions.find((row) => isActiveAppointmentBookingSessionStatus(row.status));
  return session === undefined ? undefined : { kind: "single" as const, row: session };
}

export function activeBatchSnapshot(batch: Doc<"appointmentBookingBatches">) {
  return {
    bookingKind: "batch" as const,
    batchId: batch._id,
    status: batch.status,
    serviceId: batch.serviceId,
    collectedFields: batch.collectedFields,
    requestedCount: batch.requestedSlots.length,
  };
}

export async function createOrReplaceActiveBatch(
  ctx: MutationCtx,
  args: {
    conversationId: Id<"conversations">;
    agentId: Id<"agents">;
    serviceId?: Id<"appointmentServices">;
    collectedFields: CollectedFields;
    requestedSlots: BookingSlot[];
    customerConfirmationMessageId?: Id<"messages">;
  },
) {
  const active = await getActiveBookingState(ctx, args.conversationId);
  if (active?.kind === "single") {
    throw new Error("An active booking session already exists for this conversation");
  }
  const now = Date.now();
  if (active?.kind === "batch") {
    await ctx.db.patch(active.row._id, {
      serviceId: args.serviceId,
      collectedFields: args.collectedFields,
      requestedSlots: args.requestedSlots,
      customerConfirmationMessageId: args.customerConfirmationMessageId,
      status: AppointmentBookingBatchStatus.Collecting,
      updatedAt: now,
    });
    const updated = await ctx.db.get(active.row._id);
    if (updated === null) throw new Error("Failed to update booking batch");
    return updated;
  }
  const batchId = await ctx.db.insert("appointmentBookingBatches", {
    conversationId: args.conversationId,
    agentId: args.agentId,
    serviceId: args.serviceId,
    status: AppointmentBookingBatchStatus.Collecting,
    collectedFields: args.collectedFields,
    requestedSlots: args.requestedSlots,
    customerConfirmationMessageId: args.customerConfirmationMessageId,
    createdAt: now,
    updatedAt: now,
  });
  const batch = await ctx.db.get(batchId);
  if (batch === null) throw new Error("Failed to create booking batch");
  return batch;
}
