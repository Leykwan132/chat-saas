import { describe, expect, test } from 'vitest';
import {
  POSTHOG_FEATURE_FLAGS,
  isProductFeatureEnabled,
} from './posthogFeatureFlags';

describe('PostHog product feature flags', () => {
  test('uses the configured PostHog keys', () => {
    expect(POSTHOG_FEATURE_FLAGS).toEqual({
      showTokenUsage: 'show-token-usage',
      showSavedReplies: 'show-saved-replies',
    });
  });

  test.each([
    [true, true],
    [false, false],
    [undefined, false],
  ] as const)('treats %s as enabled=%s', (state, expected) => {
    expect(isProductFeatureEnabled(state)).toBe(expected);
  });
});
