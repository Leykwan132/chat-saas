import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  workflowNodeDefaultCondition,
  workflowNodeDescription,
  workflowNodeTitle,
} from "../shared/workflows";

type DbCtx = QueryCtx | MutationCtx;

export const MAX_WORKFLOW_NODES = 100;
export const MAX_WORKFLOW_EDGES = 200;

export async function getWorkflowForAgent(
  ctx: DbCtx,
  agentId: Id<"agents">,
) {
  return await ctx.db
    .query("workflows")
    .withIndex("by_agentId", (q) => q.eq("agentId", agentId))
    .unique();
}

export async function listWorkflowNodes(
  ctx: DbCtx,
  workflowId: Id<"workflows">,
) {
  const nodes = await ctx.db
    .query("workflowNodes")
    .withIndex("by_workflowId", (q) => q.eq("workflowId", workflowId))
    .take(MAX_WORKFLOW_NODES + 1);
  if (nodes.length > MAX_WORKFLOW_NODES) {
    throw new Error("Workflow node limit exceeded");
  }
  return nodes;
}

export async function listWorkflowEdges(
  ctx: DbCtx,
  workflowId: Id<"workflows">,
) {
  const edges = await ctx.db
    .query("workflowEdges")
    .withIndex("by_workflowId", (q) => q.eq("workflowId", workflowId))
    .take(MAX_WORKFLOW_EDGES + 1);
  if (edges.length > MAX_WORKFLOW_EDGES) {
    throw new Error("Workflow edge limit exceeded");
  }
  return edges;
}

export async function getWorkflowGraph(
  ctx: DbCtx,
  workflow: Doc<"workflows">,
) {
  const nodes = await listWorkflowNodes(ctx, workflow._id);
  const edges = await listWorkflowEdges(ctx, workflow._id);
  return { workflow, nodes, edges };
}

export async function workflowHasHumanEscalationNode(
  ctx: DbCtx,
  workflowId: Id<"workflows">,
) {
  const nodes = await listWorkflowNodes(ctx, workflowId);
  return nodes.some((node) => node.kind === "humanEscalation");
}

export async function ensureLegacyHumanEscalationNode(
  ctx: MutationCtx,
  workflow: Doc<"workflows">,
  agent: Doc<"agents">,
) {
  if (agent.escalationEnabled !== true) {
    return false;
  }

  const nodes = await listWorkflowNodes(ctx, workflow._id);
  if (nodes.some((node) => node.kind === "humanEscalation")) {
    await ctx.db.patch(agent._id, {
      escalationEnabled: false,
      escalationMessage: undefined,
      updatedAt: Date.now(),
    });
    return false;
  }
  if (nodes.length >= MAX_WORKFLOW_NODES) {
    throw new Error("Workflow node limit reached");
  }

  const startNode = nodes.find((node) => node.kind === "start");
  if (startNode === undefined) {
    throw new Error("Workflow entry node not found");
  }

  const edges = await listWorkflowEdges(ctx, workflow._id);
  if (edges.length + 1 > MAX_WORKFLOW_EDGES) {
    throw new Error("Workflow edge limit reached");
  }

  const now = Date.now();
  const condition = workflowNodeDefaultCondition("humanEscalation");
  const humanEscalationNodeId = await ctx.db.insert("workflowNodes", {
    workflowId: workflow._id,
    kind: "humanEscalation",
    title: workflowNodeTitle("humanEscalation"),
    description: workflowNodeDescription("humanEscalation"),
    positionX: startNode.positionX + 260,
    positionY: startNode.positionY + 140,
    createdAt: now,
    updatedAt: now,
  });
  await ctx.db.insert("workflowEdges", {
    workflowId: workflow._id,
    sourceNodeId: startNode._id,
    targetNodeId: humanEscalationNodeId,
    label: condition?.label,
    detail: condition?.detail,
    createdAt: now,
    updatedAt: now,
  });
  await ctx.db.patch(workflow._id, { updatedAt: now });
  await ctx.db.patch(agent._id, {
    escalationEnabled: false,
    escalationMessage: undefined,
    updatedAt: now,
  });
  return true;
}

export async function ensureWorkflowForAgent(
  ctx: MutationCtx,
  agent: Doc<"agents">,
) {
  const existing = await getWorkflowForAgent(ctx, agent._id);
  if (existing !== null) {
    await ensureLegacyHumanEscalationNode(ctx, existing, agent);
    return existing;
  }

  const now = Date.now();
  const workflowId = await ctx.db.insert("workflows", {
    agentId: agent._id,
    orgId: agent.orgId,
    userId: agent.userId,
    name: `${agent.name} Workflow`,
    createdAt: now,
    updatedAt: now,
  });

  await ctx.db.insert("workflowNodes", {
    workflowId,
    kind: "start",
    title: workflowNodeTitle("start"),
    positionX: 0,
    positionY: 0,
    createdAt: now,
    updatedAt: now,
  });

  const workflow = await ctx.db.get(workflowId);
  if (workflow === null) {
    throw new Error("Failed to create workflow");
  }
  await ensureLegacyHumanEscalationNode(ctx, workflow, agent);
  return workflow;
}
