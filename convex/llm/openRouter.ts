import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export function getOpenRouter() {
  const apiKey = process.env.OPEN_ROUTER_API?.trim();
  if (!apiKey) {
    throw new Error("OPEN_ROUTER_API is not configured");
  }
  return createOpenRouter({ apiKey });
}

export function openRouterModel(modelId: string) {
  return getOpenRouter().chat(modelId);
}
