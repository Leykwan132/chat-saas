import type { WorkId } from "@convex-dev/workpool";
import { v, type Infer } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  internalMutation,
  type MutationCtx,
} from "./_generated/server";
import { inboundMediaUnderstandingPool, inboxAiReplyPool } from "./inboxPools";
import { checkAiFeature, getTeamStripePlanHelper } from "./plans";

const QUIET_WINDOW_MS = 2_000;
const MAX_BATCH_WAIT_MS = 5_000;

export function inboundMediaProcessAfter(
  now: number,
  firstItemAt: number,
): number {
  return Math.min(now + QUIET_WINDOW_MS, firstItemAt + MAX_BATCH_WAIT_MS);
}

export const inboundMediaDescriptorValidator = v.object({
  assetKey: v.string(),
  kind: v.union(v.literal("image"), v.literal("audio")),
  service: v.union(
    v.literal("whatsapp"),
    v.literal("instagram"),
    v.literal("messenger"),
  ),
  providerMediaId: v.optional(v.string()),
  providerUrl: v.optional(v.string()),
  mimeType: v.optional(v.string()),
});

export type InboundMediaDescriptor = Infer<
  typeof inboundMediaDescriptorValidator
>;

export async function queueInboundMediaBatch(
  ctx: MutationCtx,
  args: {
    conversationId: Id<"conversations">;
    externalId: string;
    promptMessageId: string;
    caption: string;
    timestampMs: number;
    descriptors: InboundMediaDescriptor[];
  },
): Promise<boolean> {
  if (args.descriptors.length === 0) return false;

  const conversation = await ctx.db.get(args.conversationId);
  if (!conversation?.assignedAgentId || !conversation.assignToAiAgent) {
    return false;
  }
  const agent = await ctx.db.get(conversation.assignedAgentId);
  if (!agent) return false;
  const stripeInfo = await getTeamStripePlanHelper(ctx, {
    workosOrgId: agent.orgId,
    userId: agent.userId,
  }).catch(() => null);
  if (!stripeInfo) return false;
  if (
    !checkAiFeature(stripeInfo.plan, "auto_reply") ||
    !checkAiFeature(stripeInfo.plan, "ai_handle_audio_image")
  ) {
    return false;
  }

  const freshDescriptors: InboundMediaDescriptor[] = [];
  for (const descriptor of args.descriptors) {
    const existing = await ctx.db
      .query("inboundMediaBatchItems")
      .withIndex("by_assetKey", (q) => q.eq("assetKey", descriptor.assetKey))
      .unique();
    if (!existing) freshDescriptors.push(descriptor);
  }
  if (freshDescriptors.length === 0) return true;

  const now = Date.now();
  let batch = await ctx.db
    .query("inboundMediaBatches")
    .withIndex("by_conversationId_and_state", (q) =>
      q.eq("conversationId", args.conversationId).eq("state", "pending"),
    )
    .unique();

  if (!batch) {
    const batchId = await ctx.db.insert("inboundMediaBatches", {
      conversationId: args.conversationId,
      agentId: conversation.assignedAgentId,
      state: "pending",
      revision: 0,
      firstItemAt: now,
      latestItemAt: now,
      processAfter: now + QUIET_WINDOW_MS,
      latestPromptMessageId: args.promptMessageId,
      latestExternalId: args.externalId,
      createdAt: now,
      updatedAt: now,
    });
    batch = (await ctx.db.get(batchId))!;
  }

  const latestItem = await ctx.db
    .query("inboundMediaBatchItems")
    .withIndex("by_batchId_and_ordinal", (q) => q.eq("batchId", batch._id))
    .order("desc")
    .first();
  let ordinal = (latestItem?.ordinal ?? -1) + 1;
  for (const descriptor of freshDescriptors) {
    await ctx.db.insert("inboundMediaBatchItems", {
      batchId: batch._id,
      conversationId: args.conversationId,
      assetKey: descriptor.assetKey,
      externalId: args.externalId,
      promptMessageId: args.promptMessageId,
      ordinal,
      kind: descriptor.kind,
      service: descriptor.service,
      providerMediaId: descriptor.providerMediaId,
      providerUrl: descriptor.providerUrl,
      mimeType: descriptor.mimeType,
      caption: args.caption.trim() || undefined,
      createdAt: args.timestampMs,
    });
    ordinal += 1;
  }

  if (batch.workId) {
    await inboundMediaUnderstandingPool.cancel(ctx, batch.workId as WorkId);
  }

  const revision = batch.revision + 1;
  const processAfter = inboundMediaProcessAfter(now, batch.firstItemAt);
  await ctx.db.patch(batch._id, {
    revision,
    latestItemAt: now,
    processAfter,
    latestPromptMessageId: args.promptMessageId,
    latestExternalId: args.externalId,
    updatedAt: now,
    workId: undefined,
  });
  const workId = await inboundMediaUnderstandingPool.enqueueAction(
    ctx,
    internal.inboundMediaUnderstanding.processBatch,
    { batchId: batch._id, revision },
    { runAfter: Math.max(0, processAfter - now) },
  );
  await ctx.db.patch(batch._id, { workId });
  return true;
}

export const claimBatch = internalMutation({
  args: {
    batchId: v.id("inboundMediaBatches"),
    revision: v.number(),
  },
  handler: async (ctx, args) => {
    const batch = await ctx.db.get(args.batchId);
    if (
      !batch ||
      batch.state !== "pending" ||
      batch.revision !== args.revision
    ) {
      return null;
    }
    const items = await ctx.db
      .query("inboundMediaBatchItems")
      .withIndex("by_batchId_and_ordinal", (q) =>
        q.eq("batchId", args.batchId),
      )
      .take(100);
    const conversation = await ctx.db.get(batch.conversationId);
    const agent = await ctx.db.get(batch.agentId);
    const channel = conversation?.channelId
      ? await ctx.db.get(conversation.channelId)
      : null;
    if (!conversation || !agent || items.length === 0) return null;
    await ctx.db.patch(batch._id, {
      state: "processing",
      workId: undefined,
      updatedAt: Date.now(),
    });
    return {
      batch,
      items,
      conversation,
      agent,
      accessToken: channel?.accessToken,
    };
  },
});

export const finalizeBatchAndEnqueueReply = internalMutation({
  args: {
    batchId: v.id("inboundMediaBatches"),
    revision: v.number(),
  },
  handler: async (ctx, args) => {
    const batch = await ctx.db.get(args.batchId);
    if (
      !batch ||
      batch.state !== "processing" ||
      batch.revision !== args.revision
    ) {
      return false;
    }
    await ctx.db.patch(batch._id, {
      state: "completed",
      updatedAt: Date.now(),
    });
    await inboxAiReplyPool.enqueueAction(
      ctx,
      internal.chat.inbox.generateAiReplyWorker,
      {
        conversationId: batch.conversationId,
        promptMessageId: batch.latestPromptMessageId,
        inboundExternalId: batch.latestExternalId,
      },
    );
    return true;
  },
});

export const completeBatchWithoutReply = internalMutation({
  args: {
    batchId: v.id("inboundMediaBatches"),
    revision: v.number(),
  },
  handler: async (ctx, args) => {
    const batch = await ctx.db.get(args.batchId);
    if (
      batch?.state === "processing" &&
      batch.revision === args.revision
    ) {
      await ctx.db.patch(batch._id, {
        state: "completed",
        updatedAt: Date.now(),
      });
    }
  },
});
