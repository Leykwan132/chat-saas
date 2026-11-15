import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertManageableAgent } from "./agentAccess";
import { normalizeEscalationKeywords } from "../shared/escalationKeywords";
import { autoDeescalationConfigValidator } from "./autoDeescalationSchema";

export const get = query({
  args: { agentId: v.id("agents") },
  returns: v.union(v.null(), autoDeescalationConfigValidator),
  handler: async (ctx, args) => {
    const { agent } = await assertManageableAgent(ctx, args.agentId);
    return agent.autoDeescalation ?? null;
  },
});

export const update = mutation({
  args: {
    agentId: v.id("agents"),
    enabled: v.boolean(),
    inactivityMinutes: v.number(),
    keywords: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { agent } = await assertManageableAgent(ctx, args.agentId);
    if (!Number.isInteger(args.inactivityMinutes) || args.inactivityMinutes < 1 || args.inactivityMinutes > 43200) {
      throw new Error("Choose a whole number of minutes between 1 and 43200");
    }
    const keywords = normalizeEscalationKeywords(args.keywords);
    await ctx.db.patch(agent._id, {
      autoDeescalation: {
        enabled: args.enabled,
        inactivityMinutes: args.inactivityMinutes,
        keywords,
        revision: (agent.autoDeescalation?.revision ?? 0) + 1,
        activationRevision: (agent.autoDeescalation?.activationRevision ?? 0) + Number(agent.autoDeescalation?.enabled !== args.enabled),
      },
      updatedAt: Date.now(),
    });
    return null;
  },
});
