import { expect, test } from 'vitest';
import { getWorkflowFollowUpWakeDecision } from './workflowFollowUpWorker';

test('reschedules an early wake and sends only once the updated due time arrives', () => {
  expect(getWorkflowFollowUpWakeDecision({ now: 1_000, dueAt: 2_000 })).toEqual({
    kind: 'reschedule',
    dueAt: 2_000,
  });
  expect(getWorkflowFollowUpWakeDecision({ now: 2_000, dueAt: 2_000 })).toEqual({
    kind: 'send',
  });
});
