import { useFeatureFlagEnabled } from '@posthog/react';

export const POSTHOG_FEATURE_FLAGS = {
  showTokenUsage: 'show-token-usage',
  showSavedReplies: 'show-saved-replies',
  enableAvatarFeature: 'enable_avatar_feature',
  enableReferralProgram: 'enable_referral_program',
} as const;

export type ProductFeatureFlagState = boolean | undefined;

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

export function useEnableReferralProgram(): ProductFeatureFlagState {
  return useFeatureFlagEnabled(POSTHOG_FEATURE_FLAGS.enableReferralProgram);
}
