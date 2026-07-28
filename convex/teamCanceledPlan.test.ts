import { expect, test } from "vitest";
import { resolveCanceledSubscriptionPlan } from "./plans";

test.each(["canceled", "cancelled"])(
  "resolves %s team subscriptions as Free",
  (status) => {
    expect(resolveCanceledSubscriptionPlan(status)).toEqual({
      plan: "free",
      status: "canceled",
    });
  },
);

test.each(["active", "trialing", "past_due", undefined])(
  "does not classify %s as canceled",
  (status) => {
    expect(resolveCanceledSubscriptionPlan(status)).toBeNull();
  },
);
