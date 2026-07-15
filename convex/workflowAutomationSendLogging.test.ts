import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const reminder = readFileSync(new URL('./workflowReminderWorker.ts', import.meta.url), 'utf8');
const followUp = readFileSync(new URL('./workflowFollowUpWorker.ts', import.meta.url), 'utf8');

test.each([
  [reminder, 'workflow_reminder_sending'],
  [followUp, 'workflow_followup_sending'],
])('logs immediately before the workflow provider call', (source, eventName) => {
  const logIndex = source.indexOf(`console.log('${eventName}'`);
  const sendIndex = source.indexOf('await sendWorkflowWhatsappTemplate', logIndex);
  expect(logIndex).toBeGreaterThan(-1);
  expect(sendIndex).toBeGreaterThan(logIndex);
  expect(source.slice(logIndex, sendIndex)).not.toMatch(
    /contactAddress|phoneNumber|messageBody|components/,
  );
});

test.each([reminder, followUp])(
  'records estimated cost before marking a workflow run sent',
  (source) => {
    const accountingIndex = source.indexOf('await recordWorkflowAutomationSentCost(ctx, run)');
    const sentIndex = source.indexOf("status: 'sent'", accountingIndex);
    expect(accountingIndex).toBeGreaterThan(-1);
    expect(sentIndex).toBeGreaterThan(accountingIndex);
  },
);
