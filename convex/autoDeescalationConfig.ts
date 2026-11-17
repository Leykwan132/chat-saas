import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertManageableAgent } from "./agentAccess";
import { normalizeEscalationKeywords } from "../shared/escalationKeywords";
import { autoDeescalationConfigValidator } from "./autoDeescalationSchema";
import { assertRoutingManage, assertRoutingRead } from "./leadRouting/helpers";

export const get = query({
  args: { agentId: v.id("agents"), scope: v.optional(v.literal("normal")) },
  returns: v.union(v.null(), autoDeescalationConfigValidator),
  handler: async (ctx, args) => {
    const agent =
      args.scope === "normal"
        ? await assertRoutingRead(ctx, args.agentId)
        : (await assertManageableAgent(ctx, args.agentId)).agent;
    return (
      (args.scope === "normal" ? agent.autoResume : agent.autoDeescalation) ??
      null
    );
  },
});

export const update = mutation({
  args: {
    agentId: v.id("agents"),
    scope: v.optional(v.literal("normal")),
    enabled: v.boolean(),
    inactivityMinutes: v.number(),
    keywords: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const agent =
      args.scope === "normal"
        ? await assertRoutingManage(ctx, args.agentId)
        : (await assertManageableAgent(ctx, args.agentId)).agent;
    if (
      !Number.isInteger(args.inactivityMinutes) ||
      args.inactivityMinutes < 1 ||
      args.inactivityMinutes > 43200
    ) {
      throw new Error("Choose a whole number of minutes between 1 and 43200");
    }
    const keywords = normalizeEscalationKeywords(args.keywords);
    const field = args.scope === "normal" ? "autoResume" : "autoDeescalation";
    const previous = agent[field];
    await ctx.db.patch(agent._id, {
      [field]: {
        enabled: args.enabled,
        inactivityMinutes: args.inactivityMinutes,
        keywords,
        revision: (previous?.revision ?? 0) + 1,
        activationRevision:
          (previous?.activationRevision ?? 0) +
          Number(previous?.enabled !== args.enabled),
      },
      updatedAt: Date.now(),
    });
    return null;
  },
});
