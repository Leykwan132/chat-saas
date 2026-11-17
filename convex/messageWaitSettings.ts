import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertRoutingManage, assertRoutingRead } from "./leadRouting/helpers";
import { resolveMessageWaitSeconds } from "../shared/messageWaitTime";

export const get = query({
  args: { agentId: v.id("agents") },
  returns: v.number(),
  handler: async (ctx, { agentId }) => {
    const agent = await assertRoutingRead(ctx, agentId);
    return resolveMessageWaitSeconds(agent.messageWaitSeconds);
  },
});

export const update = mutation({
  args: { agentId: v.id("agents"), messageWaitSeconds: v.number() },
  returns: v.null(),
  handler: async (ctx, { agentId, messageWaitSeconds }) => {
    const agent = await assertRoutingManage(ctx, agentId);
    const validatedSeconds = resolveMessageWaitSeconds(messageWaitSeconds);
    await ctx.db.patch(agent._id, {
      messageWaitSeconds: validatedSeconds,
      updatedAt: Date.now(),
    });
    return null;
  },
});
