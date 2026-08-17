import { emptyCustomerSentimentCounts, type CustomerSentimentCounts } from '../shared/customerSentiment';

export type OverviewTopicAnalyticsRow = {
  topicId: string;
  topic: string;
  count: number;
  description: string | null;
};

export function resolveTopicAnalyticsSummary(
  topicAnalyticsEnabled: boolean,
  trendingTopics: OverviewTopicAnalyticsRow[],
  sentimentDistribution: CustomerSentimentCounts,
) {
  if (!topicAnalyticsEnabled) {
    return {
      topicAnalyticsEnabled: false,
      trendingTopics: [],
      sentimentDistribution: emptyCustomerSentimentCounts(),
    };
  }

  return {
    topicAnalyticsEnabled: true,
    trendingTopics,
    sentimentDistribution,
  };
}
