import { expect, test } from "vitest";
import { canAccessOrganization } from "./organizationAccess";

test("allows an onboarded partner customer with a managed Starter plan", () => {
  expect(
    canAccessOrganization({
      onboarded: true,
      plan: "starter",
      stripeSubscriptionStatus: undefined,
      isPartnerManaged: true,
    }),
  ).toBe(true);
});

test("still requires a Stripe subscription for an ordinary paid user", () => {
  expect(
    canAccessOrganization({
      onboarded: true,
      onboardingAnswers: {
        role: "founder",
        useCase: ["support"],
        channels: ["whatsapp"],
      },
      plan: "starter",
      stripeSubscriptionStatus: undefined,
      isPartnerManaged: false,
    }),
  ).toBe(false);
});

test("sends a partner-provisioned user through Kilobot onboarding on the native host", () => {
  expect(
    canAccessOrganization({
      onboarded: true,
      plan: "free",
      stripeSubscriptionStatus: undefined,
      isPartnerManaged: false,
    }),
  ).toBe(false);
});

test("allows a native Kilobot user after they complete onboarding answers", () => {
  expect(
    canAccessOrganization({
      onboarded: true,
      onboardingAnswers: {
        role: "founder",
        useCase: ["support"],
        channels: ["whatsapp"],
      },
      plan: "free",
      stripeSubscriptionStatus: undefined,
      isPartnerManaged: false,
    }),
  ).toBe(true);
});
