import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

test('adds separate paginated history dialogs to both workflow cards', () => {
  const dialog = source('./WorkflowAutomationHistoryDialog.tsx');
  const reminderSetup = source('./WorkflowReminderSetupNode.tsx');
  const followupSetup = source('./WorkflowFollowupSetupNode.tsx');
  const reminderSummary = source('./WorkflowReminderSummaryNode.tsx');
  const followupSummary = source('./WorkflowFollowupSummaryNode.tsx');
  expect(dialog).toContain('api.workflowAutomationHistory.list');
  expect(dialog).toContain('initialNumItems: 25');
  expect(dialog).toContain('scheduled');
  expect(dialog).toContain('sent');
  expect(dialog).toContain('failed');
  expect(dialog).toContain('skipped');
  expect(dialog).toContain('cancelled');
  expect(reminderSetup).not.toContain('<WorkflowAutomationHistoryDialog');
  expect(followupSetup).not.toContain('<WorkflowAutomationHistoryDialog');
  expect(reminderSummary).toContain('<WorkflowAutomationHistoryDialog');
  expect(reminderSummary).toContain('automationKind="reminder"');
  expect(followupSummary).toContain('<WorkflowAutomationHistoryDialog');
  expect(followupSummary).toContain('automationKind="followUp"');
  expect(reminderSummary).toContain('className="flex items-center justify-between gap-3"');
  expect(followupSummary).toContain('className="flex items-center justify-between gap-3"');
  expect(dialog).toContain('variant="outline"');
  expect(dialog).toContain('size="sm"');
  expect(dialog).toContain('<History data-icon="inline-start" />');
  expect(dialog).toContain('<DialogContent className="sm:max-w-3xl rounded-2xl">');
  expect(dialog).toContain('<Empty className="rounded-xl border bg-muted/60 px-8 py-10">');
  expect(dialog).toContain('className="flex flex-col gap-2 rounded-xl border p-4"');
});
