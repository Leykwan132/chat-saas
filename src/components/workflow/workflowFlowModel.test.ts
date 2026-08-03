import { Position } from '@xyflow/react';
import { expect, test } from 'vitest';
import type { Doc, Id } from '../../../convex/_generated/dataModel';
import { createInitialWorkflowAutomationConfigs } from '../../../shared/workflowAutomations';
import { WORKFLOW_CONDITION_EDGE_LABEL } from '../../../shared/workflows';
import {
  WORKFLOW_EDGE_Z_INDEX,
  workflowGraphToFlow,
} from './workflowFlowModel';
import {
  AUTOMATION_WORKFLOW_EDGE_PREFIX,
  type WorkflowFollowupGuidesFlowNode,
  type WorkflowFollowupSetupFlowNode,
  type WorkflowFollowupSummaryFlowNode,
  type WorkflowGraph,
  type WorkflowReminderSetupFlowNode,
  type WorkflowReminderSummaryFlowNode,
} from './workflowTypes';

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
    automations: createInitialWorkflowAutomationConfigs(),
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

test('workflowGraphToFlow disables direct node controls while mutating', () => {
  const flow = workflowGraphToFlow(
    workflowGraph(),
    () => {},
    () => {},
    undefined,
    'horizontal',
    true,
  );

  expect(
    flow.nodes
      .filter((node) => node.type === 'workflow')
      .every((node) => node.data.disabled === true),
  ).toBe(true);
});

test('workflowGraphToFlow defaults persisted nodes to standard density', () => {
  const flow = workflowGraphToFlow(workflowGraph(), () => {}, () => {});
  const persistedNodes = flow.nodes.filter((node) => node.type === 'workflow');

  expect(persistedNodes.every((node) => node.data.density === 'standard')).toBe(true);
});

test('workflowGraphToFlow carries persisted readiness and missing-item count into a standard node', () => {
  const graph = workflowGraph();
  graph.nodes[1] = {
    ...graph.nodes[1]!,
    isReady: false,
    readinessIssueCount: 2,
  } as Doc<'workflowNodes'>;

  const flow = workflowGraphToFlow(graph, () => {}, () => {});
  const sendTextNode = flow.nodes.find((node) => node.id === textNodeId);

  expect(sendTextNode?.data.isReady).toBe(false);
  expect(sendTextNode?.data.readinessIssueCount).toBe(2);
});

test('workflowGraphToFlow propagates compact density to persisted nodes only', () => {
  const flow = workflowGraphToFlow(
    workflowGraph(),
    () => {},
    () => {},
    undefined,
    'vertical',
    false,
    'compact',
  );
  const persistedNodes = flow.nodes.filter((node) => node.type === 'workflow');

  expect(persistedNodes.every((node) => node.data.density === 'compact')).toBe(true);
  expect(
    flow.nodes
      .filter((node) => node.type !== 'workflow')
      .every((node) => !('density' in node.data)),
  ).toBe(true);
});

test('workflowGraphToFlow uses orientation-specific handles for persisted workflow nodes', () => {
  const horizontalFlow = workflowGraphToFlow(
    workflowGraph(),
    () => {},
    () => {},
    undefined,
    'horizontal',
  );
  const verticalFlow = workflowGraphToFlow(
    workflowGraph(),
    () => {},
    () => {},
    undefined,
    'vertical',
  );
  const horizontalNodes = horizontalFlow.nodes.filter((node) => node.type === 'workflow');
  const verticalNodes = verticalFlow.nodes.filter((node) => node.type === 'workflow');

  expect(horizontalNodes).toHaveLength(2);
  expect(horizontalNodes.every((node) => node.sourcePosition === Position.Right)).toBe(true);
  expect(horizontalNodes.every((node) => node.targetPosition === Position.Left)).toBe(true);
  expect(horizontalNodes.every((node) => node.data.layoutOrientation === 'horizontal')).toBe(true);
  expect(verticalNodes).toHaveLength(2);
  expect(verticalNodes.every((node) => node.sourcePosition === Position.Bottom)).toBe(true);
  expect(verticalNodes.every((node) => node.targetPosition === Position.Top)).toBe(true);
  expect(verticalNodes.every((node) => node.data.layoutOrientation === 'vertical')).toBe(true);
});

