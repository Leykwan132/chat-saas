import { describe, expect, test } from 'vitest';
import { resolveUpgradeScenario } from './upgradeModalFlow';

describe('resolveUpgradeScenario', () => {
  test.each([
    ['free', 'free_to_starter'],
    ['starter', 'starter_to_growth'],
    ['growth', 'growth_to_business'],
    ['business', 'growth_to_business'],
  ] as const)('maps %s to %s', (plan, expected) => {
    expect(resolveUpgradeScenario(plan)).toBe(expected);
  });
});
