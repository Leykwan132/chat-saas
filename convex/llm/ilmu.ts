import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const ILMU_BASE_URL = "https://api.ilmu.ai/v1";

export function getIlmu() {
  const apiKey = process.env.ILMU_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ILMU_API_KEY is not configured");
  }
  return createOpenAICompatible({
    apiKey,
    baseURL: ILMU_BASE_URL,
    name: "ilmu",
  });
}

export function ilmuModel(modelId: string) {
  return getIlmu().chatModel(modelId);
}
