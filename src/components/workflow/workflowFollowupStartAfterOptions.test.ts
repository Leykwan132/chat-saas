import { expect, test } from 'vitest';
import {
  applyWorkflowFollowupStartAfter,
  createInitialWorkflowAutomationConfigs,
} from '../../../shared/workflowAutomations';
import {
  createWorkflowFollowupStartAfterOption,
  getWorkflowFollowupStartAfterParts,
  toWorkflowFollowupStartAfterMinutes,
} from './workflowFollowupStartAfterOptions';

test('creates a singular custom day option with exact canonical minutes', () => {
  expect(createWorkflowFollowupStartAfterOption({ amount: 1, unit: 'days' })).toMatchObject({
    id: 'customFollowupStartAfter:1:days',
    label: '1 day',
    summaryLabel: '1 day',
    startAfterMinutes: 1440,
  });
});

test('parses preset and custom start delay options', () => {
  expect(getWorkflowFollowupStartAfterParts('startAfter24h')).toEqual({
    amount: 24,
    unit: 'hours',
  });
  expect(getWorkflowFollowupStartAfterParts('customFollowupStartAfter:15:minutes')).toEqual({
    amount: 15,
    unit: 'minutes',
  });
  expect(getWorkflowFollowupStartAfterParts('invalid')).toBeUndefined();
});

test('converts every supported unit to exact integer minutes', () => {
  expect(toWorkflowFollowupStartAfterMinutes(15, 'minutes')).toBe(15);
  expect(toWorkflowFollowupStartAfterMinutes(2, 'hours')).toBe(120);
  expect(toWorkflowFollowupStartAfterMinutes(3, 'days')).toBe(4320);
  expect(toWorkflowFollowupStartAfterMinutes(2, 'weeks')).toBe(20160);
});

test('rejects invalid custom start delay amounts', () => {
  expect(() => createWorkflowFollowupStartAfterOption({ amount: 0, unit: 'minutes' }))
    .toThrow('Start after amount must be a positive integer');
  expect(() => createWorkflowFollowupStartAfterOption({ amount: 1.5, unit: 'hours' }))
    .toThrow('Start after amount must be a positive integer');
  expect(() => createWorkflowFollowupStartAfterOption({ amount: Number.NaN, unit: 'days' }))
    .toThrow('Start after amount must be a positive integer');
});

test('atomically applies a custom start delay without UI-only fields', () => {
  const followUp = createInitialWorkflowAutomationConfigs().followUp;
  const option = createWorkflowFollowupStartAfterOption({
    amount: 15,
    unit: 'minutes',
  });

  const next = applyWorkflowFollowupStartAfter(followUp, option);

  expect(next.selections.startAfter).toBe(option.id);
  expect(next.startAfterMinutes).toBe(15);
  expect(next.customStartAfter).toEqual({
    amount: 15,
    id: option.id,
    label: '15 minutes',
    summaryLabel: '15 minutes',
    unit: 'minutes',
  });
  expect(next.customStartAfter).not.toHaveProperty('Icon');
  expect(next.customStartAfter).not.toHaveProperty('description');
});

test('selecting a preset clears custom metadata and updates canonical minutes', () => {
  const followUp = createInitialWorkflowAutomationConfigs().followUp;
  const custom = applyWorkflowFollowupStartAfter(
    followUp,
    createWorkflowFollowupStartAfterOption({ amount: 15, unit: 'minutes' }),
  );

  const next = applyWorkflowFollowupStartAfter(custom, {
    amount: 48,
    id: 'startAfter48h',
    label: '2 days',
    startAfterMinutes: 2880,
    summaryLabel: '2 days',
    unit: 'hours',
  });

  expect(next.selections.startAfter).toBe('startAfter48h');
  expect(next.startAfterMinutes).toBe(2880);
  expect(next.customStartAfter).toBeUndefined();
});
