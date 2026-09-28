import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { upsertInboxMessageSearchDocument } from "./inboxSearchProjection";

const MESSAGES_PER_BATCH = 100;

export const refreshConversationMessageSearchDocuments = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    cursor: v.union(v.string(), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("messages")
      .withIndex("by_conversationId_and_createdAt", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .paginate({ cursor: args.cursor, numItems: MESSAGES_PER_BATCH });
    for (const message of page.page) {
      await upsertInboxMessageSearchDocument(ctx, message._id);
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.inboxMessageSearchRefresh.refreshConversationMessageSearchDocuments,
        { conversationId: args.conversationId, cursor: page.continueCursor },
      );
    }
    return null;
  },
});
