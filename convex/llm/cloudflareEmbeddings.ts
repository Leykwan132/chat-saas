import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export const CF_EMBEDDING_MODEL = "@cf/baai/bge-m3";
export const CF_EMBEDDING_DIMENSION = 1024;

export function cloudflareEmbeddingBaseUrl(accountId: string) {
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`;
}

export function getCloudflareEmbeddingModel() {
  const accountId = process.env.CF_ACCOUNT_ID?.trim();
  if (!accountId) {
    throw new Error("CF_ACCOUNT_ID is not configured");
  }
  const apiKey = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!apiKey) {
    throw new Error("CLOUDFLARE_API_TOKEN is not configured");
  }
  return createOpenAICompatible({
    apiKey,
    baseURL: cloudflareEmbeddingBaseUrl(accountId),
    name: "cloudflare-workers-ai",
  }).textEmbeddingModel(CF_EMBEDDING_MODEL);
}
