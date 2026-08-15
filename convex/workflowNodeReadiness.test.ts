import { expect, test } from 'vitest';
import type { Doc, Id } from './_generated/dataModel';
import {
  getWorkflowNodeReadinessIssueCount,
  getWorkflowNodeReadiness,
  type WorkflowNodeReadinessFacts,
} from './workflowNodeReadiness';

const mediaNodeId = 'media-node' as Id<'workflowNodes'>;
const serviceId = 'service-id' as Id<'appointmentServices'>;

function workflowNode(
  kind: Doc<'workflowNodes'>['kind'],
  values: Partial<Doc<'workflowNodes'>> = {},
) {
  return {
    _id: 'workflow-node' as Id<'workflowNodes'>,
    workflowId: 'workflow' as Id<'workflows'>,
    kind,
    title: 'Workflow node',
    positionX: 0,
    positionY: 0,
    createdAt: 0,
    updatedAt: 0,
    ...values,
  } as Doc<'workflowNodes'>;
}

function readinessFacts(
  values: Partial<WorkflowNodeReadinessFacts> = {},
): WorkflowNodeReadinessFacts {
  return {
    readyMediaNodeIds: new Set(),
    activeAppointmentServiceIds: new Set(),
    configuredConditionNodeIds: new Set([
      'workflow-node' as Id<'workflowNodes'>,
      mediaNodeId,
    ]),
    ...values,
  };
}

test('requires a configured message before a Send message node is ready', () => {
  expect(getWorkflowNodeReadiness(
    workflowNode('sendText', {
      description: 'Write the exact message the AI should send when this workflow condition matches.',
    }),
    readinessFacts(),
  )).toBe(false);
  expect(getWorkflowNodeReadiness(
    workflowNode('sendText', { description: 'Thanks for contacting us.' }),
    readinessFacts(),
  )).toBe(true);
});

test('requires a ready asset before a media node is ready', () => {
  const mediaNode = workflowNode('sendImage', { _id: mediaNodeId });

  expect(getWorkflowNodeReadiness(mediaNode, readinessFacts())).toBe(false);
  expect(getWorkflowNodeReadiness(mediaNode, readinessFacts({
    readyMediaNodeIds: new Set([mediaNodeId]),
  }))).toBe(true);
});

test('requires an active service before a booking node is ready', () => {
  const bookingNode = workflowNode('bookAppointment', {
    allowedAppointmentServiceIds: [serviceId],
  });

  expect(getWorkflowNodeReadiness(bookingNode, readinessFacts({
    activeAppointmentServiceIds: new Set([serviceId]),
  }))).toBe(true);
});

test('counts every missing booking requirement', () => {
  expect(getWorkflowNodeReadinessIssueCount(
    workflowNode('bookAppointment', {
      allowedAppointmentServiceIds: [serviceId],
    }),
    readinessFacts(),
  )).toBe(1);
});

test('marks configuration-free workflow nodes ready', () => {
  expect(getWorkflowNodeReadiness(
    workflowNode('humanEscalation'),
    readinessFacts(),
  )).toBe(true);
  expect(getWorkflowNodeReadinessIssueCount(
    workflowNode('humanEscalation'),
    readinessFacts({ configuredConditionNodeIds: new Set() }),
  )).toBe(0);
});

test('keeps Human escalation ready without an incoming condition detail', () => {
  const node = workflowNode('humanEscalation');

  expect(getWorkflowNodeReadiness(
    node,
    Object.assign(readinessFacts(), { configuredConditionNodeIds: new Set() }),
  )).toBe(true);
  expect(getWorkflowNodeReadiness(
    node,
    Object.assign(readinessFacts(), {
      configuredConditionNodeIds: new Set([node._id]),
    }),
  )).toBe(true);
  expect(getWorkflowNodeReadiness(
    workflowNode('start'),
    Object.assign(readinessFacts(), { configuredConditionNodeIds: new Set() }),
  )).toBe(true);
});
