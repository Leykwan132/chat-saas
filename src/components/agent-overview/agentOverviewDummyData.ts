import type { CustomerSentimentCounts } from '../../../shared/customerSentiment';
import type { AgentOverviewCommonTopic } from './AgentOverviewTopicsAndSentiment';

const DUMMY_TOPICS: AgentOverviewCommonTopic[] = [
  { topicId: 'identity-confusion', topic: 'Identity confusion', count: 20, description: null },
  { topicId: 'type-a-layout', topic: 'Request for Type A layout', count: 20, description: null },
  { topicId: 'product-interest', topic: 'Product Interest & Demo', count: 10, description: null },
  { topicId: 'demo-scheduling', topic: 'Demo Scheduling', count: 10, description: null },
  { topicId: 'platform-integration', topic: 'Platform Integration', count: 10, description: null },
  { topicId: 'customer-volume', topic: 'Customer Volume', count: 10, description: null },
  { topicId: 'greeting', topic: 'Greeting', count: 10, description: null },
];

const DUMMY_SENTIMENT: CustomerSentimentCounts = { positive: 60, neutral: 30, negative: 10 };

export function resolveAgentOverviewPanelData({
  dummyData,
  topics,
  sentimentDistribution,
  topicAnalyticsEnabled,
}: {
  dummyData: boolean;
  topics: AgentOverviewCommonTopic[];
  sentimentDistribution: CustomerSentimentCounts;
  topicAnalyticsEnabled: boolean;
}) {
  if (dummyData) {
    return {
      topics: DUMMY_TOPICS,
      sentimentDistribution: DUMMY_SENTIMENT,
      topicAnalyticsEnabled: true,
    };
  }

  return { topics, sentimentDistribution, topicAnalyticsEnabled };
}
