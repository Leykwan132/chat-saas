import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { resolveWorkflowAutomationSource } from './workflowAutomationMessageMetadata';

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

test('prefers agent workflow source and falls back to the channel ledger', () => {
  expect(resolveWorkflowAutomationSource(
    { workflowAutomationSource: 'workflowReminder' },
    { workflowAutomationSource: 'workflowFollowUp' },
  )).toBe('workflowReminder');
  expect(resolveWorkflowAutomationSource(
    {},
    { workflowAutomationSource: 'workflowFollowUp' },
  )).toBe('workflowFollowUp');
  expect(resolveWorkflowAutomationSource({}, undefined)).toBeUndefined();
});

test('persists workflow source in agent metadata and exposes it on Inbox messages', () => {
  expect(source('./threads.ts')).toContain('workflowAutomationSource: args.workflowAutomationSource');
  expect(source('./inboxMessageMapping.ts')).toContain('resolveWorkflowAutomationSource');
  expect(source('./inboxMessageMapping.ts')).toContain('{ workflowAutomationSource }');
  expect(source('../../src/lib/inboxOptimistic.ts')).toContain('workflowAutomationSource?: WorkflowAutomationSource');
});
