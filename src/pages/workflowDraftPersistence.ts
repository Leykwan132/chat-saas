import type { WorkflowGraph } from '../components/workflow/workflowTypes';
import { isDraftWorkflowNodeId } from '../components/workflow/workflowDraftModel';

export function toWorkflowDraftSavePayload(graph: WorkflowGraph) {
  return {
    baselineUpdatedAt: graph.workflow.updatedAt,
    layoutOrientation: graph.workflow.layoutOrientation ?? 'horizontal' as const,
    automations: graph.automations,
    nodes: graph.nodes.map((node) => ({
      clientId: node._id,
      persistedNodeId: isDraftWorkflowNodeId(node._id) ? undefined : node._id,
      kind: node.kind,
      title: node.title,
      description: node.description,
      notes: node.notes,
      allowedAppointmentServiceIds: node.allowedAppointmentServiceIds,
      positionX: node.positionX,
      positionY: node.positionY,
    })),
    edges: graph.edges.map((edge) => ({
      sourceClientId: edge.sourceNodeId,
      targetClientId: edge.targetNodeId,
      label: edge.label,
      detail: edge.detail,
    })),
  };
}
