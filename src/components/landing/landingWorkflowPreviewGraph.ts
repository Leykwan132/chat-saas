import type { Doc, Id } from '../../../convex/_generated/dataModel';
import {
  workflowNodeDefaultCondition,
  workflowNodeDescription,
  workflowNodeTitle,
  type AddableWorkflowNodeKind,
} from '../../../shared/workflows';
import type { WorkflowGraph } from '../workflow/workflowTypes';

const previewTimestamp = 1_783_468_900_000;

type InspectorValues = {
  name: string;
  description: string;
  conditionName?: string;
  conditionDetail?: string;
  allowedAppointmentServiceIds?: Id<'appointmentServices'>[];
};

function previewNodeId(sourceNodeId: Id<'workflowNodes'>, kind: AddableWorkflowNodeKind, count: number) {
  const sourceKey = sourceNodeId.replace('landing-workflow-node-', '');
  return `landing-preview-node-${sourceKey}-${kind}-${count}` as Id<'workflowNodes'>;
}

function previewEdgeId(sourceNodeId: Id<'workflowNodes'>, targetNodeId: Id<'workflowNodes'>) {
  return `landing-preview-edge-${sourceNodeId}-${targetNodeId}` as Id<'workflowEdges'>;
}

function childPosition(
  sourceNode: Doc<'workflowNodes'>,
  outgoingCount: number,
) {
  return {
    x: sourceNode.positionX + ((outgoingCount - 0.5) * 240),
    y: sourceNode.positionY + 220,
  };
}

export function addLandingPreviewWorkflowNode(
  graph: WorkflowGraph,
  sourceNodeId: Id<'workflowNodes'>,
  kind: AddableWorkflowNodeKind,
) {
  const sourceNode = graph.nodes.find((node) => node._id === sourceNodeId);
  if (!sourceNode) {
    throw new Error(`Unknown landing preview workflow source node: ${sourceNodeId}`);
  }

  const nodeId = previewNodeId(sourceNodeId, kind, graph.nodes.length + 1);
  const outgoingCount = graph.edges.filter((edge) => edge.sourceNodeId === sourceNodeId).length;
  const position = childPosition(sourceNode, outgoingCount);
  const now = previewTimestamp + graph.nodes.length + graph.edges.length;
  const defaultCondition = workflowNodeDefaultCondition(kind);
  const node: Doc<'workflowNodes'> = {
    _id: nodeId,
    _creationTime: now,
    workflowId: graph.workflow._id,
    kind,
    title: workflowNodeTitle(kind),
    description: workflowNodeDescription(kind),
    positionX: position.x,
    positionY: position.y,
    createdAt: now,
    updatedAt: now,
  };
  const edge: Doc<'workflowEdges'> = {
    _id: previewEdgeId(sourceNodeId, nodeId),
    _creationTime: now + 1,
    workflowId: graph.workflow._id,
    sourceNodeId,
    targetNodeId: nodeId,
    label: defaultCondition?.label,
    detail: defaultCondition?.detail,
    createdAt: now,
    updatedAt: now,
  };

  return {
    graph: {
      ...graph,
      nodes: [...graph.nodes, node],
      edges: [...graph.edges, edge],
    },
    nodeId,
  };
}

export function updateLandingPreviewWorkflowNode(
  graph: WorkflowGraph,
  nodeId: Id<'workflowNodes'>,
  values: InspectorValues,
) {
  const updatedAt = previewTimestamp + graph.nodes.length + graph.edges.length + 20;

  return {
    ...graph,
    nodes: graph.nodes.map((node) => {
      if (node._id !== nodeId) return node;

      return {
        ...node,
        title: values.name,
        description: values.description,
        allowedAppointmentServiceIds: values.allowedAppointmentServiceIds,
        updatedAt,
      };
    }),
    edges: graph.edges.map((edge) => {
      if (edge.targetNodeId !== nodeId) return edge;

      return {
        ...edge,
        label: values.conditionName,
        detail: values.conditionDetail,
        updatedAt,
      };
    }),
  };
}

export function moveLandingPreviewWorkflowNode(
  graph: WorkflowGraph,
  nodeId: Id<'workflowNodes'>,
  position: { x: number; y: number },
) {
  return {
    ...graph,
    nodes: graph.nodes.map((node) => (
      node._id === nodeId
        ? { ...node, positionX: position.x, positionY: position.y }
        : node
    )),
  };
}

export function connectLandingPreviewWorkflowNodes(
  graph: WorkflowGraph,
  sourceNodeId: Id<'workflowNodes'>,
  targetNodeId: Id<'workflowNodes'>,
) {
  if (
    graph.edges.some((edge) => (
      edge.sourceNodeId === sourceNodeId &&
      edge.targetNodeId === targetNodeId
    ))
  ) {
    return graph;
  }

  const now = previewTimestamp + graph.nodes.length + graph.edges.length + 40;
  const edge: Doc<'workflowEdges'> = {
    _id: previewEdgeId(sourceNodeId, targetNodeId),
    _creationTime: now,
    workflowId: graph.workflow._id,
    sourceNodeId,
    targetNodeId,
    createdAt: now,
    updatedAt: now,
  };

  return {
    ...graph,
    edges: [...graph.edges, edge],
  };
}

export function removeLandingPreviewWorkflowEdge(
  graph: WorkflowGraph,
  edgeId: Id<'workflowEdges'>,
) {
  return {
    ...graph,
    edges: graph.edges.filter((edge) => edge._id !== edgeId),
  };
}

export function removeLandingPreviewWorkflowNode(
  graph: WorkflowGraph,
  nodeId: Id<'workflowNodes'>,
) {
  return {
    ...graph,
    nodes: graph.nodes.filter((node) => node._id !== nodeId),
    edges: graph.edges.filter((edge) => (
      edge.sourceNodeId !== nodeId &&
      edge.targetNodeId !== nodeId
    )),
  };
}