test('workflowGraphToFlow anchors triggers horizontally after entry', () => {
  const flow = workflowGraphToFlow(
    workflowGraph(),
    () => {},
    () => {},
  );

  const remindersNode = flow.nodes.find((node): node is WorkflowReminderSetupFlowNode => (
    node.type === 'workflowReminderSetup'
  ));
  const remindersSummaryNode = flow.nodes.find((node): node is WorkflowReminderSummaryFlowNode => (
    node.type === 'workflowReminderSummary'
  ));
  const followupsNode = flow.nodes.find((node) => (
    node.id === 'workflow-automation-followups'
  ));
  const followupSetupNode = flow.nodes.find((node): node is WorkflowFollowupSetupFlowNode => (
    node.type === 'workflowFollowupSetup'
  ));
  const followupSummaryNode = flow.nodes.find((node): node is WorkflowFollowupSummaryFlowNode => (
    node.type === 'workflowFollowupSummary'
  ));
  const followupGuidesNode = flow.nodes.find((node): node is WorkflowFollowupGuidesFlowNode => (
    node.type === 'workflowFollowupGuides'
  ));
  const automationEdges = flow.edges.filter((edge) => (
    edge.id.startsWith(AUTOMATION_WORKFLOW_EDGE_PREFIX)
  ));
  const startNode = flow.nodes.find((node) => node.id === startNodeId);

  expect(remindersNode?.type).toBe('workflowReminderSetup');
  expect(remindersSummaryNode?.type).toBe('workflowReminderSummary');
  expect(remindersNode?.data.kind).toBe('reminders');
  expect(remindersSummaryNode?.data.kind).toBe('reminders');
  expect(startNode?.position.x).toBeLessThan(remindersNode?.position.x ?? 0);
  expect(startNode?.position.x).toBeLessThan(remindersSummaryNode?.position.x ?? 0);
  expect(startNode?.position.x).toBeLessThan(followupSetupNode?.position.x ?? 0);
  expect(followupsNode?.type).toBe('workflowFollowupSetup');
  expect(followupSetupNode?.type).toBe('workflowFollowupSetup');
  expect(followupSummaryNode?.type).toBe('workflowFollowupSummary');
  expect(followupGuidesNode?.type).toBe('workflowFollowupGuides');
  expect(remindersNode?.parentId).toBeUndefined();
  expect(remindersSummaryNode?.parentId).toBeUndefined();
  expect(followupSummaryNode?.parentId).toBeUndefined();
  expect(followupGuidesNode?.parentId).toBeUndefined();
  expect(followupSetupNode?.parentId).toBeUndefined();
  expect(remindersNode?.draggable).toBe(true);
  expect(remindersSummaryNode?.draggable).toBe(false);
  expect(followupSummaryNode?.draggable).toBe(false);
  expect(followupGuidesNode?.draggable).toBe(false);
  expect(followupSetupNode?.draggable).toBe(true);
  expect(remindersNode?.position).toEqual({ x: 400, y: -24 });
  expect(remindersSummaryNode?.position).toEqual({ x: 840, y: -24 });
  expect(followupSetupNode?.position).toEqual({ x: 400, y: -24 });
  expect(followupSummaryNode?.position).toEqual({ x: 860, y: -24 });
  expect(followupGuidesNode?.position).toEqual({ x: 860, y: 384 });
  expect(remindersNode?.data.title).toBe('Reminders');
  expect(remindersSummaryNode?.data.title).toBe('Summary');
  expect(followupSummaryNode?.data.title).toBe('Summary');
  expect(followupGuidesNode?.data.kind).toBe('followups');
  expect(followupSetupNode?.data.title).toBe('Follow-up');
  expect(automationEdges).toHaveLength(0);
  expect((remindersNode?.position.x ?? 0) - (startNode?.position.x ?? 0)).toBe(400);
  expect((followupSetupNode?.position.x ?? 0) - (startNode?.position.x ?? 0)).toBe(400);
});
