export type HistoricalModelDisplayMetadata = {
  label: string;
  chef: string;
};

const historicalModelDisplayMetadata: Record<string, HistoricalModelDisplayMetadata> = {
  "amazon/nova-micro-v1": {
    label: "Amazon Nova Micro",
    chef: "Amazon",
  },
  "openai/gpt-oss-120b": {
    label: "OpenAI GPT-OSS 120B",
    chef: "OpenAI",
  },
};

export function getHistoricalModelDisplayMetadata(modelId: string) {
  return historicalModelDisplayMetadata[modelId];
}
