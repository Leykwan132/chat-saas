import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

test('records outbound hooks and inbound cancellation at message persistence boundaries', () => {
  expect(source('./chat/threads.ts')).toContain('handleWorkflowAutomationMessageActivity');
  expect(source('./chat/inbox.ts')).toContain('handleWorkflowFollowUpOutbound');
  expect(source('./whatsappSend.ts')).toContain('handleWorkflowFollowUpOutbound');
});

test('marks automated follow-ups with structured source metadata', () => {
  expect(source('./followUpPool.ts')).toContain("workflowAutomationSource: 'workflowFollowUp'");
  expect(source('./workflowAutomationMessageRecord.ts')).toContain('workflowAutomationSource: args.source');
  expect(source('./workflowReminderWorker.ts')).toContain("source: 'workflowReminder'");
});
