import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internalMutation } from "../triggers";
import { applyOutboundStatusByExternalId } from "./readReceipts";

export const ORPHAN_AFTER_MS = 10 * 60 * 1000;
const SWEEP_BATCH = 100;

const ORPHAN_FAILURE_REASON =
  "Delivery confirmation lost before the provider message ID was recorded.";

async function resolveStaleQueued(
  ctx: MutationCtx,
  messageId: Id<"messages">,
  now: number,
): Promise<boolean> {
  const row = await ctx.db.get(messageId);
  if (row === null) return false;
  if (row.status !== "queued") return false;
  if (row.createdAt > now - ORPHAN_AFTER_MS) return false;
  await ctx.db.patch(row._id, {
    status: "failed",
    statusUpdatedAt: now,
    failureReason: ORPHAN_FAILURE_REASON,
  });
  console.warn("[queued-receipt-sweep] marked orphaned queued message as failed", {
    conversationId: row.conversationId,
    contactAddress: row.contactAddress,
    createdAt: row.createdAt,
  });
  return true;
}

export const verifyQueuedFinalized = internalMutation({
  args: { messageIds: v.array(v.id("messages")) },
  returns: v.object({ swept: v.number() }),
  handler: async (ctx, args) => {
    const now = Date.now();
    let swept = 0;
    for (const messageId of args.messageIds) {
      if (await resolveStaleQueued(ctx, messageId, now)) swept += 1;
    }
    return { swept };
  },
});

export const sweepStaleQueuedOutbound = internalMutation({
  args: {},
  returns: v.object({
    swept: v.number(),
    pendingApplied: v.number(),
    pendingRemoved: v.number(),
  }),
  handler: async (ctx) => {
    const now = Date.now();
    const cutoff = now - ORPHAN_AFTER_MS;
    // ponytail: one-time/manual filter scan over messages; no status index exists and the
    // targeted scheduler check (verifyQueuedFinalized) covers all new rows going forward.
    const candidates = await ctx.db
      .query("messages")
      .filter((q) =>
        q.and(q.eq(q.field("status"), "queued"), q.lt(q.field("createdAt"), cutoff)),
      )
      .take(SWEEP_BATCH);
    let swept = 0;
    for (const row of candidates) {
      if (await resolveStaleQueued(ctx, row._id, now)) swept += 1;
    }

    const pendings = await ctx.db
      .query("pendingOutboundReceiptEvents")
      .filter((q) => q.lt(q.field("createdAt"), cutoff))
      .take(SWEEP_BATCH);
    let pendingApplied = 0;
    let pendingRemoved = 0;
    for (const pending of pendings) {
      const result = await applyOutboundStatusByExternalId(ctx, {
        externalId: pending.externalId,
        channelId: pending.channelId,
        status: pending.status,
        source: "whatsapp_status",
        timestampMs: pending.timestampMs,
        failureReason: pending.failureReason,
      });
      await ctx.db.delete(pending._id);
      if (result.updated > 0) {
        pendingApplied += 1;
      } else {
        pendingRemoved += 1;
      }
    }

    if (swept > 0 || pendingApplied > 0 || pendingRemoved > 0) {
      console.warn("[queued-receipt-sweep] completed", {
        swept,
        pendingApplied,
        pendingRemoved,
      });
    }
    return { swept, pendingApplied, pendingRemoved };
  },
});
