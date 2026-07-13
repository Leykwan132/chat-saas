import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

test('adds separate paginated history dialogs to both workflow cards', () => {
  const dialog = source('./WorkflowAutomationHistoryDialog.tsx');
  expect(dialog).toContain('api.workflowAutomationHistory.list');
  expect(dialog).toContain('initialNumItems: 25');
  expect(dialog).toContain('scheduled');
  expect(dialog).toContain('sent');
  expect(dialog).toContain('failed');
  expect(dialog).toContain('skipped');
  expect(dialog).toContain('cancelled');
  expect(source('./WorkflowReminderSetupNode.tsx')).toContain('<WorkflowAutomationHistoryDialog');
  expect(source('./WorkflowFollowupSetupNode.tsx')).toContain('<WorkflowAutomationHistoryDialog');
});
