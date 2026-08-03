import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { assertManageableAgent } from "./agentAccess";
import {
  MAX_WORKFLOW_EDGES,
  MAX_WORKFLOW_NODES,
  ensureWorkflowForAgent,
  getWorkflowForAgent,
  getWorkflowGraph,
  listWorkflowEdges,
  listWorkflowNodes,
} from "./workflowCore";
import { addableWorkflowNodeKindValidator } from "./workflowValidators";
import {
  isWorkflowTerminalNodeKind,
  isWorkflowInitiallyReadyNodeKind,
  workflowNodeDefaultCondition,
  workflowNodeDescription,
  workflowNodeTitle,
} from "../shared/workflows";
import { removeWorkflowNode } from "./workflowNodeRemoval";
import { refreshWorkflowNodeReadinessForAgent } from "./workflowNodeReadiness";

function requireFinitePosition(value: number, field: string) {
  if (!Number.isFinite(value)) {
    throw new Error(`${field} must be finite`);
  }
}

function getNextChildPosition(
  sourceNode: Doc<"workflowNodes">,
  nodes: Doc<"workflowNodes">[],
  outgoingEdges: Doc<"workflowEdges">[],
) {
  const childIds = new Set(outgoingEdges.map((edge) => edge.targetNodeId));
  const childNodes = nodes.filter((node) => childIds.has(node._id));
  const maxChildX = childNodes.reduce(
    (maxX, node) => Math.max(maxX, node.positionX),
    sourceNode.positionX - 260,
  );
  return { positionX: maxChildX + 260, positionY: sourceNode.positionY + 140 };
}

async function requireWorkflowNode(
  ctx: QueryCtx | MutationCtx,
  workflowId: Id<"workflows">,
  nodeId: Id<"workflowNodes">,
) {
  const node = await ctx.db.get(nodeId);
  if (node === null || node.workflowId !== workflowId) {
    throw new Error("Workflow node not found");
  }
  return node;
}

export const getForAgent = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const { agent } = await assertManageableAgent(ctx, args.agentId);
    const workflow = await getWorkflowForAgent(ctx, agent._id);
    if (workflow === null) {
      return null;
    }
    return await getWorkflowGraph(ctx, workflow);
  },
});

export const ensureForAgent = mutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const { agent } = await assertManageableAgent(ctx, args.agentId);
    const workflow = await ensureWorkflowForAgent(ctx, agent);
    return await getWorkflowGraph(ctx, workflow);
  },
});

