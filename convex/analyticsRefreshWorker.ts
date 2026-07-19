import { v } from "convex/values";
import { syncConversationAnalyticsHandler } from "./analytics";
import { internalMutation } from "./_generated/server";

export const run = internalMutation({
  args: {
    requestId: v.id("conversationAnalyticsRefreshRequests"),
    revision: v.number(),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (request === null || request.revision !== args.revision) {
      return { refreshed: false };
    }

    await syncConversationAnalyticsHandler(ctx, {
      conversationId: request.conversationId,
    });

    const currentRequest = await ctx.db.get(args.requestId);
    if (currentRequest?.revision === args.revision) {
      await ctx.db.delete(args.requestId);
    }

    return { refreshed: true };
  },
});

