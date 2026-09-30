import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id, TableNames } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { getAuthContext } from "./authUtils";
import { deleteConversationAgentThread } from "./channelAgentThreadCleanup";
import { decrementChannelConversationCount } from "./channelConversationCounts";
import { internalMutation, mutation } from "./triggers";

const PAGE_SIZE = 25;

async function deleteRows<T extends TableNames>(
  ctx: MutationCtx,
  rows: ReadonlyArray<{ _id: Id<T> }>,
) {
  for (const row of rows) await ctx.db.delete(row._id);
  return rows.length > 0;
}

async function deleteConversationPage(
  ctx: MutationCtx,
  conversationId: Id<"conversations">,
) {
  const messages = await ctx.db
    .query("messages")
    .withIndex("by_conversationId_and_createdAt", (q) =>
      q.eq("conversationId", conversationId),
    )
    .take(PAGE_SIZE);
  if (await deleteRows(ctx, messages)) return true;

  const batch = await ctx.db
    .query("inboundMediaBatches")
    .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
    .first();
  if (batch) {
    const items = await ctx.db
      .query("inboundMediaBatchItems")
      .withIndex("by_batchId", (q) => q.eq("batchId", batch._id))
      .take(PAGE_SIZE);
    if (await deleteRows(ctx, items)) return true;
    await ctx.db.delete(batch._id);
    return true;
  }

  const facts = await ctx.db
    .query("conversationAnalyticsFacts")
    .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
    .take(PAGE_SIZE);
  if (await deleteRows(ctx, facts)) return true;

  const refreshRequests = await ctx.db
    .query("conversationAnalyticsRefreshRequests")
    .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
    .take(PAGE_SIZE);
  if (await deleteRows(ctx, refreshRequests)) return true;

  const dirtyRequests = await ctx.db
    .query("conversationAnalyticsDirtyRequests")
    .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
    .take(PAGE_SIZE);
  if (await deleteRows(ctx, dirtyRequests)) return true;

  const projectionStates = await ctx.db
    .query("conversationAnalyticsProjectionStates")
    .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
    .take(PAGE_SIZE);
  if (await deleteRows(ctx, projectionStates)) return true;

  const topicAssignments = await ctx.db
    .query("conversationTopicAssignments")
    .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
    .take(PAGE_SIZE);
  if (await deleteRows(ctx, topicAssignments)) return true;

  const timers = await ctx.db
    .query("workflowFollowUpTimers")
    .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
    .take(PAGE_SIZE);
  if (await deleteRows(ctx, timers)) return true;

  const sessions = await ctx.db
    .query("appointmentBookingSessions")
    .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
    .take(PAGE_SIZE);
  if (await deleteRows(ctx, sessions)) return true;

  const batches = await ctx.db
    .query("appointmentBookingBatches")
    .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
    .take(PAGE_SIZE);
  if (await deleteRows(ctx, batches)) return true;

  const updateBatches = await ctx.db
    .query("appointmentBookingUpdateBatches")
    .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
    .take(PAGE_SIZE);
  if (await deleteRows(ctx, updateBatches)) return true;

  const logs = await ctx.db
    .query("conversationLogs")
    .withIndex("by_conversationId_and_performedAt", (q) =>
      q.eq("conversationId", conversationId),
    )
    .take(PAGE_SIZE);
  if (await deleteRows(ctx, logs)) return true;

  const searchDocuments = await ctx.db
    .query("inboxMessageSearchDocuments")
    .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
    .take(PAGE_SIZE);
  return await deleteRows(ctx, searchDocuments);
}

export const purge = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    threadId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (await deleteConversationPage(ctx, args.conversationId)) {
      await ctx.scheduler.runAfter(0, internal.conversationDeletion.purge, args);
      return null;
    }
    await deleteConversationAgentThread(ctx, args.threadId);
    return null;
  },
});

export const remove = mutation({
  args: { conversationId: v.id("conversations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { orgId } = await getAuthContext(ctx);
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation === null || conversation.orgId !== orgId) {
      throw new Error("Conversation not found");
    }
    await ctx.scheduler.runAfter(0, internal.conversationDeletion.purge, {
      conversationId: conversation._id,
      threadId: conversation.threadId,
    });
    await decrementChannelConversationCount(ctx, conversation.channelId);
    await ctx.db.delete(conversation._id);
    return null;
  },
});
