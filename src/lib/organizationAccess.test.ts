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
      plan: "starter",
      stripeSubscriptionStatus: undefined,
      isPartnerManaged: false,
    }),
  ).toBe(false);
});
