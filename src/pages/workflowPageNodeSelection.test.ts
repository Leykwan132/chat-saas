import { expect, test } from 'vitest';
import type { Doc, Id } from '../../convex/_generated/dataModel';
import { createInitialWorkflowAutomationConfigs } from '../../shared/workflowAutomations';
import { findNewWorkflowNodeId } from './workflowPageNodeSelection';
import type { WorkflowGraph } from '@/components/workflow/workflowTypes';

const workflowId = 'workflow' as Id<'workflows'>;
const agentId = 'agent' as Id<'agents'>;
const startNodeId = 'start' as Id<'workflowNodes'>;
const existingNodeId = 'existing' as Id<'workflowNodes'>;
const newNodeId = 'new-node' as Id<'workflowNodes'>;

function workflowNode(
  id: Id<'workflowNodes'>,
  kind: Doc<'workflowNodes'>['kind'],
  creationTime: number,
) {
  return {
    _id: id,
    _creationTime: creationTime,
    workflowId,
    kind,
    title: kind,
    positionX: 0,
    positionY: 0,
    createdAt: creationTime,
    updatedAt: creationTime,
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
    automations: createInitialWorkflowAutomationConfigs(),
    nodes,
    edges,
  };
}

test('findNewWorkflowNodeId returns the newly added child for the clicked source', () => {
  const previousGraph = workflowGraph(
    [
      workflowNode(startNodeId, 'start', 1),
      workflowNode(existingNodeId, 'sendFile', 2),
    ],
    [workflowEdge('edge-existing', startNodeId, existingNodeId)],
  );
  const nextGraph = workflowGraph(
    [
      ...previousGraph.nodes,
      workflowNode(newNodeId, 'sendFile', 3),
    ],
    [
      ...previousGraph.edges,
      workflowEdge('edge-new', startNodeId, newNodeId),
    ],
  );

  expect(
    findNewWorkflowNodeId(previousGraph, nextGraph, startNodeId, 'sendFile'),
  ).toBe(newNodeId);
});
