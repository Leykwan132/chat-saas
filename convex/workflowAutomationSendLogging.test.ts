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
