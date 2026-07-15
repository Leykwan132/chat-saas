import { expect, test } from 'vitest';
import { resolveWorkflowFollowUpStartAfterMinutes } from './workflowAutomationConfig';
import { getWorkflowFollowUpStartAfterMigrationPatch } from './workflowFollowUpStartAfterMigration';

test('resolves legacy whole hours to canonical minutes', () => {
  expect(resolveWorkflowFollowUpStartAfterMinutes({ startAfterHours: 24 })).toBe(1440);
});

test('prefers explicitly stored canonical minutes', () => {
  expect(resolveWorkflowFollowUpStartAfterMinutes({
    startAfterHours: 24,
    startAfterMinutes: 15,
  })).toBe(15);
});

test('rejects a stored follow-up delay with no valid duration', () => {
  expect(() => resolveWorkflowFollowUpStartAfterMinutes({})).toThrow(
    'Follow-up start delay is missing',
  );
  expect(() => resolveWorkflowFollowUpStartAfterMinutes({ startAfterMinutes: 1.5 }))
    .toThrow('Follow-up start delay is missing');
});

test('backfills only legacy stored follow-up start delays', () => {
  const legacy = {
    enabled: false,
    revision: 0,
    selections: {},
    audienceFilters: [],
    startAfterHours: 2,
    intervalHours: 24,
    maxAttempts: 1,
    messageStrategy: 'same' as const,
    attemptTemplates: [],
  };

  expect(getWorkflowFollowUpStartAfterMigrationPatch(undefined)).toBeUndefined();
  expect(getWorkflowFollowUpStartAfterMigrationPatch({
    ...legacy,
    startAfterMinutes: 15,
  })).toBeUndefined();
  expect(getWorkflowFollowUpStartAfterMigrationPatch(legacy)).toEqual({
    followUpAutomation: {
      ...legacy,
      startAfterMinutes: 120,
    },
  });
});
