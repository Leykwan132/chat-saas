import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { assertManageableAgent } from "./agentAccess";
import {
  ensureWorkflowForAgent,
  getWorkflowGraph,
  listWorkflowEdges,
  listWorkflowNodes,
} from "./workflowCore";
import { workflowNodeTitle } from "../shared/workflows";

export const resetForAgent = mutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const { agent } = await assertManageableAgent(ctx, args.agentId);
    const workflow = await ensureWorkflowForAgent(ctx, agent);
    const nodes = await listWorkflowNodes(ctx, workflow._id);
    const edges = await listWorkflowEdges(ctx, workflow._id);
    const startNode = nodes.find((node) => node.kind === "start");

    if (startNode === undefined) {
      throw new Error("Workflow entry node not found");
    }

    for (const edge of edges) {
      await ctx.db.delete(edge._id);
    }

    for (const node of nodes) {
      if (node._id !== startNode._id) {
        await ctx.db.delete(node._id);
      }
    }

    const now = Date.now();
    await ctx.db.patch(startNode._id, {
      title: workflowNodeTitle("start"),
      description: undefined,
      notes: undefined,
      positionX: 0,
      positionY: 0,
      updatedAt: now,
    });
    await ctx.db.patch(workflow._id, { updatedAt: now });

    return await getWorkflowGraph(ctx, workflow);
  },
});
