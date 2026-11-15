import type { WorkflowGraph } from "../components/workflow/workflowTypes";

export function toWorkflowTemplateReplacementPayload(graph: WorkflowGraph) {
  const nodes = graph.nodes.filter((node) => node.kind !== "humanEscalation");
  const nodeIds = new Set(nodes.map((node) => node._id));
  return {
    baselineUpdatedAt: graph.workflow.updatedAt,
    layoutOrientation: graph.workflow.layoutOrientation ?? "horizontal",
    nodes: nodes.map((node) => ({
      clientId: node._id,
      kind: node.kind,
      title: node.title,
      description: node.description,
      notes: node.notes,
      allowedAppointmentServiceIds: node.allowedAppointmentServiceIds,
      positionX: node.positionX,
      positionY: node.positionY,
    })),
    edges: graph.edges.filter((edge) => nodeIds.has(edge.sourceNodeId) && nodeIds.has(edge.targetNodeId)).map((edge) => ({
      sourceClientId: edge.sourceNodeId,
      targetClientId: edge.targetNodeId,
      label: edge.label,
      detail: edge.detail,
    })),
  };
}