export const addNodeAfter = mutation({
  args: { agentId: v.id("agents"), sourceNodeId: v.id("workflowNodes"), kind: addableWorkflowNodeKindValidator },
  handler: async (ctx, args) => {
    const { agent } = await assertManageableAgent(ctx, args.agentId);
    const workflow = await ensureWorkflowForAgent(ctx, agent);
    const sourceNode = await requireWorkflowNode(ctx, workflow._id, args.sourceNodeId);
    if (isWorkflowTerminalNodeKind(sourceNode.kind)) {
      throw new Error("Cannot add a node after a terminal node");
    }

    const nodes = await listWorkflowNodes(ctx, workflow._id);
    const edges = await listWorkflowEdges(ctx, workflow._id);
    const outgoingEdges = edges.filter((edge) => edge.sourceNodeId === sourceNode._id);

    if (nodes.length >= MAX_WORKFLOW_NODES) {
      throw new Error("Workflow node limit reached");
    }
    if (edges.length + 1 > MAX_WORKFLOW_EDGES) {
      throw new Error("Workflow edge limit reached");
    }

    const now = Date.now();
    const { positionX, positionY } = getNextChildPosition(sourceNode, nodes, outgoingEdges);
    const defaultCondition = workflowNodeDefaultCondition(args.kind);

    const newNodeId = await ctx.db.insert("workflowNodes", {
      workflowId: workflow._id,
      kind: args.kind,
      title: workflowNodeTitle(args.kind),
      description: workflowNodeDescription(args.kind),
      isReady: isWorkflowInitiallyReadyNodeKind(args.kind),
      positionX,
      positionY,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("workflowEdges", {
      workflowId: workflow._id,
      sourceNodeId: sourceNode._id,
      targetNodeId: newNodeId,
      label: defaultCondition?.label,
      detail: defaultCondition?.detail,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(workflow._id, { updatedAt: now });
    await refreshWorkflowNodeReadinessForAgent(ctx, agent._id);
    return await getWorkflowGraph(ctx, workflow);
  },
});

export const updateNode = mutation({
  args: {
    agentId: v.id("agents"),
    nodeId: v.id("workflowNodes"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
    positionX: v.optional(v.number()),
    positionY: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { agent } = await assertManageableAgent(ctx, args.agentId);
    const workflow = await ensureWorkflowForAgent(ctx, agent);
    await requireWorkflowNode(ctx, workflow._id, args.nodeId);

    const patch: {
      title?: string;
      description?: string;
      notes?: string;
      positionX?: number;
      positionY?: number;
      updatedAt: number;
    } = { updatedAt: Date.now() };

    if (args.title !== undefined) {
      const title = args.title.trim();
      if (!title) {
        throw new Error("Node title is required");
      }
      patch.title = title;
    }
    if (args.description !== undefined) {
      patch.description = args.description.trim() || undefined;
    }
    if (args.notes !== undefined) {
      patch.notes = args.notes.trim() || undefined;
    }
    if (args.positionX !== undefined) {
      requireFinitePosition(args.positionX, "positionX");
      patch.positionX = args.positionX;
    }
    if (args.positionY !== undefined) {
      requireFinitePosition(args.positionY, "positionY");
      patch.positionY = args.positionY;
    }

    await ctx.db.patch(args.nodeId, patch);
    await ctx.db.patch(workflow._id, { updatedAt: patch.updatedAt });
    return await getWorkflowGraph(ctx, workflow);
  },
});

export const connectNodes = mutation({
  args: {
    agentId: v.id("agents"),
    sourceNodeId: v.id("workflowNodes"),
    targetNodeId: v.id("workflowNodes"),
  },
  handler: async (ctx, args) => {
    const { agent } = await assertManageableAgent(ctx, args.agentId);
    const workflow = await ensureWorkflowForAgent(ctx, agent);
    if (args.sourceNodeId === args.targetNodeId) {
      throw new Error("Cannot connect a node to itself");
    }

    const sourceNode = await requireWorkflowNode(ctx, workflow._id, args.sourceNodeId);
    const targetNode = await requireWorkflowNode(ctx, workflow._id, args.targetNodeId);
    if (isWorkflowTerminalNodeKind(sourceNode.kind)) {
      throw new Error("Cannot connect from a terminal node");
    }
    if (targetNode.kind === "start") {
      throw new Error("Cannot connect to the entry node");
    }

    const edges = await listWorkflowEdges(ctx, workflow._id);
    const existingEdge = edges.find(
      (edge) =>
        edge.sourceNodeId === sourceNode._id &&
        edge.targetNodeId === targetNode._id,
    );
    if (existingEdge !== undefined) {
      return await getWorkflowGraph(ctx, workflow);
    }
    if (edges.length >= MAX_WORKFLOW_EDGES) {
      throw new Error("Workflow edge limit reached");
    }

    const now = Date.now();
    await ctx.db.insert("workflowEdges", {
      workflowId: workflow._id,
      sourceNodeId: sourceNode._id,
      targetNodeId: targetNode._id,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(workflow._id, { updatedAt: now });
    return await getWorkflowGraph(ctx, workflow);
  },
});

export const updateEdgeCondition = mutation({
  args: {
    agentId: v.id("agents"),
    edgeId: v.id("workflowEdges"),
    label: v.string(),
    detail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { agent } = await assertManageableAgent(ctx, args.agentId);
    const workflow = await ensureWorkflowForAgent(ctx, agent);
    const edge = await ctx.db.get(args.edgeId);
    if (edge === null || edge.workflowId !== workflow._id) {
      throw new Error("Workflow edge not found");
    }

    const now = Date.now();
    const patch: { label?: string; detail?: string; updatedAt: number } = {
      label: args.label.trim() || undefined,
      updatedAt: now,
    };
    if (args.detail !== undefined) patch.detail = args.detail.trim() || undefined;
    await ctx.db.patch(edge._id, patch);
    await ctx.db.patch(workflow._id, { updatedAt: now });
    return await getWorkflowGraph(ctx, workflow);
  },
});

export const removeEdge = mutation({
  args: {
    agentId: v.id("agents"),
    edgeId: v.id("workflowEdges"),
  },
  handler: async (ctx, args) => {
    const { agent } = await assertManageableAgent(ctx, args.agentId);
    const workflow = await ensureWorkflowForAgent(ctx, agent);
    const edge = await ctx.db.get(args.edgeId);
    if (edge === null || edge.workflowId !== workflow._id) {
      throw new Error("Workflow edge not found");
    }
    await ctx.db.delete(edge._id);
    await ctx.db.patch(workflow._id, { updatedAt: Date.now() });
    return await getWorkflowGraph(ctx, workflow);
  },
});

export const removeNode = mutation({
  args: {
    agentId: v.id("agents"),
    nodeId: v.id("workflowNodes"),
  },
  handler: async (ctx, args) => {
    const { agent } = await assertManageableAgent(ctx, args.agentId);
    const workflow = await ensureWorkflowForAgent(ctx, agent);
    const node = await requireWorkflowNode(ctx, workflow._id, args.nodeId);
    if (node.kind === "start" || node.kind === "end") {
      throw new Error("Cannot remove entry or end nodes");
    }

    const edges = await listWorkflowEdges(ctx, workflow._id);
    const now = Date.now();

    await removeWorkflowNode(ctx, { agent, workflow, node, edges, now });
    await ctx.db.patch(workflow._id, { updatedAt: now });
    return await getWorkflowGraph(ctx, workflow);
  },
});
