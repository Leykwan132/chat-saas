import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { MAX_WORKFLOW_EDGES } from "./workflowCore";
import { deleteOrQueueWorkflowNodeMedia } from "./workflowMediaDeletion";

type BridgeEdge = {
  sourceNodeId: Doc<"workflowEdges">["sourceNodeId"];
  targetNodeId: Doc<"workflowEdges">["targetNodeId"];
  label?: string;
  detail?: string;
};

function buildBridgeEdges(
  node: Doc<"workflowNodes">,
  edges: Doc<"workflowEdges">[],
) {
  const incomingEdges = edges.filter((edge) => edge.targetNodeId === node._id);
  const outgoingEdges = edges.filter((edge) => edge.sourceNodeId === node._id);
  const connectedIds = new Set([
    ...incomingEdges.map((edge) => edge._id),
    ...outgoingEdges.map((edge) => edge._id),
  ]);
  const remainingEdges = edges.filter((edge) => !connectedIds.has(edge._id));
  const bridgeEdges: BridgeEdge[] = [];

  for (const incomingEdge of incomingEdges) {
    for (const outgoingEdge of outgoingEdges) {
      const sourceNodeId = incomingEdge.sourceNodeId;
      const targetNodeId = outgoingEdge.targetNodeId;
      if (sourceNodeId === targetNodeId) continue;
      const exists = [...remainingEdges, ...bridgeEdges].some(
        (edge) =>
          edge.sourceNodeId === sourceNodeId &&
          edge.targetNodeId === targetNodeId,
      );
      if (exists) continue;
      bridgeEdges.push({
        sourceNodeId,
        targetNodeId,
        label: outgoingEdge.label,
        detail: outgoingEdge.detail,
      });
    }
  }

  if (remainingEdges.length + bridgeEdges.length > MAX_WORKFLOW_EDGES) {
    throw new Error("Workflow edge limit reached");
  }

  return { connectedIds, bridgeEdges };
}

export async function removeWorkflowNode(
  ctx: MutationCtx,
  {
    agent,
    workflow,
    node,
    edges,
    now,
  }: {
    agent: Doc<"agents">;
    workflow: Doc<"workflows">;
    node: Doc<"workflowNodes">;
    edges: Doc<"workflowEdges">[];
    now: number;
  },
) {
  const { connectedIds, bridgeEdges } = buildBridgeEdges(node, edges);

  for (const edgeId of connectedIds) {
    await ctx.db.delete(edgeId);
  }
  for (const edge of bridgeEdges) {
    await ctx.db.insert("workflowEdges", {
      workflowId: workflow._id,
      sourceNodeId: edge.sourceNodeId,
      targetNodeId: edge.targetNodeId,
      label: edge.label,
      detail: edge.detail,
      createdAt: now,
      updatedAt: now,
    });
  }
  if (node.kind === "sendImage" || node.kind === "sendFile") {
    await deleteOrQueueWorkflowNodeMedia(ctx, agent, node._id);
  }
  await ctx.db.delete(node._id);
}
