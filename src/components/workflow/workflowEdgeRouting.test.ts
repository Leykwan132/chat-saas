import { expect, test } from 'vitest';
import type { Doc, Id } from '../../../convex/_generated/dataModel';
import type { WorkflowNodeKind } from '../../../shared/workflows';
import {
  getWorkflowCleanupPositions,
  getWorkflowLayoutNodeSize,
} from './workflowLayout';
import { getWorkflowEdgeRoutes } from './workflowEdgeRouting';
import type { WorkflowGraph } from './workflowTypes';

const workflowId = 'workflow' as Id<'workflows'>;
const agentId = 'agent' as Id<'agents'>;

function workflowNode(
  id: string,
  kind: WorkflowNodeKind,
  title: string,
  description?: string,
) {
  return {
    _id: id as Id<'workflowNodes'>,
    _creationTime: 0,
    workflowId,
    kind,
    title,
    description,
    positionX: 0,
    positionY: 0,
    createdAt: 0,
    updatedAt: 0,
  } as Doc<'workflowNodes'>;
}

function workflowEdge(
  id: string,
  sourceNodeId: Id<'workflowNodes'>,
  targetNodeId: Id<'workflowNodes'>,
) {
  return {
    _id: id as Id<'workflowEdges'>,
    _creationTime: 0,
    workflowId,
    sourceNodeId,
    targetNodeId,
    createdAt: 0,
    updatedAt: 0,
  } as Doc<'workflowEdges'>;
}

function workflowGraph(
  nodes: Doc<'workflowNodes'>[],
  edges: Doc<'workflowEdges'>[],
): WorkflowGraph {
  return {
    workflow: {
      _id: workflowId,
      _creationTime: 0,
      agentId,
      orgId: '',
      userId: '',
      name: 'Workflow',
      createdAt: 0,
      updatedAt: 0,
    } as Doc<'workflows'>,
    nodes,
    edges,
  };
}

function applyCleanupPositions(graph: WorkflowGraph): WorkflowGraph {
  const cleanupPositions = new Map(
    getWorkflowCleanupPositions(graph, 'horizontal').map((item) => [item.nodeId, item.position]),
  );

  return {
    ...graph,
    nodes: graph.nodes.map((node) => {
      const position = cleanupPositions.get(node._id);
      return {
        ...node,
        positionX: position?.x ?? node.positionX,
        positionY: position?.y ?? node.positionY,
      };
    }),
  };
}

test('edge routing detours horizontal cleanup edges around middle nodes', () => {
  const start = workflowNode('start', 'start', 'Message enters');
  const sendText = workflowNode(
    'send-text',
    'sendText',
    'Send text',
    'Send a text message in the conversation.',
  );
  const end = workflowNode('end', 'end', 'End');
  const directEdge = workflowEdge('start-end', start._id, end._id);
  const graph = workflowGraph(
    [start, sendText, end],
    [
      workflowEdge('start-send', start._id, sendText._id),
      directEdge,
      workflowEdge('send-end', sendText._id, end._id),
    ],
  );
  const positionedGraph = applyCleanupPositions(graph);
  const positionedSendText = positionedGraph.nodes.find((node) => (
    node._id === sendText._id
  ));
  const route = getWorkflowEdgeRoutes(positionedGraph, 'horizontal').get(directEdge._id);
  const verticalRoute = getWorkflowEdgeRoutes(positionedGraph, 'vertical').get(directEdge._id);

  expect(positionedSendText).toBeDefined();
  expect(verticalRoute).toBeUndefined();
  expect(route).toBeDefined();

  const sendTextSize = getWorkflowLayoutNodeSize(positionedSendText!);
  const detourY = route![1].y;
  expect(
    detourY < positionedSendText!.positionY ||
      detourY > positionedSendText!.positionY + sendTextSize.height,
  ).toBe(true);
});
