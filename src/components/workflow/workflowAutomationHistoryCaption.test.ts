import { expect, test } from 'vitest';
import { formatWorkflowAutomationHistoryCaption } from './workflowAutomationHistoryCaption';

test.each([
  ['reminder', 1, '1 reminder sent so far.'],
  ['reminder', 25, '25 reminders sent so far.'],
  ['followUp', 1, '1 follow-up sent so far.'],
  ['followUp', 8, '8 follow-ups sent so far.'],
] as const)(
  'formats the exact all-time %s sent count',
  (automationKind, sentCount, expected) => {
    expect(formatWorkflowAutomationHistoryCaption({ automationKind, sentCount }))
      .toBe(expected);
  },
);
