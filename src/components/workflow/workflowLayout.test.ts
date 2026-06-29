import { expect, test } from 'vitest';
import type { Doc, Id } from '../../../convex/_generated/dataModel';
import type { WorkflowNodeKind } from '../../../shared/workflows';
import {
  getWorkflowCleanupPositions,
  getWorkflowCleanupNodeSize,
  getWorkflowLayoutNodeSize,
} from './workflowLayout';
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

test('cleanup layout separates sibling nodes on the same row', () => {
  const start = workflowNode('start', 'start', 'Message enters');
  const updateState = workflowNode(
    'update-state',
    'updateState',
    'Update state',
    'Prepare state changes for a future workflow action.',
  );
  const firstSay = workflowNode(
    'say-first',
    'say',
    'Say',
    'Send a message in the conversation.',
  );
  const subagent = workflowNode(
    'subagent',
    'subagent',
    'Subagent',
    'Add a prompt for this workflow step.',
  );
  const secondSay = workflowNode(
    'say-second',
    'say',
    'Say',
    'Send a message in the conversation.',
  );
  const end = workflowNode('end', 'end', 'End');
  const nodes = [start, updateState, firstSay, subagent, secondSay, end];

  const positions = new Map(
    getWorkflowCleanupPositions(workflowGraph(nodes, [
      workflowEdge('start-update', start._id, updateState._id),
      workflowEdge('start-say', start._id, firstSay._id),
      workflowEdge('say-subagent', firstSay._id, subagent._id),
      workflowEdge('subagent-say', subagent._id, secondSay._id),
      workflowEdge('say-end', secondSay._id, end._id),
    ])).map((item) => [item.nodeId, item.position]),
  );

  const updatePosition = positions.get(updateState._id);
  const sayPosition = positions.get(firstSay._id);
  expect(updatePosition).toBeDefined();
  expect(sayPosition).toBeDefined();
  expect(Math.abs(updatePosition!.y - sayPosition!.y)).toBeLessThan(1);

  const positionedNodes = nodes.map((node) => ({
    node,
    position: positions.get(node._id)!,
    size: getWorkflowCleanupNodeSize(node),
  }));

  for (let i = 0; i < positionedNodes.length; i += 1) {
    for (let j = i + 1; j < positionedNodes.length; j += 1) {
      const a = positionedNodes[i];
      const b = positionedNodes[j];
      const verticallyOverlaps = (
        a.position.y < b.position.y + b.size.height &&
        b.position.y < a.position.y + a.size.height
      );
      const horizontallyOverlaps = (
        a.position.x < b.position.x + b.size.width &&
        b.position.x < a.position.x + a.size.width
      );

      if (verticallyOverlaps) {
        expect(horizontallyOverlaps).toBe(false);
      }
    }
  }
});

test('layout caps node width for long titles', () => {
  const node = workflowNode(
    'long-title',
    'say',
    'A very long custom action name that should not make the workflow node keep growing across the canvas',
  );

  expect(getWorkflowLayoutNodeSize(node).width).toBe(300);
});
