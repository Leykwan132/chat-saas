import type { BillingInterval, PlanKey } from "../shared/planCatalog";
import type { ExtraCreditsPackId } from "../shared/extraCreditsCatalog";

function requireEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getOptionalEnvVar(name: string): string | undefined {
  return process.env[name] || undefined;
}

export const STRIPE_PRICE_IDS: Record<
  PlanKey,
  Record<BillingInterval, string>
> = {
  free: {
    monthly: requireEnvVar("STRIPE_PRICE_FREE_MONTHLY"),
    annual: requireEnvVar("STRIPE_PRICE_FREE_ANNUAL"),
  },
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

const PAID_PLAN_KEYS = ["starter", "growth", "business"] as const;

export const LEGACY_STRIPE_PRICE_IDS: Record<
  (typeof PAID_PLAN_KEYS)[number],
  Record<BillingInterval, string | undefined>
> = {
  starter: {
    monthly: getOptionalEnvVar("STRIPE_LEGACY_PRICE_STARTER_MONTHLY"),
    annual: getOptionalEnvVar("STRIPE_LEGACY_PRICE_STARTER_ANNUAL"),
  },
  growth: {
    monthly: getOptionalEnvVar("STRIPE_LEGACY_PRICE_GROWTH_MONTHLY"),
    annual: getOptionalEnvVar("STRIPE_LEGACY_PRICE_GROWTH_ANNUAL"),
  },
  business: {
    monthly: getOptionalEnvVar("STRIPE_LEGACY_PRICE_BUSINESS_MONTHLY"),
    annual: getOptionalEnvVar("STRIPE_LEGACY_PRICE_BUSINESS_ANNUAL"),
  },
};

const EXTRA_CREDITS_PRICE_ENV_NAMES: Record<ExtraCreditsPackId, string> = {
  credits_2000: "STRIPE_PRICE_EXTRA_CREDITS_2000",
  credits_5000: "STRIPE_PRICE_EXTRA_CREDITS_5000",
  credits_15000: "STRIPE_PRICE_EXTRA_CREDITS_15000",
};

export function getStripePriceId(
  plan: PlanKey,
  interval: BillingInterval,
): string {
  return STRIPE_PRICE_IDS[plan][interval];
}

export function getExtraCreditsPriceId(packId: ExtraCreditsPackId): string {
  return requireEnvVar(EXTRA_CREDITS_PRICE_ENV_NAMES[packId]);
}

export function resolvePlanKeyFromStripePriceId(priceId: string): PlanKey {
  for (const plan of ["free", "starter", "growth", "business"] as const) {
    if (
      STRIPE_PRICE_IDS[plan].monthly === priceId ||
      STRIPE_PRICE_IDS[plan].annual === priceId
    ) {
      return plan;
    }
  }
  for (const plan of PAID_PLAN_KEYS) {
    if (
      LEGACY_STRIPE_PRICE_IDS[plan].monthly === priceId ||
      LEGACY_STRIPE_PRICE_IDS[plan].annual === priceId
    ) {
      return plan;
    }
  }
  throw new Error(`Unknown Stripe price ID: ${priceId}`);
}
