import { getModelProvider } from "./modelPricing";
import { ilmuModel } from "./ilmu";
import { openRouterModel } from "./openRouter";

export function resolveLanguageModel(modelId: string) {
  const provider = getModelProvider(modelId);
  return {
    languageModel: provider === "ilmu" ? ilmuModel(modelId) : openRouterModel(modelId),
    provider,
  };
}
