import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { query } from "./_generated/server";
import { getAuthContext } from "./authUtils";

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
