import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { ensureWorkflowForAgent } from "./workflowCore";

export const ensureLegacyHumanEscalationForAgent = internalMutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (agent === null) {
      return null;
    }
    await ensureWorkflowForAgent(ctx, agent);
    return null;
  },
});
