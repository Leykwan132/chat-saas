import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

test('hides repeat cadence and reattempt copy for one follow-up attempt', () => {
  const scheduleFields = source('./WorkflowFollowupScheduleFields.tsx');
  const summary = source('./workflowFollowupSummary.ts');
  const summaryNode = source('./WorkflowFollowupSummaryNode.tsx');

  expect(scheduleFields).toContain('const hasRepeatAttempts = maxAttemptsCount > 1;');
  expect(scheduleFields).toContain('{hasRepeatAttempts && (');
  expect(summary).toContain('const hasRepeatAttempts = maxAttemptsCount > 1;');
  expect(summary).toContain('hasRepeatAttempts,');
  expect(summary).toContain('scheduleCardDetail: hasRepeatAttempts');
  expect(summaryNode).toContain('{summary.hasRepeatAttempts && (');
  expect(summaryNode).toContain('<SummaryRow label="Repeats" value={summary.interval.label} />');
  expect(summaryNode).not.toContain('after no reply and will reattempt every');
});
