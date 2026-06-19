export const CUSTOMER_SENTIMENTS = ["positive", "neutral", "negative"] as const;

export type CustomerSentiment = (typeof CUSTOMER_SENTIMENTS)[number];

export const CUSTOMER_SENTIMENT_LABELS: Record<CustomerSentiment, string> = {
  positive: "Positive",
  neutral: "Neutral",
  negative: "Negative",
};

export const CUSTOMER_SENTIMENT_CHART_COLORS: Record<CustomerSentiment, string> = {
  positive: "#2ee6a5",
  neutral: "#5eb8ff",
  negative: "#ff6b8a",
};

export type CustomerSentimentCounts = Record<CustomerSentiment, number>;

export function emptyCustomerSentimentCounts(): CustomerSentimentCounts {
  return { positive: 0, neutral: 0, negative: 0 };
}

export function hasCustomerSentimentData(
  counts: CustomerSentimentCounts,
): boolean {
  return CUSTOMER_SENTIMENTS.some((sentiment) => counts[sentiment] > 0);
}

export function isCustomerSentiment(value: string): value is CustomerSentiment {
  return (CUSTOMER_SENTIMENTS as readonly string[]).includes(value);
}

export function normalizeCustomerSentiment(
  value: string | null | undefined,
): CustomerSentiment | null {
  if (value === undefined || value === null) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return isCustomerSentiment(normalized) ? normalized : null;
}
