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

test('text actions still use their configured message field', () => {
  expect(getWorkflowInspectorBehavior('sendText', false)).toMatchObject({
    hasGoalField: true,
    saveRequiresDescription: true,
    goalLabel: 'Message',
  });
});

test('book appointment replaces the goal field with services', () => {
  expect(getWorkflowInspectorBehavior('bookAppointment', false)).toMatchObject({
    hasGoalField: false,
    saveRequiresDescription: false,
  });
});
