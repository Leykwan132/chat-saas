import { expect, test } from 'vitest';
import * as workflowAutomations from '../../../shared/workflowAutomations';
import type {
  WorkflowReminderAutomationConfig,
  WorkflowReminderCustomTiming,
} from '../../../shared/workflowAutomations';

type ApplyCustomTiming = (
  reminder: WorkflowReminderAutomationConfig,
  option: WorkflowReminderCustomTiming,
) => WorkflowReminderAutomationConfig;

const applyCustomTiming = (
  workflowAutomations as typeof workflowAutomations & {
    applyWorkflowReminderCustomTiming?: ApplyCustomTiming;
  }
).applyWorkflowReminderCustomTiming;

test('commits a custom reminder option and selected ID atomically without duplicates', () => {
  expect(applyCustomTiming).toBeTypeOf('function');
  if (!applyCustomTiming) return;
  const reminder = workflowAutomations.createInitialWorkflowAutomationConfigs().reminder;
  const option: WorkflowReminderCustomTiming = {
    amount: 15,
    id: 'customReminderTiming:15:minutes',
    label: '15 minutes before',
    summaryLabel: '15 minutes before',
    unit: 'minutes',
  };

  const selected = applyCustomTiming(reminder, option);
  const selectedAgain = applyCustomTiming(selected, option);

  expect(selected.timingOptionIds).toEqual([option.id]);
  expect(selected.customTimingOptions).toEqual([option]);
  expect(selectedAgain.customTimingOptions).toEqual([option]);
});
