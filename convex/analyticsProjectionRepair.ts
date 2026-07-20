import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation } from "./triggers";
import { reconcileConversationAnalytics } from "./analyticsConversationProjection";
import { projectConversationMessagePage } from "./analyticsMessageProjection";
import { reconcileConversationTopics } from "./analyticsTopicProjection";

type RepairResult =
  | { repaired: false; reason: "missing" }
  | {
      repaired: boolean;
      scheduled: boolean;
      projectedMessages: number;
    };

async function finishRepair(
  ctx: MutationCtx,
  conversationId: Id<"conversations">,
  projectedMessages: number,
): Promise<RepairResult> {
  await reconcileConversationAnalytics(ctx, conversationId);
  await reconcileConversationTopics(ctx, conversationId);
  return {
    repaired: true,
    scheduled: false,
    projectedMessages,
  };
}

async function repairMessagePage(
  ctx: MutationCtx,
  args: {
    conversationId: Id<"conversations">;
    earliestDirtyMessageAt: number;
    cursor: string | null;
  },
): Promise<RepairResult> {
  const page = await projectConversationMessagePage(ctx, args);
  if (page.isDone) {
    return await finishRepair(
      ctx,
      args.conversationId,
      page.projectedMessages,
    );
  }
  await ctx.scheduler.runAfter(
    0,
    internal.analyticsProjectionRepair.repairConversationPage,
    {
      conversationId: args.conversationId,
      earliestDirtyMessageAt: args.earliestDirtyMessageAt,
      cursor: page.continueCursor,
    },
  );
  return {
    repaired: false,
    scheduled: true,
    projectedMessages: page.projectedMessages,
  };
}

export const repairConversation = internalMutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args): Promise<RepairResult> => {
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation === null) {
      return { repaired: false, reason: "missing" };
    }
    const firstMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversationId_and_createdAt", (query) =>
        query.eq("conversationId", args.conversationId),
      )
      .order("asc")
      .take(1);
    const firstMessage = firstMessages[0];
    if (firstMessage === undefined) {
      return await finishRepair(ctx, args.conversationId, 0);
    }
    return await repairMessagePage(ctx, {
      conversationId: args.conversationId,
      earliestDirtyMessageAt: firstMessage.createdAt,
      cursor: null,
    });
  },
});

export const repairConversationPage = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    earliestDirtyMessageAt: v.number(),
    cursor: v.string(),
  },
  handler: async (ctx, args): Promise<RepairResult> =>
    await repairMessagePage(ctx, args),
});
