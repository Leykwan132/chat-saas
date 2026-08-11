import { query } from "../_generated/server";
import type { PlanKey } from "../planCatalog";

export type ModelAccessLabel = "basic" | "advanced" | "popular" | "latest";
export type ModelProvider = "openrouter" | "ilmu";

export type ModelPricingEntry = {
  label: string;
  creditCost: number;
  enabled: boolean;
  provider: ModelProvider;
  chef: string;
  chefSlug: string;
  requiredPlan: PlanKey;
  labels: ModelAccessLabel[];
  imageUrl?: string;
  inputCostMyrPerMillion?: number;
  outputCostMyrPerMillion?: number;
  isPopular?: boolean;
};

export const MODEL_PRICING: Record<string, ModelPricingEntry> = {
  "ilmu-mini-v3.3": {
    label: "Ilmu Mini V3.3",
    creditCost: 1,
    enabled: true,
    provider: "ilmu",
    chef: "YTL AI Labs",
    chefSlug: "ilmu",
    requiredPlan: "free",
    labels: ["basic", "latest"],
    imageUrl: "https://storage.kilobot.app/ytl_ai_labs-removebg-preview.png",
    inputCostMyrPerMillion: 0.2,
    outputCostMyrPerMillion: 1.2,
  },
  "xiaomi/mimo-v2.5": {
    label: "Xiaomi MiMo V2.5",
    creditCost: 1,
    enabled: true,
    provider: "openrouter",
    chef: "Xiaomi",
    chefSlug: "xiaomi",
    requiredPlan: "starter",
    labels: ["advanced", "latest"],
  },
  "deepseek/deepseek-v4-flash": {
    label: "DeepSeek V4 Flash",
    creditCost: 1,
    enabled: true,
    provider: "openrouter",
    chef: "DeepSeek",
    chefSlug: "deepseek",
    requiredPlan: "starter",
    labels: ["advanced", "popular"],
    isPopular: true,
  },
  "google/gemini-3.1-flash-lite": {
    label: "Google Gemini 3.1 Flash Lite",
    creditCost: 1,
    enabled: true,
    provider: "openrouter",
    chef: "Google",
    chefSlug: "google",
    requiredPlan: "starter",
    labels: ["advanced", "latest"],
  },
  "openai/gpt-oss-120b": {
    label: "OpenAI GPT-OSS 120B",
    creditCost: 1,
    enabled: true,
    provider: "openrouter",
    chef: "OpenAI",
    chefSlug: "openai",
    requiredPlan: "starter",
    labels: ["advanced"],
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

export function getModelProvider(modelId: string): ModelProvider {
  const model = getModelPricing(modelId);
  if (model === null) {
    throw new Error("Selected model is not available");
  }
  return model.provider;
}

export function listEnabledModels() {
  return Object.entries(MODEL_PRICING)
    .filter(([, entry]) => entry.enabled)
    .map(([modelId, entry]) => ({
      value: modelId,
      label: entry.label,
      creditCost: entry.creditCost,
      provider: entry.provider,
      chef: entry.chef,
      chefSlug: entry.chefSlug,
      requiredPlan: entry.requiredPlan,
      labels: entry.labels,
      ...(entry.imageUrl === undefined ? {} : { imageUrl: entry.imageUrl }),
      ...(entry.inputCostMyrPerMillion === undefined
        ? {}
        : { inputCostMyrPerMillion: entry.inputCostMyrPerMillion }),
      ...(entry.outputCostMyrPerMillion === undefined
        ? {}
        : { outputCostMyrPerMillion: entry.outputCostMyrPerMillion }),
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
