import { expect, test } from 'vitest';
import type { Id } from '../../../convex/_generated/dataModel';
import { getWorkflowLayoutNodeMeasurements } from './workflowLayoutMeasurements';
import type {
  WorkflowAutomationFlowNode,
  WorkflowPersistedFlowNode,
} from './workflowTypes';

const nodeId = 'message' as Id<'workflowNodes'>;

function persistedNode(
  id: Id<'workflowNodes'>,
  measured?: { width?: number; height?: number },
): WorkflowPersistedFlowNode {
  return {
    id,
    type: 'workflow',
    position: { x: 0, y: 0 },
    measured,
    data: {
      nodeId: id,
      kind: 'sendText',
      title: 'Send message',
      isReady: true,
      readinessIssueCount: 0,
      layoutOrientation: 'horizontal',
      disabled: false,
      onAddNode: () => {},
      onRemoveNode: () => {},
    },
  };
}

function automationNode(): WorkflowAutomationFlowNode {
  return {
    id: 'automation',
    type: 'workflowAutomation',
    position: { x: 0, y: 0 },
    measured: { width: 420, height: 240 },
    data: { kind: 'reminders', title: 'Reminders' },
  };
}

test('keeps only valid rendered dimensions for persisted workflow nodes', () => {
  const invalidNodeId = 'invalid' as Id<'workflowNodes'>;
  const measurements = getWorkflowLayoutNodeMeasurements([
    persistedNode(nodeId, { width: 340, height: 218 }),
    persistedNode(invalidNodeId, { width: 0, height: Number.NaN }),
    automationNode(),
  ]);

  expect(measurements.get(nodeId)).toEqual({ width: 340, height: 218 });
  expect(measurements.has(invalidNodeId)).toBe(false);
  expect(measurements.has('automation' as Id<'workflowNodes'>)).toBe(false);
});
