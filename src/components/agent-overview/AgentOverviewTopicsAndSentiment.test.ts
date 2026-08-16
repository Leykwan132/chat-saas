import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import {
  AgentOverviewTopicsAndSentiment,
  buildTopicChartData,
} from './AgentOverviewTopicsAndSentiment';

test('builds colored customer-share rows for Common Topics', () => {
  expect(
    buildTopicChartData([
      { topicId: 'pricing', topic: 'Pricing', count: 4, description: null },
      { topicId: 'billing', topic: 'Billing', count: 2, description: null },
    ]),
  ).toEqual([
    expect.objectContaining({
      key: 'pricing',
      label: 'Pricing',
      customerCount: 4,
      percentage: 66.67,
      fill: '#7cb4f4',
    }),
    expect.objectContaining({
      key: 'billing',
      label: 'Billing',
      customerCount: 2,
      percentage: 33.33,
      fill: '#67d184',
    }),
  ]);
});

test('distributes full-width topic rows with separators', () => {
  const topics = [
    { topicId: 'pricing', topic: 'Pricing', count: 4, description: null },
    { topicId: 'billing', topic: 'Billing', count: 2, description: null },
    { topicId: 'access', topic: 'Access', count: 2, description: null },
    { topicId: 'setup', topic: 'Setup', count: 2, description: null },
    { topicId: 'support', topic: 'Support', count: 2, description: null },
    { topicId: 'other', topic: 'Other', count: 2, description: null },
  ];

  const markup = renderToStaticMarkup(
    createElement(AgentOverviewTopicsAndSentiment, {
      topics,
      sentimentDistribution: { positive: 3, neutral: 2, negative: 1 },
    }),
  );

  expect(markup).toContain('Other');
  expect(markup).not.toContain('Show more');
  expect(markup.match(/data-slot="separator"/g)).toHaveLength(topics.length + 1);
  expect(markup).toContain('justify-between');
  expect(markup).toContain('max-h-[230px]');
  expect(markup).toContain('!size-[min(230px,100%)]');
  expect(markup).toContain('justify-start');
  expect(markup.match(/style="height:340px"/g)).toHaveLength(2);
  expect(markup.match(/bg-background/g)).toHaveLength(2);
  expect(markup).toContain('Most discussed themes across conversations in the selected period.');
  expect(markup).toContain('Sentiment breakdown across conversations in the selected period.');
  expect(markup.match(/font-medium/g)).toHaveLength(2);
});
