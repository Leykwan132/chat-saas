import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { assertManageableAgent } from "./agentAccess";
import {
  ensureWorkflowForAgent,
  getWorkflowGraph,
  listWorkflowNodes,
} from "./workflowCore";
import { workflowLayoutOrientationValidator } from "./workflowValidators";

function requireFinitePosition(value: number, field: string) {
  if (!Number.isFinite(value)) {
    throw new Error(`${field} must be finite`);
  }
}

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

export const apply = mutation({
  args: {
    agentId: v.id("agents"),
    layoutOrientation: workflowLayoutOrientationValidator,
    positions: v.array(
      v.object({
        nodeId: v.id("workflowNodes"),
        positionX: v.number(),
        positionY: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { agent } = await assertManageableAgent(ctx, args.agentId);
    const workflow = await ensureWorkflowForAgent(ctx, agent);
    const nodes = await listWorkflowNodes(ctx, workflow._id);
    const nodeIds = new Set(nodes.map((node) => node._id));
    const requestedNodeIds = new Set(
      args.positions.map((position) => position.nodeId),
    );
    if (
      args.positions.length !== nodes.length ||
      requestedNodeIds.size !== nodes.length ||
      args.positions.some((position) => !nodeIds.has(position.nodeId))
    ) {
      throw new Error("Workflow layout nodes do not match");
    }
    for (const position of args.positions) {
      requireFinitePosition(position.positionX, "positionX");
      requireFinitePosition(position.positionY, "positionY");
    }

    const now = Math.max(Date.now(), workflow.updatedAt + 1);
    for (const position of args.positions) {
      await ctx.db.patch(position.nodeId, {
        positionX: position.positionX,
        positionY: position.positionY,
        updatedAt: now,
      });
    }
    await ctx.db.patch(workflow._id, {
      layoutOrientation: args.layoutOrientation,
      updatedAt: now,
    });
    return await getWorkflowGraph(ctx, workflow);
  },
});
