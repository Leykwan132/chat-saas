import { expect, test } from 'vitest';
import type { Doc, Id } from '../../../convex/_generated/dataModel';
import type { WorkflowGraph } from './workflowTypes';
import {
  addDraftNodeAfter,
  createWorkflowDraft,
  removeDraftNode,
  updateDraftNode,
  workflowDraftsEqual,
} from './workflowDraftModel';

function graph(): WorkflowGraph {
  const workflowId = 'workflow' as Id<'workflows'>;
  const startId = 'start' as Id<'workflowNodes'>;
  const nodeId = 'message' as Id<'workflowNodes'>;
  return {
    workflow: { _id: workflowId, _creationTime: 1, agentId: 'agent', orgId: 'org', userId: 'user', name: 'Flow', createdAt: 1, updatedAt: 1 } as Doc<'workflows'>,
    nodes: [
      { _id: startId, _creationTime: 1, workflowId, kind: 'start', title: 'Message enters', positionX: 0, positionY: 0, createdAt: 1, updatedAt: 1 },
      { _id: nodeId, _creationTime: 2, workflowId, kind: 'sendText', title: 'Send message', positionX: 260, positionY: 0, createdAt: 2, updatedAt: 2 },
    ],
    edges: [{ _id: 'edge' as Id<'workflowEdges'>, _creationTime: 3, workflowId, sourceNodeId: startId, targetNodeId: nodeId, createdAt: 3, updatedAt: 3 }],
    automations: {
      reminder: {
        enabled: false,
        revision: 0,
        selections: {},
        timingOptionIds: ['threeHoursBeforeAppointment'],
        customTimingOptions: [],
      },
      followUp: {
        enabled: false,
        revision: 0,
        selections: {},
        audienceFilters: ['lead:Hot', 'lead:Warm'],
        startAfterMinutes: 1440,
        intervalHours: 24,
        maxAttempts: 3,
        messageStrategy: 'same',
        attemptTemplates: [],
      },
    },
  };
}

test('draft equality ignores timestamps and ordering', () => {
  const first = graph();
  const second = createWorkflowDraft(first);
  second.nodes.reverse();
  second.workflow.updatedAt = 99;
  second.nodes[0].updatedAt = 99;
  expect(workflowDraftsEqual(first, second)).toBe(true);
});

test('draft operations are immutable and removal bridges the graph', () => {
  const original = graph();
  const addition = addDraftNodeAfter(original, original.nodes[1]._id, 'bookAppointment');
  const newNode = addition.graph.nodes.find((node) => node.kind === 'bookAppointment');
  expect(addition.nodeId).toBe(newNode?._id);
  expect(newNode?._id).toMatch(/^draft-node:/);
  expect(original.nodes).toHaveLength(2);
  const updated = updateDraftNode(addition.graph, original.nodes[1]._id, { title: 'Welcome' });
  expect(updated.nodes.find((node) => node._id === original.nodes[1]._id)?.title).toBe('Welcome');
  const removed = removeDraftNode(updated, original.nodes[1]._id);
  expect(removed.edges.some((edge) => edge.sourceNodeId === original.nodes[0]._id && edge.targetNodeId === newNode?._id)).toBe(true);
});

test('draft equality includes reminder and follow-up configuration', () => {
  const first = graph();
  const second = createWorkflowDraft(first);
  second.automations.reminder.enabled = true;
  second.automations.reminder.activationScope = 'futureOnly';
  expect(workflowDraftsEqual(first, second)).toBe(false);
});
