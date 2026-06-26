import { MarkerType } from '@xyflow/react';
import type { Id } from '../../../convex/_generated/dataModel';
import {
  workflowConditionDisplayLabel,
  workflowNodeDisplayTitle,
  type AddableWorkflowNodeKind,
} from '../../../shared/workflows';
import type {
  WorkflowFlowEdge,
  WorkflowFlowNode,
  WorkflowGraph,
} from './workflowTypes';
import { getWorkflowEdgeRoutes } from './workflowEdgeRouting';

export const WORKFLOW_EDGE_Z_INDEX = 10;
export const WORKFLOW_NODE_Z_INDEX = 20;
export const WORKFLOW_SELECTED_NODE_Z_INDEX = 30;

export function workflowGraphToFlow(
  graph: WorkflowGraph,
  onAddNode: (nodeId: Id<'workflowNodes'>, kind: AddableWorkflowNodeKind) => void,
  onRemoveNode: (nodeId: Id<'workflowNodes'>) => void,
  selectedNodeId?: Id<'workflowNodes'>,
): { nodes: WorkflowFlowNode[]; edges: WorkflowFlowEdge[] } {
  const edgeRoutes = getWorkflowEdgeRoutes(graph);

  return {
    nodes: graph.nodes.map((node) => ({
      id: node._id,
      type: 'workflow',
      position: {
        x: node.positionX,
        y: node.positionY,
      },
      data: {
        nodeId: node._id,
        kind: node.kind,
        title: workflowNodeDisplayTitle(node.kind, node.title),
        description: node.description,
        onAddNode,
        onRemoveNode,
      },
      selected: node._id === selectedNodeId,
      zIndex: node._id === selectedNodeId
        ? WORKFLOW_SELECTED_NODE_Z_INDEX
        : WORKFLOW_NODE_Z_INDEX,
    })),
    edges: graph.edges.map((edge) => {
      const conditionLabel = workflowConditionDisplayLabel(edge.label);
      return {
        id: edge._id,
        source: edge.sourceNodeId,
        target: edge.targetNodeId,
        type: 'workflow',
        animated: true,
        label: conditionLabel,
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
        zIndex: WORKFLOW_EDGE_Z_INDEX,
        className: 'workflow-edge',
        data: {
          routePoints: edgeRoutes.get(edge._id),
        },
      };
    }),
  };
}
