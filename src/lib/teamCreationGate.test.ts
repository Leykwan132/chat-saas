import { describe, expect, test } from 'vitest';
import { resolveTeamCreationGate } from './teamCreationGate';

describe('resolveTeamCreationGate', () => {
  test('waits while the gate is unresolved', () => {
    expect(resolveTeamCreationGate(undefined)).toBe('loading');
  });

  test('allows team creation when the plan permits it', () => {
    expect(
      resolveTeamCreationGate({
        allowed: true,
        reason: null,
        requiresPlanUpgrade: false,
      }),
    ).toBe('allowed');
  });

  test('prompts for an upgrade when the plan requires one', () => {
    expect(
      resolveTeamCreationGate({
        allowed: false,
        reason: 'Upgrade required',
        requiresPlanUpgrade: true,
      }),
    ).toBe('upgrade');
  });

  test('preserves non-billing restrictions', () => {
    expect(
      resolveTeamCreationGate({
        allowed: false,
        reason: 'Restricted',
        requiresPlanUpgrade: false,
      }),
    ).toBe('blocked');
  });
});
