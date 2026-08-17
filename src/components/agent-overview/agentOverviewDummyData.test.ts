import { expect, test } from 'vitest';
import { resolveAgentOverviewPanelData } from './agentOverviewDummyData';

test('replaces empty overview panel data with browser dummy data', () => {
  expect(
    resolveAgentOverviewPanelData({
      dummyData: true,
      topics: [],
      sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
      topicAnalyticsEnabled: false,
    }),
  ).toEqual({
    topics: expect.arrayContaining([
      expect.objectContaining({ topic: 'Identity confusion', count: 20 }),
      expect.objectContaining({ topic: 'Request for Type A layout', count: 20 }),
    ]),
    sentimentDistribution: { positive: 60, neutral: 30, negative: 10 },
    topicAnalyticsEnabled: true,
  });
});

test('preserves live overview panel data without the URL flag', () => {
  const topics = [{ topicId: 'pricing', topic: 'Pricing', count: 4, description: null }];
  const sentimentDistribution = { positive: 3, neutral: 2, negative: 1 };

  expect(
    resolveAgentOverviewPanelData({
      dummyData: false,
      topics,
      sentimentDistribution,
      topicAnalyticsEnabled: false,
    }),
  ).toEqual({ topics, sentimentDistribution, topicAnalyticsEnabled: false });
});
