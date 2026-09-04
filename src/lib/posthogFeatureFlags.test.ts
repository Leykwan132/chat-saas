import { describe, expect, test } from 'vitest';
import {
  POSTHOG_FEATURE_FLAGS,
  isAvatarUserAllowed,
  isProductFeatureEnabled,
} from './posthogFeatureFlags';

describe('PostHog product feature flags', () => {
  test('uses the configured PostHog keys', () => {
    expect(POSTHOG_FEATURE_FLAGS).toEqual({
      showTokenUsage: 'show-token-usage',
      showSavedReplies: 'show-saved-replies',
      enableAvatarFeature: 'enable_avatar_feature',
      enableReferralProgram: 'enable_referral_program',
      enableGoogleCalendarConnect: 'enable_google_calendar_connect',
      enablePartnerPortal: 'enable_partner_portal',
    });
  });

  test.each([
    [true, true],
    [false, false],
    [undefined, false],
  ] as const)('treats %s as enabled=%s', (state, expected) => {
    expect(isProductFeatureEnabled(state)).toBe(expected);
  });

  test.each([
    ['leykwan132@gmail.com', true],
    ['LEYKWAN132@GMAIL.COM', true],
    ['other@example.com', false],
    [undefined, false],
  ] as const)('allows Avatar only for the approved email: %s', (email, expected) => {
    expect(isAvatarUserAllowed(email)).toBe(expected);
  });
});
