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

test('gates follow-up outbound on enabled state before customer scheduling context', () => {
  const runtime = source('./workflowFollowUpRuntime.ts');
  const enabledGate = runtime.indexOf('if (!config.enabled) return false');
  const customerLookup = runtime.indexOf('const customer =');
  expect(enabledGate).toBeGreaterThan(-1);
  expect(customerLookup).toBeGreaterThan(-1);
  expect(enabledGate).toBeLessThan(customerLookup);
});

test('marks automated follow-ups with structured source metadata', () => {
  expect(source('./followUpPool.ts')).toContain("workflowAutomationSource: 'workflowFollowUp'");
  expect(source('./workflowAutomationOutbound.ts')).toContain('workflowAutomationSource: projected.source');
  expect(source('./workflowReminderWorker.ts')).toContain('recordWorkflowAutomationOutbound(ctx');
  expect(source('./workflowFollowUpWorker.ts')).toContain('recordWorkflowAutomationOutbound(ctx');
  expect(source('./workflowReminderWorker.ts')).not.toContain("source: 'workflowReminder'");
  expect(source('./workflowFollowUpWorker.ts')).not.toContain("source: 'workflowFollowUp'");
});
