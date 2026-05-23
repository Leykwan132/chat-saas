import { query } from "../_generated/server";

export type ModelPricingEntry = {
  label: string;
  creditCost: number;
  enabled: boolean;
  chef: string;
  chefSlug: string;
  isPopular?: boolean;
};

/** OpenRouter model catalog and per-message credit costs. Edit here to add or change models. */
export const MODEL_PRICING: Record<string, ModelPricingEntry> = {
  "nvidia/nemotron-3-super-120b-a12b": {
    label: "NVIDIA Nemotron 3",
    creditCost: 1,
    enabled: true,
    chef: "NVIDIA",
    chefSlug: "nvidia",
  },
  "openai/gpt-oss-120b": {
    label: "OpenAI GPT-OSS 120B",
    creditCost: 1,
    enabled: true,
    chef: "OpenAI",
    chefSlug: "openai",
  },
  "z-ai/glm-4.5-air": {
    label: "GLM 4.5 Air",
    creditCost: 1,
    enabled: true,
    chef: "Z.AI",
    chefSlug: "zai",
  },
  "deepseek/deepseek-v4-flash": {
    label: "DeepSeek V4 Flash",
    creditCost: 1,
    enabled: true,
    chef: "DeepSeek",
    chefSlug: "deepseek",
    isPopular: true,
  },
  "minimax/minimax-m2.5": {
    label: "MiniMax M2.5",
    creditCost: 1,
    enabled: true,
    chef: "MiniMax",
    chefSlug: "minimax",
  },
  "google/gemma-4-31b-it": {
    label: "Google Gemma 4",
    creditCost: 1,
    enabled: true,
    chef: "Google",
    chefSlug: "google",
  },
  "qwen/qwen3-next-80b-a3b-instruct": {
    label: "Qwen 3 Next 80B",
    creditCost: 1,
    enabled: true,
    chef: "Alibaba",
    chefSlug: "alibaba",
  },
  "meta-llama/llama-3.3-70b-instruct": {
    label: "Meta Llama 3.3 70B Instruct",
    creditCost: 1,
    enabled: true,
    chef: "Meta",
    chefSlug: "llama",
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
      isPopular: entry.isPopular ?? false,
    }));
}

import { v } from "convex/values";
import { getAuthContext } from "../authUtils";
import { checkModelAccess, getPlanFromStripe } from "../plans";

export const listEnabled = query({
  args: {
    orgId: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const models = listEnabledModels();
    let activePlan: string | undefined = undefined;
    
    try {
      const { orgId, userId } = await getAuthContext(ctx, args.orgId);
      const entityId = !orgId || orgId === "personal" ? userId : orgId;
      const stripeInfo = await getPlanFromStripe(ctx, entityId);
      activePlan = stripeInfo.plan;
    } catch (e) {
      // Ignore auth/db errors for anonymous access or fallback
    }

    if (activePlan !== undefined) {
      return models.filter((m) => checkModelAccess(activePlan, m.value));
    }
    return models;
  },
});
