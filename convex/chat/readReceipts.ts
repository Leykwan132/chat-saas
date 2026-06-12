import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export type ChannelMessageStatus = NonNullable<Doc<"messages">["status"]>;
export type ReadReceiptSource =
  | "whatsapp_status"
  | "instagram_seen"
  | "messenger_read";

type ReceiptUpdateOptions = {
  status: ChannelMessageStatus;
  source: ReadReceiptSource;
  timestampMs?: number;
  providerMessageId?: string;
  watermark?: number;
  failureReason?: string;
};

const STATUS_RANK: Record<Exclude<ChannelMessageStatus, "failed">, number> = {
  queued: 0,
  sent: 1,
  delivered: 2,
  read: 3,
};

function isRankedStatus(
  status: ChannelMessageStatus | undefined,
): status is Exclude<ChannelMessageStatus, "failed"> {
  return status !== undefined && status !== "failed";
}

function shouldApplyStatus(
  current: ChannelMessageStatus | undefined,
  next: ChannelMessageStatus,
): boolean {
  if (current === "failed") return false;
  if (next === "failed") return current !== "read";
  if (!isRankedStatus(current)) return true;
  return STATUS_RANK[next] >= STATUS_RANK[current];
}

async function patchReceiptStatus(
  ctx: MutationCtx,
  row: Doc<"messages">,
  options: ReceiptUpdateOptions,
): Promise<boolean> {
  if (row.direction !== "outgoing") return false;
  if (!shouldApplyStatus(row.status, options.status)) return false;

  const effectiveTimestamp = options.timestampMs ?? Date.now();
  const patch: Record<string, unknown> = {
    status: options.status,
    statusUpdatedAt: effectiveTimestamp,
    receiptMetadata: {
      source: options.source,
      ...(options.providerMessageId !== undefined
        ? { providerMessageId: options.providerMessageId }
        : {}),
      ...(options.timestampMs !== undefined
        ? { providerTimestamp: options.timestampMs }
        : {}),
      ...(options.watermark !== undefined ? { watermark: options.watermark } : {}),
    },
  };

  if (options.status === "read") {
    patch.readAt = effectiveTimestamp;
  }
  if (options.status === "failed" && options.failureReason) {
    patch.failureReason = options.failureReason;
  }

  await ctx.db.patch(row._id, patch);
  return true;
}

export async function applyOutboundStatusByExternalId(
  ctx: MutationCtx,
  args: {
    externalId: string;
    status: ChannelMessageStatus;
    source: ReadReceiptSource;
    timestampMs?: number;
    channelId?: Id<"channels">;
    failureReason?: string;
  },
): Promise<{ updated: number }> {
  const rows = await ctx.db
    .query("messages")
    .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
    .take(100);

  let updated = 0;
  for (const row of rows) {
    if (args.channelId !== undefined && row.channelId !== args.channelId) {
      continue;
    }
    const patched = await patchReceiptStatus(ctx, row, {
      status: args.status,
      source: args.source,
      timestampMs: args.timestampMs,
      providerMessageId: args.externalId,
      failureReason: args.failureReason,
    });
    if (patched) updated += 1;
  }
  return { updated };
}

export async function markOutboundReadThroughExternalId(
  ctx: MutationCtx,
  args: {
    conversationId: Id<"conversations">;
    channelId: Id<"channels">;
    externalId: string;
    source: ReadReceiptSource;
    timestampMs?: number;
  },
): Promise<{ updated: number }> {
  const pivotRows = await ctx.db
    .query("messages")
    .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
    .take(100);

  const pivotCreatedAt = pivotRows
    .filter(
      (row) =>
        row.conversationId === args.conversationId &&
        row.channelId === args.channelId &&
        row.direction === "outgoing",
    )
    .reduce<number | undefined>(
      (max, row) =>
        max === undefined || row.createdAt > max ? row.createdAt : max,
      undefined,
    );

  if (pivotCreatedAt === undefined) {
    return { updated: 0 };
  }

  return await markOutboundReadThroughTimestamp(ctx, {
    conversationId: args.conversationId,
    channelId: args.channelId,
    watermarkMs: pivotCreatedAt,
    source: args.source,
    timestampMs: args.timestampMs,
    providerMessageId: args.externalId,
  });
}

export async function markOutboundReadThroughTimestamp(
  ctx: MutationCtx,
  args: {
    conversationId: Id<"conversations">;
    channelId: Id<"channels">;
    watermarkMs: number;
    source: ReadReceiptSource;
    timestampMs?: number;
    providerMessageId?: string;
  },
): Promise<{ updated: number }> {
  const rows = await ctx.db
    .query("messages")
    .withIndex("by_conversationId_and_createdAt", (q) =>
      q.eq("conversationId", args.conversationId).lte("createdAt", args.watermarkMs),
    )
    .order("desc")
    .take(200);

  let updated = 0;
  for (const row of rows) {
    if (row.channelId !== args.channelId) continue;
    const patched = await patchReceiptStatus(ctx, row, {
      status: "read",
      source: args.source,
      timestampMs: args.timestampMs ?? args.watermarkMs,
      providerMessageId: args.providerMessageId,
      watermark: args.watermarkMs,
    });
    if (patched) updated += 1;
  }
  return { updated };
}
