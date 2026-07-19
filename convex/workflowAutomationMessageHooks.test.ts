import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

test('names the WhatsApp live ingress mutation for its downstream actions', () => {
  const webhook = source('./whatsappWebhook.ts');

  expect(webhook).toMatch(
    /export const ingestIncomingMessageAndTriggerAnalyticsWorkflowAndAi\s*=\s*internalMutation/,
  );
  expect(webhook).not.toMatch(
    /export const handleIncoming\s*=\s*internalMutation/,
  );
});

test('names the workflow follow-up hook for its cancel-or-schedule behavior', () => {
  const hook = source('./workflowAutomationMessageActivity.ts');

  expect(hook).toContain(
    'export async function cancelOrScheduleWorkflowFollowUpForMessages',
  );
  expect(hook).not.toContain(
    'export async function handleWorkflowAutomationMessageActivity',
  );
});

test('records outbound hooks and inbound cancellation at message persistence boundaries', () => {
  expect(source('./whatsappWebhook.ts')).toContain(
    'cancelOrScheduleWorkflowFollowUpForMessages',
  );
  expect(source('./chat/inbox.ts')).toContain('handleWorkflowFollowUpOutbound');
  expect(source('./whatsappSend.ts')).toContain(
    'handleWorkflowFollowUpOutbound',
  );
});

test('gates follow-up outbound on enabled state before customer scheduling context', () => {
  const runtime = source('./workflowFollowUpRuntime.ts');
  const enabledGate = runtime.indexOf('if (!config.enabled) return false');
  const customerLookup = runtime.indexOf('const customer =');
  expect(enabledGate).toBeGreaterThan(-1);
  expect(customerLookup).toBeGreaterThan(-1);
  expect(enabledGate).toBeLessThan(customerLookup);
});

test('enqueues follow-up work without rereading the known run', () => {
  expect(source('./workflowFollowUpRuntime.ts')).not.toContain(
    'ctx.db.get(args.runId)',
  );
});

test('live ingestion callers trust authoritative AI eligibility without rereading conversations', () => {
  for (const path of [
    './whatsappWebhook.ts',
    './instagramWebhook.ts',
    './messengerWebhook.ts',
    './webWidget.ts',
  ]) {
    expect(source(path)).not.toContain('ctx.db.get(result.conversationId)');
  }
});

test('marks automated follow-ups with structured source metadata', () => {
  expect(source('./followUpPool.ts')).toContain(
    "workflowAutomationSource: 'workflowFollowUp'",
  );
  expect(source('./workflowAutomationOutbound.ts')).toContain(
    'workflowAutomationSource: projected.source',
  );
  expect(source('./workflowReminderWorker.ts')).toContain(
    'recordWorkflowAutomationOutbound(ctx',
  );
  expect(source('./workflowFollowUpWorker.ts')).toContain(
    'recordWorkflowAutomationOutbound(ctx',
  );
  expect(source('./workflowReminderWorker.ts')).not.toContain(
    "source: 'workflowReminder'",
  );
  expect(source('./workflowFollowUpWorker.ts')).not.toContain(
    "source: 'workflowFollowUp'",
  );
});
