import { expect, test } from 'vitest';
import type { Doc, Id } from '../../../convex/_generated/dataModel';
import { WORKFLOW_CONDITION_EDGE_LABEL } from '../../../shared/workflows';
import {
  WORKFLOW_EDGE_Z_INDEX,
  workflowGraphToFlow,
} from './workflowFlowModel';
import type { WorkflowGraph } from './workflowTypes';

const workflowId = 'workflow' as Id<'workflows'>;
const agentId = 'agent' as Id<'agents'>;
const startNodeId = 'start' as Id<'workflowNodes'>;
const textNodeId = 'text' as Id<'workflowNodes'>;

function workflowNode(
  id: Id<'workflowNodes'>,
  kind: Doc<'workflowNodes'>['kind'],
  title: string,
) {
  return {
    _id: id,
    _creationTime: 0,
    workflowId,
    kind,
    title,
    positionX: 0,
    positionY: 0,
    createdAt: 0,
    updatedAt: 0,
  } as Doc<'workflowNodes'>;
}

function workflowEdge(label?: string, detail?: string) {
  return {
    _id: 'edge' as Id<'workflowEdges'>,
    _creationTime: 0,
    workflowId,
    sourceNodeId: startNodeId,
    targetNodeId: textNodeId,
    label,
    detail,
    createdAt: 0,
    updatedAt: 0,
  } as Doc<'workflowEdges'>;
}

function workflowGraph(edgeLabel?: string, edgeDetail?: string): WorkflowGraph {
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
    nodes: [
      workflowNode(startNodeId, 'start', 'Message enters'),
      workflowNode(textNodeId, 'sendText', 'Send text'),
    ],
    edges: [workflowEdge(edgeLabel, edgeDetail)],
  };
}

test('workflowGraphToFlow hides empty and legacy condition labels', () => {
  const withoutLabel = workflowGraphToFlow(
    workflowGraph(),
    () => {},
    () => {},
  );
  const withLegacyLabel = workflowGraphToFlow(
    workflowGraph(WORKFLOW_CONDITION_EDGE_LABEL),
    () => {},
    () => {},
  );

  expect(withoutLabel.edges[0].label).toBeUndefined();
  expect(withLegacyLabel.edges[0].label).toBeUndefined();
});

test('workflowGraphToFlow keeps real condition labels', () => {
  const flow = workflowGraphToFlow(
    workflowGraph('Customer asks about billing', 'Long internal condition detail'),
    () => {},
    () => {},
  );

  expect(flow.edges[0].label).toBe('Customer asks about billing');
});

test('workflowGraphToFlow keeps nodes above edges', () => {
  const flow = workflowGraphToFlow(
    workflowGraph(),
    () => {},
    () => {},
  );

  expect(flow.nodes.every((node) => (
    (node.zIndex ?? 0) > WORKFLOW_EDGE_Z_INDEX
  ))).toBe(true);
});
