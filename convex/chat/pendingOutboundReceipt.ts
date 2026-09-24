import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import {
  applyOutboundStatusByExternalId,
  shouldApplyChannelMessageStatus,
  type ChannelMessageStatus,
} from "./readReceipts";

export async function recordPendingOutboundReceipt(
  ctx: MutationCtx,
  args: {
    externalId: string;
    channelId: Id<"channels">;
    status: ChannelMessageStatus;
    timestampMs?: number;
    failureReason?: string;
  },
) {
  const existing = await ctx.db
    .query("pendingOutboundReceiptEvents")
    .withIndex("by_externalId_and_channelId", (q) =>
      q.eq("externalId", args.externalId).eq("channelId", args.channelId),
    )
    .unique();
  const now = Date.now();
  if (existing === null) {
    await ctx.db.insert("pendingOutboundReceiptEvents", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
    return;
  }
  if (!shouldApplyChannelMessageStatus(existing.status, args.status)) return;
  await ctx.db.patch(existing._id, {
    status: args.status,
    ...(args.timestampMs === undefined ? {} : { timestampMs: args.timestampMs }),
    ...(args.failureReason === undefined ? {} : { failureReason: args.failureReason }),
    updatedAt: now,
  });
}

export async function applyPendingOutboundReceipt(
  ctx: MutationCtx,
  args: { externalId: string; channelId: Id<"channels"> },
) {
  const pending = await ctx.db
    .query("pendingOutboundReceiptEvents")
    .withIndex("by_externalId_and_channelId", (q) =>
      q.eq("externalId", args.externalId).eq("channelId", args.channelId),
    )
    .unique();
  if (pending === null) return;
  const result = await applyOutboundStatusByExternalId(ctx, {
    externalId: pending.externalId,
    channelId: pending.channelId,
    status: pending.status,
    source: "whatsapp_status",
    timestampMs: pending.timestampMs,
    failureReason: pending.failureReason,
  });
  if (result.updated > 0) {
    await ctx.db.delete(pending._id);
  }
}
