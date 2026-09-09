import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

test('renders a subtle labeled card for automated messages', () => {
  const component = source('./InboxWorkflowAutomationMessage.tsx');
  expect(component).toContain('border-primary/20');
  expect(component).toContain('bg-primary/5');
  expect(component).toContain('BellRing');
  expect(component).toContain('Clock3');
  expect(component).toContain("'Reminder'");
  expect(component).toContain("'Follow-up'");
  expect(component).toContain("'Automation message sent'");
});

test('keeps comment automation messages in the regular bubble and labels their sender row', () => {
  const thread = source('./InboxThreadMessages.tsx');
  expect(thread).toContain("message.workflowAutomationSource === 'commentAutomation'");
  expect(thread).toContain('Comment-to-inbox message');
  expect(thread).toContain('<Send className="size-3" />');
  expect(thread).toContain('border border-primary/20 bg-primary/5 px-1 py-px text-xs');
  expect(thread).toContain('<InboxWorkflowAutomationMessage');
});
