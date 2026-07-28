import { describe, expect, test } from "vitest";
import {
  buildFreePlanSubscriptionUpdate,
  buildStoredSubscriptionUpdate,
  selectLatestActiveSubscriptionForDowngrade,
} from "./freePlanSubscriptionUpdate";

describe("Free subscription update", () => {
  test("replaces the sole current item without proration", () => {
    const params = buildFreePlanSubscriptionUpdate(
      {
        items: { data: [{ id: "si_current" }] },
        metadata: { previous: "value" },
      },
      "price_free_monthly",
      "user_owner",
    );

    expect(params).toEqual({
      items: [
        {
          id: "si_current",
          price: "price_free_monthly",
          quantity: 1,
        },
      ],
      metadata: { previous: "value", orgId: "user_owner" },
      proration_behavior: "none",
      cancel_at_period_end: false,
    });
  });

  test.each([
    { items: [] },
    { items: [{ id: "si_one" }, { id: "si_two" }] },
  ])(
    "rejects an unsafe subscription item shape",
    ({ items }) => {
      expect(() =>
        buildFreePlanSubscriptionUpdate(
          { items: { data: items }, metadata: {} },
          "price_free_monthly",
          "user_owner",
        ),
      ).toThrow("exactly one subscription item");
    },
  );
});

test("stores the updated Free subscription before finalizing the downgrade", () => {
  const storedUpdate = buildStoredSubscriptionUpdate({
    id: "sub_current",
    status: "active",
    cancel_at_period_end: false,
    cancel_at: null,
    metadata: { orgId: "user_owner" },
    items: {
      data: [
        {
          id: "si_current",
          price: { id: "price_free_monthly" },
          current_period_end: 1_900_000_000,
          quantity: 1,
        },
      ],
    },
  });

  expect(storedUpdate).toEqual({
    stripeSubscriptionId: "sub_current",
    status: "active",
    currentPeriodEnd: 1_900_000_000,
    cancelAtPeriodEnd: false,
    quantity: 1,
    priceId: "price_free_monthly",
    metadata: { orgId: "user_owner" },
  });
});

describe("Free downgrade subscription selection", () => {
  test("uses the last subscription row as ground truth", () => {
    const latest = selectLatestActiveSubscriptionForDowngrade([
      { stripeSubscriptionId: "sub_old", status: "active" },
      { stripeSubscriptionId: "sub_latest", status: "trialing" },
    ]);

    expect(latest.stripeSubscriptionId).toBe("sub_latest");
  });

  test("does not revive an older active subscription when the latest is canceled", () => {
    expect(() =>
      selectLatestActiveSubscriptionForDowngrade([
        { stripeSubscriptionId: "sub_old", status: "active" },
        { stripeSubscriptionId: "sub_latest", status: "canceled" },
      ]),
    ).toThrow("latest Stripe subscription is not active");
  });
});
