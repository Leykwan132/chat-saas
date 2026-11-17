import { v } from "convex/values";
import { vOnCompleteArgs } from "@convex-dev/workpool";
import { internalMutation } from "./_generated/server";
import { finishReplyMedia } from "./inboundReplyQueue";

export const finalizeBatchAndEnqueueReply = internalMutation({
  args: {
    batchId: v.id("inboundMediaBatches"),
    revision: v.number(),
    error: v.optional(v.string()),
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
    const items = await ctx.db
      .query("inboundMediaBatchItems")
      .withIndex("by_batchId_and_ordinal", (q) => q.eq("batchId", batch._id))
      .take(257);
    if (items.length > 256)
      throw new Error("Media reply group exceeds 256 assets");
    await finishReplyMedia(
      ctx,
      batch.conversationId,
      items.map((item) => item.promptMessageId),
      args.error,
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
    if (batch?.state === "processing" && batch.revision === args.revision) {
      await ctx.db.patch(batch._id, {
        state: "completed",
        updatedAt: Date.now(),
      });
      const items = await ctx.db
        .query("inboundMediaBatchItems")
        .withIndex("by_batchId_and_ordinal", (q) => q.eq("batchId", batch._id))
        .take(257);
      if (items.length > 256)
        throw new Error("Media reply group exceeds 256 assets");
      await finishReplyMedia(
        ctx,
        batch.conversationId,
        items.map((item) => item.promptMessageId),
        "Media processing stopped because AI is unavailable",
      );
    }
  },
});

export const preparationComplete = internalMutation({
  args: vOnCompleteArgs(
    v.object({ batchId: v.id("inboundMediaBatches"), revision: v.number() }),
  ),
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.result.kind === "success") return null;
    const batch = await ctx.db.get(args.context.batchId);
    if (!batch || batch.revision !== args.context.revision) return null;
    const items = await ctx.db
      .query("inboundMediaBatchItems")
      .withIndex("by_batchId_and_ordinal", (q) => q.eq("batchId", batch._id))
      .take(257);
    if (items.length > 256)
      throw new Error("Media reply group exceeds 256 assets");
    const error =
      args.result.kind === "failed"
        ? args.result.error
        : "Media processing cancelled";
    await finishReplyMedia(
      ctx,
      batch.conversationId,
      items.map((item) => item.promptMessageId),
      error,
    );
    await ctx.db.patch(batch._id, {
      state: "completed",
      workId: undefined,
      updatedAt: Date.now(),
    });
    return null;
  },
});
