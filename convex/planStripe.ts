import type { BillingInterval, PlanKey } from "../shared/planCatalog";

function requireEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const STRIPE_PRICE_IDS: Record<
  Exclude<PlanKey, "free">,
  Record<BillingInterval, string>
> = {
  starter: {
    monthly: requireEnvVar("STRIPE_PRICE_STARTER_MONTHLY"),
    annual: requireEnvVar("STRIPE_PRICE_STARTER_ANNUAL"),
  },
  growth: {
    monthly: requireEnvVar("STRIPE_PRICE_GROWTH_MONTHLY"),
    annual: requireEnvVar("STRIPE_PRICE_GROWTH_ANNUAL"),
  },
  business: {
    monthly: requireEnvVar("STRIPE_PRICE_BUSINESS_MONTHLY"),
    annual: requireEnvVar("STRIPE_PRICE_BUSINESS_ANNUAL"),
  },
};

export const EXTRA_CREDITS_PRICE_ID = requireEnvVar("STRIPE_PRICE_EXTRA_CREDITS");

export function getStripePriceId(
  plan: Exclude<PlanKey, "free">,
  interval: BillingInterval,
): string {
  return STRIPE_PRICE_IDS[plan][interval];
}

export function resolvePlanKeyFromStripePriceId(priceId: string): Exclude<PlanKey, "free"> {
  for (const plan of ["starter", "growth", "business"] as const) {
    if (
      STRIPE_PRICE_IDS[plan].monthly === priceId ||
      STRIPE_PRICE_IDS[plan].annual === priceId
    ) {
      return plan;
    }
  }
  throw new Error(`Unknown Stripe price ID: ${priceId}`);
}
