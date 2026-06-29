import type { OnBeforeDelete } from '@xyflow/react';
import type { Id } from '../../../convex/_generated/dataModel';
import { WORKFLOW_EDGE_Z_INDEX } from './workflowFlowModel';
import {
  AUTOMATION_WORKFLOW_EDGE_PREFIX,
  type WorkflowFlowEdge,
  type WorkflowFlowNode,
} from './workflowTypes';

const TEMP_WORKFLOW_EDGE_PREFIX = 'temp:';
export const SELECTED_EDGE_Z_INDEX = WORKFLOW_EDGE_Z_INDEX + 1;

export type WorkflowConnectionCandidate = {
  sourceNodeId: Id<'workflowNodes'>;
  targetNodeId: Id<'workflowNodes'>;
};

export function isTemporaryWorkflowEdge(edge: Pick<WorkflowFlowEdge, 'id'>) {
  return edge.id.startsWith(TEMP_WORKFLOW_EDGE_PREFIX);
}

export function isAutomationWorkflowEdge(edge: Pick<WorkflowFlowEdge, 'id'>) {
  return edge.id.startsWith(AUTOMATION_WORKFLOW_EDGE_PREFIX);
}

export function getDeletedWorkflowEdgeIds(deletedEdges: WorkflowFlowEdge[]) {
  return deletedEdges
    .filter((edge) => !isTemporaryWorkflowEdge(edge) && !isAutomationWorkflowEdge(edge))
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
    edges: edges.filter((edge) => (
      !isTemporaryWorkflowEdge(edge) &&
      !isAutomationWorkflowEdge(edge)
    )),
  };
};
