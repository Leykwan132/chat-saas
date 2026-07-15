import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

test('offers one Custom Start after action with Reminder-style units', () => {
  const field = source('./WorkflowFollowupStartAfterField.tsx');

  expect(field).toContain("const customStartAfterValue = 'customFollowupStartAfter';");
  expect(field).toContain('<DialogTitle>Custom start delay</DialogTitle>');
  expect(field).toContain('workflowFollowupStartAfterUnitOptions.map');
  expect(field).toContain('setFollowupStartAfterOption(option);');
  expect(field).toContain('getWorkflowFollowupStartAfterParts(selectedOptionId)');
  expect(field.match(/>Custom</g)).toHaveLength(1);
});

test('uses a dedicated atomic state action for preset and custom delays', () => {
  const context = source('./workflowAutomationContext.ts');
  const state = source('./workflowAutomationState.tsx');
  const field = source('./WorkflowFollowupStartAfterField.tsx');

  expect(context).toContain('setFollowupStartAfterOption: (');
  expect(state).toContain('applyWorkflowFollowupStartAfter(configs.followUp, option)');
  expect(field).toContain('setFollowupStartAfterOption(startAfterOption);');
  expect(field).not.toContain("setSelectedOptionId(option.id)");
});

test('explains the no-reply condition in the summary', () => {
  const options = source('./workflowFollowupOptions.tsx');
  const summaryNode = source('./WorkflowFollowupSummaryNode.tsx');

  expect(options).not.toContain('after no reply');
  expect(summaryNode).toContain("if the customer didn't reply after{' '}");
  expect(summaryNode).toContain("{', and reattempts every '}");
  expect(summaryNode).not.toContain("}, starting{' '}");
  expect(summaryNode).not.toContain('after no reply');
});

test('renders the dedicated Start after field in compact and expanded schedules', () => {
  const scheduleFields = source('./WorkflowFollowupScheduleFields.tsx');

  expect(scheduleFields).toContain('<WorkflowFollowupStartAfterField compact />');
  expect(scheduleFields).toContain('<WorkflowFollowupStartAfterField />');
  expect(scheduleFields).not.toContain('<FollowupScheduleSelect stepKey="startAfter"');
});
