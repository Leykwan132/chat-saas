import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { query } from "./_generated/server";
import { getAuthContext } from "./authUtils";

// Latest messages for the thread view (chronological). Bounded take so opening a
// busy inbox stays responsive.
export const listRecentForConversation = query({
  args: {
    conversationId: v.id("conversations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { orgId } = await getAuthContext(ctx);
    const conv = await ctx.db.get(args.conversationId);
    if (conv === null || conv.orgId !== orgId) {
      return [];
    }
    const cap = Math.min(Math.max(args.limit ?? 80, 1), 200);
    const rows = await ctx.db
      .query("messages")
      .withIndex("by_conversationId_and_createdAt", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("desc")
      .take(cap);
    return rows.reverse();
  },
});

// Paginated message list for a single conversation, oldest first so the UI
// can append in scroll order. The caller is auth-checked via the parent
// conversation's orgId.
export const listForConversation = query({
  args: {
    conversationId: v.id("conversations"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const { orgId } = await getAuthContext(ctx);
    const conv = await ctx.db.get(args.conversationId);
    if (conv === null || conv.orgId !== orgId) {
      return { page: [], isDone: true, continueCursor: "" };
    }
    return await ctx.db
      .query("messages")
      .withIndex("by_conversationId_and_createdAt", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("asc")
      .paginate(args.paginationOpts);
  },
});
