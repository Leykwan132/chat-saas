export type PlanKey = "free" | "standard" | "pro" | "ultra";

export type PlanFeatureFlags = {
  thread_summary: boolean;
  auto_reply: boolean;
  custom_agents: boolean;
};

export type PlanCatalogEntry = {
  name: string;
  priceMonthlyRm: number;
  priceAnnualRm?: number;
  period: "forever" | "mo";
  monthlyCredits: number;
  maxMembers: number;
  maxAgents: number | "unlimited";
  /** Shown in onboarding cards and other plan pickers — edit here to update UI copy. */
  displayFeatures: string[];
  actionLabel: string;
  popular?: boolean;
  models: string[];
  platforms: string[];
  features: PlanFeatureFlags;
};

/** Single source of truth for plan pricing, limits, and marketing feature bullets. */
export const PLAN_CATALOG: Record<PlanKey, PlanCatalogEntry> = {
  free: {
    name: "Free",
    priceMonthlyRm: 0,
    period: "forever",
    monthlyCredits: 500,
    maxMembers: 1,
    maxAgents: 1,
    displayFeatures: [
      "1 AI Agent",
      "500 credits / mo",
      "Standard models",
      "Playground access",
    ],
    actionLabel: "Start for Free",
    models: ["deepseek/deepseek-v4-flash", "google/gemma-4-31b-it"],
    platforms: [],
    features: {
      thread_summary: false,
      auto_reply: false,
      custom_agents: false,
    },
  },
  standard: {
    name: "Standard",
    priceMonthlyRm: 149,
    priceAnnualRm: 1429,
    period: "mo",
    monthlyCredits: 2000,
    maxMembers: 3,
    maxAgents: 1,
    displayFeatures: [
      "Everything in Free, plus:",
      "2,000 credits / mo",
      "Advanced models",
      "WhatsApp channel",
    ],
    actionLabel: "Get Standard",
    models: [
      "deepseek/deepseek-v4-flash",
      "google/gemma-4-31b-it",
      "meta-llama/llama-3.3-70b-instruct",
      "qwen/qwen3-next-80b-a3b-instruct",
    ],
    platforms: ["whatsapp"],
    features: {
      thread_summary: true,
      auto_reply: false,
      custom_agents: false,
    },
  },
  pro: {
    name: "Pro",
    priceMonthlyRm: 349,
    priceAnnualRm: 3349,
    period: "mo",
    monthlyCredits: 10000,
    maxMembers: 10,
    maxAgents: 5,
    displayFeatures: [
      "Everything in Standard, plus:",
      "5 AI Agents",
      "10,000 credits / mo",
      "All channels",
      "Team (10 members)",
    ],
    actionLabel: "Get Pro",
    popular: true,
    models: [
      "deepseek/deepseek-v4-flash",
      "google/gemma-4-31b-it",
      "meta-llama/llama-3.3-70b-instruct",
      "qwen/qwen3-next-80b-a3b-instruct",
      "nvidia/nemotron-3-super-120b-a12b",
      "minimax/minimax-m2.5",
      "z-ai/glm-4.5-air",
    ],
    platforms: ["whatsapp", "instagram", "messenger"],
    features: {
      thread_summary: true,
      auto_reply: true,
      custom_agents: true,
    },
  },
  ultra: {
    name: "Ultra",
    priceMonthlyRm: 799,
    priceAnnualRm: 7669,
    period: "mo",
    monthlyCredits: 50000,
    maxMembers: -1,
    maxAgents: "unlimited",
    displayFeatures: [
      "Everything in Pro, plus:",
      "Unlimited agents",
      "50,000 credits / mo",
      "All models",
      "Priority support",
    ],
    actionLabel: "Go Ultra",
    models: [
      "deepseek/deepseek-v4-flash",
      "google/gemma-4-31b-it",
      "meta-llama/llama-3.3-70b-instruct",
      "qwen/qwen3-next-80b-a3b-instruct",
      "nvidia/nemotron-3-super-120b-a12b",
      "minimax/minimax-m2.5",
      "z-ai/glm-4.5-air",
      "openai/gpt-oss-120b",
    ],
    platforms: ["whatsapp", "instagram", "messenger"],
    features: {
      thread_summary: true,
      auto_reply: true,
      custom_agents: true,
    },
  },
};

export const PLAN_ORDER: PlanKey[] = ["free", "standard", "pro", "ultra"];

export type BillingInterval = "monthly" | "annual";

export const ANNUAL_DISCOUNT_PERCENT = 20;

export const EXTRA_CREDITS_PACK_RM = 45;
export const EXTRA_CREDITS_PACK_AMOUNT = 1000;

export function getAnnualMonthlyEquivalent(priceMonthlyRm: number, priceAnnualRm?: number): number {
  if (priceAnnualRm !== undefined) {
    return Math.round(priceAnnualRm / 12);
  }
  return Math.round(priceMonthlyRm * (1 - ANNUAL_DISCOUNT_PERCENT / 100));
}

export function formatPlanPriceRm(priceMonthlyRm: number): string {
  return `RM ${priceMonthlyRm.toLocaleString()}`;
}

export function formatPlanPriceLabel(entry: PlanCatalogEntry): string {
  return entry.period === "forever"
    ? "RM 0/mo"
    : `RM ${entry.priceMonthlyRm.toLocaleString()}/mo`;
}

/** First bullet on paid tiers — rendered without a checkmark in plan pickers. */
export function isPlanIncludesLine(feature: string): boolean {
  return feature.startsWith("Everything in ");
}

export function comparePlans(
  currentPlanId: PlanKey,
  targetPlanId: PlanKey,
): "same" | "upgrade" | "downgrade" {
  const currentIndex = PLAN_ORDER.indexOf(currentPlanId);
  const targetIndex = PLAN_ORDER.indexOf(targetPlanId);
  if (currentIndex === targetIndex) return "same";
  return targetIndex > currentIndex ? "upgrade" : "downgrade";
}

/** Account plan picker: Upgrade / Downgrade / Current plan, or catalog label when no current plan. */
export function getPlanChangeActionLabel(
  currentPlanId: PlanKey | null | undefined,
  targetPlanId: PlanKey,
  fallbackLabel: string,
): string {
  if (!currentPlanId) return fallbackLabel;
  if (currentPlanId === targetPlanId) return "Current plan";
  const direction = comparePlans(currentPlanId, targetPlanId);
  if (direction === "upgrade") return "Upgrade";
  return "Downgrade";
}

export type OnboardingPlanCard = {
  id: PlanKey;
  name: string;
  monthlyPriceRm: number;
  annualPriceRm: number;
  yearlyPriceRm?: number;
  period: PlanCatalogEntry["period"] | "mo";
  credits: string;
  features: string[];
  actionLabel: string;
  popular: boolean;
};

export function getOnboardingPlanCards(): OnboardingPlanCard[] {
  return PLAN_ORDER.map((id) => {
    const plan = PLAN_CATALOG[id];
    const isFree = id === "free";
    const monthlyRm = isFree ? 0 : plan.priceMonthlyRm;
    const annualRm = isFree ? 0 : getAnnualMonthlyEquivalent(plan.priceMonthlyRm, plan.priceAnnualRm);

    return {
      id,
      name: plan.name,
      monthlyPriceRm: monthlyRm,
      annualPriceRm: annualRm,
      yearlyPriceRm: plan.priceAnnualRm,
      period: isFree ? plan.period : "mo",
      credits: plan.monthlyCredits.toLocaleString(),
      features: plan.displayFeatures,
      actionLabel: plan.actionLabel,
      popular: plan.popular ?? false,
    };
  });
}
