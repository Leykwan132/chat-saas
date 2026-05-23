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
  standard: {
    monthly: requireEnvVar("STRIPE_PRICE_STANDARD_MONTHLY"),
    annual: requireEnvVar("STRIPE_PRICE_STANDARD_ANNUAL"),
  },
  pro: {
    monthly: requireEnvVar("STRIPE_PRICE_PRO_MONTHLY"),
    annual: requireEnvVar("STRIPE_PRICE_PRO_ANNUAL"),
  },
  ultra: {
    monthly: requireEnvVar("STRIPE_PRICE_ULTRA_MONTHLY"),
    annual: requireEnvVar("STRIPE_PRICE_ULTRA_ANNUAL"),
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
  for (const plan of ["standard", "pro", "ultra"] as const) {
    if (
      STRIPE_PRICE_IDS[plan].monthly === priceId ||
      STRIPE_PRICE_IDS[plan].annual === priceId
    ) {
      return plan;
    }
  }
  throw new Error(`Unknown Stripe price ID: ${priceId}`);
}
