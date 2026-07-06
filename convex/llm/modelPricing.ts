import { query } from "../_generated/server";
import type { PlanKey } from "../planCatalog";

export type ModelAccessLabel = "basic" | "advanced" | "popular" | "latest";

export type ModelPricingEntry = {
  label: string;
  creditCost: number;
  enabled: boolean;
  chef: string;
  chefSlug: string;
  requiredPlan: PlanKey;
  labels: ModelAccessLabel[];
  isPopular?: boolean;
};

export const MODEL_PRICING: Record<string, ModelPricingEntry> = {
  "amazon/nova-micro-v1": {
    label: "Amazon Nova Micro",
    creditCost: 1,
    enabled: true,
    chef: "Amazon",
    chefSlug: "amazon-bedrock",
    requiredPlan: "free",
    labels: ["basic"],
  },
  "xiaomi/mimo-v2.5": {
    label: "Xiaomi MiMo V2.5",
    creditCost: 1,
    enabled: true,
    chef: "Xiaomi",
    chefSlug: "xiaomi",
    requiredPlan: "starter",
    labels: ["advanced", "latest"],
  },
  "deepseek/deepseek-v4-flash": {
    label: "DeepSeek V4 Flash",
    creditCost: 1,
    enabled: true,
    chef: "DeepSeek",
    chefSlug: "deepseek",
    requiredPlan: "free",
    labels: ["basic", "popular"],
    isPopular: true,
  },
  "google/gemini-3.1-flash-lite": {
    label: "Google Gemini 3.1 Flash Lite",
    creditCost: 1,
    enabled: true,
    chef: "Google",
    chefSlug: "google",
    requiredPlan: "starter",
    labels: ["advanced", "latest"],
  },
  "openai/gpt-oss-120b": {
    label: "OpenAI GPT-OSS 120B",
    creditCost: 1,
    enabled: true,
    chef: "OpenAI",
    chefSlug: "openai",
    requiredPlan: "starter",
    labels: ["advanced"],
  },
  "tencent/hy3-preview": {
    label: "Tencent HY3 Preview",
    creditCost: 1,
    enabled: true,
    chef: "Tencent",
    chefSlug: "tencent",
    requiredPlan: "starter",
    labels: ["advanced", "latest"],
  },
};

export const DEFAULT_OPENROUTER_MODEL = "deepseek/deepseek-v4-flash";

export function getModelPricing(modelId: string): ModelPricingEntry | null {
  const entry = MODEL_PRICING[modelId];
  if (entry === undefined || !entry.enabled) {
    return null;
  }
  return entry;
}

export function isEnabledModel(modelId: string): boolean {
  return getModelPricing(modelId) !== null;
}

export function listEnabledModels() {
  return Object.entries(MODEL_PRICING)
    .filter(([, entry]) => entry.enabled)
    .map(([modelId, entry]) => ({
      value: modelId,
      label: entry.label,
      creditCost: entry.creditCost,
      chef: entry.chef,
      chefSlug: entry.chefSlug,
      requiredPlan: entry.requiredPlan,
      labels: entry.labels,
      isPopular: entry.isPopular ?? false,
    }));
}

import { getBillingWorkosUserId } from "../billingScope";
import { checkModelAccess, getPlanFromStripe } from "../plans";

export const listEnabled = query({
  args: {},
  handler: async (ctx) => {
    const models = listEnabledModels();
    let activePlan: string | undefined = undefined;

    try {
      const userId = await getBillingWorkosUserId(ctx);
      const stripeInfo = await getPlanFromStripe(ctx, userId);
      activePlan = stripeInfo.plan;
    } catch {
      // Ignore auth/db errors for anonymous access or fallback
    }

    return models.map((model) => ({
      ...model,
      accessible: activePlan === undefined ? true : checkModelAccess(activePlan, model.value),
    }));
  },
});
