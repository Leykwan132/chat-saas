import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

test('renders a subtle labeled card for Reminder and Follow-up messages', () => {
  const component = source('./InboxWorkflowAutomationMessage.tsx');
  expect(component).toContain('border-primary/20');
  expect(component).toContain('bg-primary/5');
  expect(component).toContain('BellRing');
  expect(component).toContain('Clock3');
  expect(component).toContain("'Reminder'");
  expect(component).toContain("'Follow-up'");
});

test('routes workflow messages through the dedicated card', () => {
  const thread = source('./InboxThreadMessages.tsx');
  expect(thread).toContain('message.workflowAutomationSource');
  expect(thread).toContain('<InboxWorkflowAutomationMessage');
});
