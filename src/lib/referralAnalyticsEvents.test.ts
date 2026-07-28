import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(
    fileURLToPath(new URL(relativePath, import.meta.url)),
    "utf8",
  );
}

test("referrals page reports code copies to PostHog", () => {
  const source = readSource("../pages/ReferralsPage.tsx");

  expect(source).toContain("usePostHog");
  expect(source).toContain('posthog?.capture("referral_code_copied"');
  expect(source).toContain("successful_referral_count: overview.successfulReferralCount");
});

test("onboarding reports the full referral claim funnel to PostHog", () => {
  const source = readSource("../components/OnboardingFlow.tsx");

  expect(source).toContain("usePostHog");
  expect(source).toContain("posthog?.capture('referral_code_applied'");
  expect(source).toContain("posthog?.capture('referral_code_skipped')");
  expect(source).toContain("posthog?.capture('referral_claimed'");
  expect(source).toContain("posthog?.capture('referral_claim_failed'");
  expect(source).toContain("reward_credits: result.referralRewardCredits");
  expect(source).toContain("reason: mappedError.title");
});

test("claim events only fire for referral codes that were actually submitted", () => {
  const source = readSource("../components/OnboardingFlow.tsx");
  const submittedCodeIndex = source.indexOf(
    "const submittedReferralCode =\n      referralProgramEnabled && referralCode ? referralCode : undefined;",
  );
  const guardIndex = source.indexOf("if (submittedReferralCode) {");
  const claimedGuardIndex = source.indexOf("if (result.referralRewardCredits) {");

  expect(submittedCodeIndex).toBeGreaterThan(-1);
  expect(claimedGuardIndex).toBeGreaterThan(submittedCodeIndex);
  expect(guardIndex).toBeGreaterThan(claimedGuardIndex);
});
