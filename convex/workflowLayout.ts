import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { assertManageableAgent } from "./agentAccess";
import { ensureWorkflowForAgent, getWorkflowGraph } from "./workflowCore";
import { workflowLayoutOrientationValidator } from "./workflowValidators";

export const updateOrientation = mutation({
  args: {
    agentId: v.id("agents"),
    layoutOrientation: workflowLayoutOrientationValidator,
  },
  handler: async (ctx, args) => {
    const { agent } = await assertManageableAgent(ctx, args.agentId);
    const workflow = await ensureWorkflowForAgent(ctx, agent);
    const now = Date.now();

    await ctx.db.patch(workflow._id, {
      layoutOrientation: args.layoutOrientation,
      updatedAt: now,
    });

    const updatedWorkflow = await ctx.db.get(workflow._id);
    if (updatedWorkflow === null) {
      throw new Error("Workflow not found");
    }
    return await getWorkflowGraph(ctx, updatedWorkflow);
  },
});
