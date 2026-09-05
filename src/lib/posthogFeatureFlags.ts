import { useFeatureFlagEnabled } from '@posthog/react';

export const POSTHOG_FEATURE_FLAGS = {
  showTokenUsage: 'show-token-usage',
  showSavedReplies: 'show-saved-replies',
  enableAvatarFeature: 'enable_avatar_feature',
  enableCommentToInbox: 'enable_comment_to_inbox',
  enableReferralProgram: 'enable_referral_program',
  enableGoogleCalendarConnect: 'enable_google_calendar_connect',
  enablePartnerPortal: 'enable_partner_portal',
} as const;

export type ProductFeatureFlagState = boolean | undefined;

const AVATAR_ALLOWED_EMAIL = 'leykwan132@gmail.com';

export function isAvatarUserAllowed(email: string | null | undefined) {
  return email?.trim().toLowerCase() === AVATAR_ALLOWED_EMAIL;
}

export function isCommentToInboxUserAllowed(email: string | null | undefined) {
  return email?.trim().toLowerCase() === AVATAR_ALLOWED_EMAIL;
}

export function isProductFeatureEnabled(
  state: ProductFeatureFlagState,
): state is true {
  return state === true;
}

export function useShowTokenUsage(): ProductFeatureFlagState {
  return useFeatureFlagEnabled(POSTHOG_FEATURE_FLAGS.showTokenUsage);
}

export function useShowSavedReplies(): ProductFeatureFlagState {
  return useFeatureFlagEnabled(POSTHOG_FEATURE_FLAGS.showSavedReplies);
}

export function useEnableAvatarFeature(): ProductFeatureFlagState {
  return useFeatureFlagEnabled(POSTHOG_FEATURE_FLAGS.enableAvatarFeature);
}

export function useEnableCommentToInboxFeature(): ProductFeatureFlagState {
  return useFeatureFlagEnabled(POSTHOG_FEATURE_FLAGS.enableCommentToInbox);
}

export function useEnableReferralProgram(): ProductFeatureFlagState {
  return useFeatureFlagEnabled(POSTHOG_FEATURE_FLAGS.enableReferralProgram);
}

export function useEnableGoogleCalendarConnect(): ProductFeatureFlagState {
  return useFeatureFlagEnabled(POSTHOG_FEATURE_FLAGS.enableGoogleCalendarConnect);
}

export function useEnablePartnerPortal(): ProductFeatureFlagState {
  return useFeatureFlagEnabled(POSTHOG_FEATURE_FLAGS.enablePartnerPortal);
}
