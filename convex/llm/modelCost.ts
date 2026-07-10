import { USD_TO_MYR_RATE } from "../../shared/currency";
import { getModelPricing } from "./modelPricing";

export type ModelUsageTokens = {
  promptTokens: number;
  completionTokens: number;
};

export function calculateConfiguredModelCostUsd(
  modelId: string,
  usage: ModelUsageTokens,
): number | null {
  const pricing = getModelPricing(modelId);
  if (
    pricing?.inputCostMyrPerMillion === undefined ||
    pricing.outputCostMyrPerMillion === undefined
  ) {
    return null;
  }
  const costMyr =
    (usage.promptTokens * pricing.inputCostMyrPerMillion +
      usage.completionTokens * pricing.outputCostMyrPerMillion) /
    1_000_000;
  return costMyr / USD_TO_MYR_RATE;
}
