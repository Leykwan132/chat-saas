import { MarkerType, type OnBeforeDelete } from '@xyflow/react';
import type { Id } from '../../../convex/_generated/dataModel';
import { WORKFLOW_EDGE_Z_INDEX } from './workflowFlowModel';
import type { WorkflowFlowEdge, WorkflowFlowNode } from './workflowTypes';

const TEMP_WORKFLOW_EDGE_PREFIX = 'temp:';
const TEMPORARY_EDGE_Z_INDEX = WORKFLOW_EDGE_Z_INDEX + 2;

export const SELECTED_EDGE_Z_INDEX = WORKFLOW_EDGE_Z_INDEX + 1;

export type WorkflowConnectionCandidate = {
  sourceNodeId: Id<'workflowNodes'>;
  targetNodeId: Id<'workflowNodes'>;
};

export function isTemporaryWorkflowEdge(edge: Pick<WorkflowFlowEdge, 'id'>) {
  return edge.id.startsWith(TEMP_WORKFLOW_EDGE_PREFIX);
}

export function createTemporaryWorkflowEdge({
  sourceNodeId,
  targetNodeId,
}: WorkflowConnectionCandidate): WorkflowFlowEdge {
  return {
    id: `${TEMP_WORKFLOW_EDGE_PREFIX}${sourceNodeId}:${targetNodeId}`,
    source: sourceNodeId,
    target: targetNodeId,
    type: 'workflow',
    animated: true,
    markerEnd: {
      type: MarkerType.ArrowClosed,
    },
    zIndex: TEMPORARY_EDGE_Z_INDEX,
    style: {
      opacity: 0.45,
    },
  };
}

export function getDeletedWorkflowEdgeIds(deletedEdges: WorkflowFlowEdge[]) {
  return deletedEdges
    .filter((edge) => !isTemporaryWorkflowEdge(edge))
    .map((edge) => edge.id);
}

export function removeDeletedWorkflowEdges(
  edges: WorkflowFlowEdge[],
  deletedEdgeIds: string[],
) {
  return edges.filter((edge) => !deletedEdgeIds.includes(edge.id));
}

export const keepOnlyEdgeDeletions: OnBeforeDelete<
  WorkflowFlowNode,
  WorkflowFlowEdge
> = async ({ nodes, edges }) => {
  if (nodes.length > 0) return false;

  return {
    nodes: [],
    edges: edges.filter((edge) => !isTemporaryWorkflowEdge(edge)),
  };
};
