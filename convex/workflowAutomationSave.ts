import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { assertManageableAgent } from "./agentAccess";
import {
  prepareWorkflowAutomationSave,
  resolveWorkflowAutomationConfigs,
} from "./workflowAutomationConfig";
import { applyWorkflowAutomationSaveEffects } from "./workflowAutomationLifecycle";
import { workflowAutomationConfigsValidator } from "./workflowAutomationValidators";
import { getWorkflowForAgent, getWorkflowGraph } from "./workflowCore";

export const save = mutation({
  args: {
    agentId: v.id("agents"),
    baselineUpdatedAt: v.number(),
    automations: workflowAutomationConfigsValidator,
  },
  handler: async (ctx, args) => {
    const { agent } = await assertManageableAgent(ctx, args.agentId);
    const workflow = await getWorkflowForAgent(ctx, agent._id);
    if (workflow === null) {
      throw new Error("Workflow not found");
    }
    if (workflow.updatedAt !== args.baselineUpdatedAt) {
      throw new Error(
        "This workflow changed elsewhere. Reset to load the latest version before saving.",
      );
    }

    const current = resolveWorkflowAutomationConfigs(workflow);
    const automations = prepareWorkflowAutomationSave(
      current,
      args.automations,
    );
    const now = Math.max(Date.now(), workflow.updatedAt + 1);
    await ctx.db.patch(workflow._id, {
      reminderAutomation: automations.reminder,
      followUpAutomation: automations.followUp,
      updatedAt: now,
    });
    await applyWorkflowAutomationSaveEffects(
      ctx,
      {
        ...workflow,
        reminderAutomation: automations.reminder,
        followUpAutomation: automations.followUp,
      },
      current,
      automations,
    );

    const savedWorkflow = await ctx.db.get(workflow._id);
    if (savedWorkflow === null) {
      throw new Error("Workflow not found");
    }
    return await getWorkflowGraph(ctx, savedWorkflow);
  },
});
