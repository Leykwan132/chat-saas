import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { MAX_WORKFLOW_EDGES, MAX_WORKFLOW_NODES } from "./workflowCore";

export function getPreservedEscalationRules(
  existingNodes: Doc<"workflowNodes">[],
  existingEdges: Doc<"workflowEdges">[],
  incomingNodes: { persistedNodeId?: Id<"workflowNodes"> }[],
  incomingEdgeCount: number,
) {
  const includedIds = new Set(incomingNodes.map((node) => node.persistedNodeId));
  const nodeIds = new Set(existingNodes
    .filter((node) => node.kind === "humanEscalation" && !includedIds.has(node._id))
    .map((node) => node._id));
  const edges = existingEdges.filter((edge) => nodeIds.has(edge.targetNodeId));
  if (incomingNodes.length + nodeIds.size > MAX_WORKFLOW_NODES || incomingEdgeCount + edges.length > MAX_WORKFLOW_EDGES) {
    throw new Error("Workflow limit reached, including Human Escalation rules in Instructions");
  }
  return { nodeIds, edges };
}

export async function reconnectPreservedEscalationRules(
  ctx: MutationCtx,
  preserved: ReturnType<typeof getPreservedEscalationRules>,
  retainedNodeIds: Set<Id<"workflowNodes">>,
  newStartId: Id<"workflowNodes">,
  now: number,
) {
  const groups = new Map<string, { sourceNodeId: Id<"workflowNodes">; edges: Doc<"workflowEdges">[] }>();
  for (const edge of preserved.edges) {
    const sourceNodeId = retainedNodeIds.has(edge.sourceNodeId) || preserved.nodeIds.has(edge.sourceNodeId)
      ? edge.sourceNodeId : newStartId;
    const key = JSON.stringify([sourceNodeId, edge.targetNodeId]);
    const group = groups.get(key);
    if (group) group.edges.push(edge);
    else groups.set(key, { sourceNodeId, edges: [edge] });
  }
  for (const { sourceNodeId, edges } of groups.values()) {
    const [first, ...duplicates] = edges;
    if (duplicates.length === 0) {
      if (first.sourceNodeId !== sourceNodeId) await ctx.db.patch(first._id, { sourceNodeId, updatedAt: now });
      continue;
    }
    const conditions = [...new Set(edges.map((edge) =>
      [edge.label?.trim(), edge.detail?.trim()].filter(Boolean).join(': '),
    ).filter(Boolean))];
    await ctx.db.patch(first._id, { sourceNodeId, detail: conditions.join('\n\nOR\n\n') || undefined, updatedAt: now });
    for (const duplicate of duplicates) await ctx.db.delete(duplicate._id);
  }
}
