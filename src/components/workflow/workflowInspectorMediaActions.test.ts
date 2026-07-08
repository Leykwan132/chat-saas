import { expect, test } from 'vitest';
import { getWorkflowInspectorBehavior } from './workflowInspectorBehavior';

test('send photo and file nodes replace the goal field with media to send', () => {
  expect(getWorkflowInspectorBehavior('sendImage', true)).toMatchObject({
    hasGoalField: false,
    saveRequiresDescription: false,
    hasMediaSection: true,
    mediaActionTitle: 'Your Photos/Videos',
  });

  expect(getWorkflowInspectorBehavior('sendFile', true)).toMatchObject({
    hasGoalField: false,
    saveRequiresDescription: false,
    hasMediaSection: true,
    mediaActionTitle: 'Files to send',
  });
});

test('non-media action nodes still use their configured text or goal field', () => {
  expect(getWorkflowInspectorBehavior('sendText', false)).toMatchObject({
    hasGoalField: true,
    saveRequiresDescription: true,
    goalLabel: 'Message',
  });

  expect(getWorkflowInspectorBehavior('bookAppointment', false)).toMatchObject({
    hasGoalField: true,
    saveRequiresDescription: true,
    goalLabel: 'Goal',
  });
});
