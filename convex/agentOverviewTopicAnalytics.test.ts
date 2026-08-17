import { expect, test } from 'vitest';
import { resolveTopicAnalyticsSummary } from './agentOverviewTopicAnalytics';

test('withholds live topic analytics when the plan does not include it', () => {
  expect(
    resolveTopicAnalyticsSummary(
      false,
      [{ topicId: 'billing', topic: 'Billing', count: 4, description: null }],
      { positive: 3, neutral: 2, negative: 1 },
    ),
  ).toEqual({
    topicAnalyticsEnabled: false,
    trendingTopics: [],
    sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
  });
});
