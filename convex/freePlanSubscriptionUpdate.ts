import type Stripe from "stripe";
import { selectLatestStripeSubscription } from "./latestStripeSubscription";

type SubscriptionItemShape = {
  id: string;
};

type SubscriptionShape = {
  items: {
    data: SubscriptionItemShape[];
  };
  metadata: Record<string, string>;
};

type StoredSubscriptionShape = {
  stripeSubscriptionId: string;
  status: string;
};

type UpdatedSubscriptionShape = {
  id: string;
  status: string;
  cancel_at_period_end: boolean;
  cancel_at: number | null;
  metadata: Record<string, string>;
  items: {
    data: Array<
      SubscriptionItemShape & {
        price: { id: string };
        current_period_end: number;
        quantity?: number;
      }
    >;
  };
};

export function selectLatestActiveSubscriptionForDowngrade<
  T extends StoredSubscriptionShape,
>(subscriptions: readonly T[]): T {
  const latest = selectLatestStripeSubscription(subscriptions);
  if (
    !latest ||
    (latest.status !== "active" && latest.status !== "trialing")
  ) {
    throw new Error("The latest Stripe subscription is not active");
  }
  return latest;
}

export function getSoleSubscriptionItem<T extends SubscriptionItemShape>(
  subscription: { items: { data: T[] } },
): T {
  if (subscription.items.data.length !== 1) {
    throw new Error("Expected exactly one subscription item");
  }
  return subscription.items.data[0];
}

export function buildFreePlanSubscriptionUpdate(
  subscription: SubscriptionShape,
  priceId: string,
  userId: string,
): Stripe.SubscriptionUpdateParams {
  const item = getSoleSubscriptionItem(subscription);

  return {
    items: [{ id: item.id, price: priceId, quantity: 1 }],
    metadata: { ...subscription.metadata, orgId: userId },
    proration_behavior: "none",
    cancel_at_period_end: false,
  };
}

export function buildStoredSubscriptionUpdate(
  subscription: UpdatedSubscriptionShape,
) {
  const item = getSoleSubscriptionItem(subscription);

  return {
    stripeSubscriptionId: subscription.id,
    status: subscription.status,
    currentPeriodEnd: item.current_period_end,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    ...(subscription.cancel_at !== null
      ? { cancelAt: subscription.cancel_at }
      : {}),
    ...(item.quantity !== undefined ? { quantity: item.quantity } : {}),
    priceId: item.price.id,
    metadata: subscription.metadata,
  };
}
