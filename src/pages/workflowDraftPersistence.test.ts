import { expect, test } from 'vitest';
import type { Doc, Id } from '../../convex/_generated/dataModel';
import type { WorkflowGraph } from '@/components/workflow/workflowTypes';
import { toWorkflowDraftSavePayload } from './workflowDraftPersistence';

test('maps persisted and draft nodes to one atomic save payload', () => {
  const workflowId = 'workflow' as Id<'workflows'>;
  const graph = {
    workflow: { _id: workflowId, updatedAt: 42, layoutOrientation: 'vertical' } as Doc<'workflows'>,
    nodes: [
      { _id: 'persisted' as Id<'workflowNodes'>, workflowId, kind: 'start', title: 'Start', positionX: 0, positionY: 0 } as Doc<'workflowNodes'>,
      { _id: 'draft-node:new' as Id<'workflowNodes'>, workflowId, kind: 'sendFile', title: 'File', positionX: 10, positionY: 20 } as Doc<'workflowNodes'>,
    ],
    edges: [{ _id: 'draft-edge:new' as Id<'workflowEdges'>, workflowId, sourceNodeId: 'persisted' as Id<'workflowNodes'>, targetNodeId: 'draft-node:new' as Id<'workflowNodes'> } as Doc<'workflowEdges'>],
    automations: {
      reminder: {
        enabled: true,
        activationScope: 'currentAndFuture',
        revision: 2,
        selections: {},
        timingOptionIds: ['threeHoursBeforeAppointment'],
        customTimingOptions: [],
        template: {
          key: 'appointment_reminder\ten_US',
          name: 'appointment_reminder',
          language: 'en_US',
          category: 'UTILITY',
          components: [],
        },
      },
      followUp: {
        enabled: false,
        revision: 4,
        selections: {},
        audienceFilters: ['lead:Hot'],
        startAfterHours: 24,
        intervalHours: 24,
        maxAttempts: 3,
        messageStrategy: 'same',
        attemptTemplates: [],
      },
    },
  } satisfies WorkflowGraph;
  expect(toWorkflowDraftSavePayload(graph)).toEqual({
    baselineUpdatedAt: 42,
    layoutOrientation: 'vertical',
    automations: graph.automations,
    nodes: [
      expect.objectContaining({ clientId: 'persisted', persistedNodeId: 'persisted' }),
      expect.objectContaining({ clientId: 'draft-node:new', persistedNodeId: undefined }),
    ],
    edges: [{ sourceClientId: 'persisted', targetClientId: 'draft-node:new', label: undefined, detail: undefined }],
  });
});
