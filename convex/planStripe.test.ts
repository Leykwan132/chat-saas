import { beforeEach, describe, expect, test, vi } from "vitest";

const prices = {
  STRIPE_PRICE_FREE_MONTHLY: "price_free_monthly",
  STRIPE_PRICE_FREE_ANNUAL: "price_free_annual",
  STRIPE_PRICE_STARTER_MONTHLY: "price_starter_monthly",
  STRIPE_PRICE_STARTER_ANNUAL: "price_starter_annual",
  STRIPE_PRICE_GROWTH_MONTHLY: "price_growth_monthly",
  STRIPE_PRICE_GROWTH_ANNUAL: "price_growth_annual",
  STRIPE_PRICE_BUSINESS_MONTHLY: "price_business_monthly",
  STRIPE_PRICE_BUSINESS_ANNUAL: "price_business_annual",
};

beforeEach(() => {
  vi.resetModules();
  Object.assign(process.env, prices);
});

describe("Free Stripe prices", () => {
  test("resolve both billing intervals in both directions", async () => {
    const { getStripePriceId, resolvePlanKeyFromStripePriceId } =
      await import("./planStripe");

    expect(getStripePriceId("free", "monthly")).toBe("price_free_monthly");
    expect(getStripePriceId("free", "annual")).toBe("price_free_annual");
    expect(resolvePlanKeyFromStripePriceId("price_free_monthly")).toBe("free");
    expect(resolvePlanKeyFromStripePriceId("price_free_annual")).toBe("free");
  });
});
