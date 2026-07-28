import { expect, test } from "vitest";
import { buildCheckoutSessionCreateParams } from "./stripeCheckout";

const baseCheckoutArgs = {
  priceId: "price_test",
  customerId: "cus_test",
  successUrl: "https://example.com/success",
  cancelUrl: "https://example.com/cancel",
  metadata: { orgId: "user_test", type: "subscription" },
};

test("Stripe checkout sessions allow promotion codes", () => {
  const params = buildCheckoutSessionCreateParams({
    ...baseCheckoutArgs,
    mode: "subscription",
    subscriptionMetadata: { orgId: "user_test" },
  });

  expect(params.allow_promotion_codes).toBe(true);
  expect(params.customer).toBe("cus_test");
  expect(params.subscription_data?.metadata).toEqual({ orgId: "user_test" });
});

test("Stripe top-up checkout sessions keep payment intent metadata", () => {
  const params = buildCheckoutSessionCreateParams({
    ...baseCheckoutArgs,
    mode: "payment",
    metadata: { orgId: "user_test", type: "extra_credits" },
    paymentIntentMetadata: {
      orgId: "user_test",
      type: "extra_credits",
      creditsAmount: "15000",
    },
  });

  expect(params.allow_promotion_codes).toBe(true);
  expect(params.payment_intent_data?.metadata).toEqual({
    orgId: "user_test",
    type: "extra_credits",
    creditsAmount: "15000",
  });
});

test("Free checkout uses its configured price without collecting a card", () => {
  const params = buildCheckoutSessionCreateParams({
    ...baseCheckoutArgs,
    priceId: "price_free_annual",
    mode: "subscription",
    subscriptionMetadata: { orgId: "user_test" },
    paymentMethodCollection: "if_required",
    allowPromotionCodes: false,
  });

  expect(params.line_items).toEqual([
    { price: "price_free_annual", quantity: 1 },
  ]);
  expect(params.payment_method_collection).toBe("if_required");
  expect(params.allow_promotion_codes).toBe(false);
});
