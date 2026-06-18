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

/** OpenRouter model catalog and per-message credit costs. Edit here to add or change models. */
export const MODEL_PRICING: Record<string, ModelPricingEntry> = {
  "nvidia/nemotron-3-super-120b-a12b:free": {
    label: "NVIDIA Nemotron 3",
    creditCost: 1,
    enabled: true,
    chef: "NVIDIA",
    chefSlug: "nvidia",
    requiredPlan: "pro",
    labels: ["advanced", "latest"],
  },
  // "openai/gpt-oss-120b": {
  //   label: "OpenAI GPT-OSS 120B",
  //   creditCost: 1,
  //   enabled: true,
  //   chef: "OpenAI",
  //   chefSlug: "openai",
  // },
  "openai/gpt-oss-120b:free": {
    label: "OpenAI GPT-OSS 120B",
    creditCost: 1,
    enabled: true,
    chef: "OpenAI",
    chefSlug: "openai",
    requiredPlan: "free",
    labels: ["basic"],
  },
  "z-ai/glm-4.5-air": {
    label: "GLM 4.5 Air",
    creditCost: 1,
    enabled: true,
    chef: "Z.AI",
    chefSlug: "zai",
    requiredPlan: "pro",
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
  "minimax/minimax-m2.5": {
    label: "MiniMax M2.5",
    creditCost: 1,
    enabled: true,
    chef: "MiniMax",
    chefSlug: "minimax",
    requiredPlan: "pro",
    labels: ["advanced", "latest"],
  },
  "google/gemma-4-31b-it:free": {
    label: "Google Gemma 4",
    creditCost: 1,
    enabled: true,
    chef: "Google",
    chefSlug: "google",
    requiredPlan: "free",
    labels: ["basic"],
  },
  "qwen/qwen3-next-80b-a3b-instruct:free": {
    label: "Qwen 3 Next 80B",
    creditCost: 1,
    enabled: true,
    chef: "Alibaba",
    chefSlug: "alibaba",
    requiredPlan: "standard",
    labels: ["advanced"],
  },
  "meta-llama/llama-3.3-70b-instruct:free": {
    label: "Meta Llama 3.3 70B Instruct",
    creditCost: 1,
    enabled: true,
    chef: "Meta",
    chefSlug: "llama",
    requiredPlan: "standard",
    labels: ["advanced", "popular"],
    isPopular: true,
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
