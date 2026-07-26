import { expect, test } from "vitest";
import { getMigratedTopUpEntrySource } from "./topUpEntrySourceMigration";

test("classifies Stripe top-ups as purchases", () => {
  expect(
    getMigratedTopUpEntrySource({
      stripePaymentIntentId: "pi_123",
    }),
  ).toBe("purchase");
});

test("classifies non-Stripe top-ups as manual grants", () => {
  expect(getMigratedTopUpEntrySource({})).toBe("manual");
});

test("preserves an existing source", () => {
  expect(
    getMigratedTopUpEntrySource({
      source: "referral",
      stripePaymentIntentId: "pi_123",
    }),
  ).toBe("referral");
});
