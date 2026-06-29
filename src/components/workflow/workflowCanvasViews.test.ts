import { expect, test } from 'vitest';
import type { WorkflowFlowEdge, WorkflowFlowNode } from './workflowTypes';
import { getWorkflowCanvasViewElements } from './workflowCanvasViews';

const nodes = [
  { id: 'start', type: 'workflow' },
  { id: 'action', type: 'workflow' },
  {
    id: 'workflow-automation-reminders',
    type: 'workflowReminderSetup',
    data: { kind: 'reminders' },
  },
  {
    id: 'workflow-automation-reminders-summary',
    type: 'workflowReminderSummary',
    data: { kind: 'reminders' },
  },
  {
    id: 'workflow-automation-followups',
    type: 'workflowFollowupSetup',
    data: { kind: 'followups' },
  },
  {
    id: 'workflow-automation-followups-summary',
    type: 'workflowFollowupSummary',
    data: { kind: 'followups' },
  },
  {
    id: 'workflow-automation-followups-guides',
    type: 'workflowFollowupGuides',
    data: { kind: 'followups' },
  },
] as WorkflowFlowNode[];

const edges = [
  { id: 'edge', source: 'start', target: 'action', type: 'workflow' },
] as WorkflowFlowEdge[];

test('message handling view keeps only persisted workflow nodes and edges', () => {
  const elements = getWorkflowCanvasViewElements(nodes, edges, 'messageHandling');

  expect(elements.nodes.map((node) => node.id)).toEqual(['start', 'action']);
  expect(elements.edges.map((edge) => edge.id)).toEqual(['edge']);
});

test('automation views keep only their own flow', () => {
  const reminders = getWorkflowCanvasViewElements(nodes, edges, 'reminders');
  const followups = getWorkflowCanvasViewElements(nodes, edges, 'followups');

  expect(reminders.nodes.map((node) => node.id)).toEqual([
    'workflow-automation-reminders',
    'workflow-automation-reminders-summary',
  ]);
  expect(reminders.edges.map((edge) => edge.id)).toEqual([]);
  expect(followups.nodes.map((node) => node.id)).toEqual([
    'workflow-automation-followups',
    'workflow-automation-followups-summary',
    'workflow-automation-followups-guides',
  ]);
  expect(followups.edges.map((edge) => edge.id)).toEqual([]);
});
