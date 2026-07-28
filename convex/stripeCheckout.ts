import Stripe from "stripe";

export type CheckoutMetadata = Record<string, string>;

export type CheckoutSessionParams = {
  priceId?: string;
  priceData?: {
    currency: string;
    unitAmount: number;
    recurringInterval: "month" | "year";
    productName: string;
  };
  customerId: string;
  mode: "subscription" | "payment";
  successUrl: string;
  cancelUrl: string;
  metadata: CheckoutMetadata;
  subscriptionMetadata?: CheckoutMetadata;
  paymentIntentMetadata?: CheckoutMetadata;
  paymentMethodCollection?: "always" | "if_required";
  allowPromotionCodes?: boolean;
};

function getStripeSecretKey() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not set");
  }
  return secretKey;
}

export function buildCheckoutSessionCreateParams(
  args: CheckoutSessionParams,
): Stripe.Checkout.SessionCreateParams {
  const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = args.priceId
    ? { price: args.priceId, quantity: 1 }
    : args.priceData
      ? {
          price_data: {
            currency: args.priceData.currency,
            unit_amount: args.priceData.unitAmount,
            recurring: { interval: args.priceData.recurringInterval },
            product_data: { name: args.priceData.productName },
          },
          quantity: 1,
        }
      : (() => {
          throw new Error("Checkout price is required");
        })();

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: args.mode,
    line_items: [lineItem],
    success_url: args.successUrl,
    cancel_url: args.cancelUrl,
    customer: args.customerId,
    metadata: args.metadata,
    allow_promotion_codes: args.allowPromotionCodes ?? true,
  };

  if (args.paymentMethodCollection) {
    sessionParams.payment_method_collection = args.paymentMethodCollection;
  }

  if (args.mode === "subscription" && args.subscriptionMetadata) {
    sessionParams.subscription_data = {
      metadata: args.subscriptionMetadata,
    };
  }

  if (args.mode === "payment" && args.paymentIntentMetadata) {
    sessionParams.payment_intent_data = {
      metadata: args.paymentIntentMetadata,
    };
  }

  return sessionParams;
}

export async function createCheckoutSessionWithPromotionCodes(
  args: CheckoutSessionParams,
) {
  const stripe = new Stripe(getStripeSecretKey());
  const session = await stripe.checkout.sessions.create(
    buildCheckoutSessionCreateParams(args),
  );

  return {
    sessionId: session.id,
    url: session.url,
  };
}
