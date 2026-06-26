import type { Edge, Node } from '@xyflow/react';
import type { Doc, Id } from '../../../convex/_generated/dataModel';
import type { AddableWorkflowNodeKind, WorkflowNodeKind } from '../../../shared/workflows';

export type WorkflowGraph = {
  workflow: Doc<'workflows'>;
  nodes: Doc<'workflowNodes'>[];
  edges: Doc<'workflowEdges'>[];
};

export type WorkflowNodeData = Record<string, unknown> & {
  nodeId: Id<'workflowNodes'>;
  kind: WorkflowNodeKind;
  title: string;
  description?: string;
  onAddNode: (nodeId: Id<'workflowNodes'>, kind: AddableWorkflowNodeKind) => void;
  onRemoveNode: (nodeId: Id<'workflowNodes'>) => void;
};

export type WorkflowEdgeData = Record<string, unknown> & {
  routePoints?: WorkflowEdgeRoutePoint[];
};

export type WorkflowEdgeRoutePoint = {
  x: number;
  y: number;
};

export type WorkflowFlowNode = Node<WorkflowNodeData, 'workflow'>;
export type WorkflowFlowEdge = Edge<WorkflowEdgeData, 'workflow'>;
