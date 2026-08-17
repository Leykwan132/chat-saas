import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import {
  AgentOverviewTopicsAndSentiment,
  AgentOverviewPreviewUpgradeAction,
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
  expect(markup).toContain('Most discussed topics.');
  expect(markup).toContain('Conversation sentiment.');
  expect(markup.match(/font-sans font-medium leading-tight/g)).toHaveLength(2);
  expect(markup).toContain('mt-0.5');
  expect(markup.match(/px-5 pb-3 pt-5/g) ?? []).toHaveLength(2);
});

test('shows Preview and Upgrade actions for plans without topic analytics', () => {
  const markup = renderToStaticMarkup(
    createElement(AgentOverviewTopicsAndSentiment, {
      topics: [],
      sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
      topicAnalyticsEnabled: false,
    }),
  );

  expect(markup).toContain('Preview');
  expect(markup).toContain('Upgrade');
});

test('renders a lower-left upgrade action inside an analytics panel', () => {
  const markup = renderToStaticMarkup(
    createElement(AgentOverviewPreviewUpgradeAction, { onUpgrade: () => undefined }),
  );

  expect(markup).toContain('Upgrade now');
  expect(markup).toContain('flex justify-start px-5 pb-5');
  expect(markup).not.toContain('justify-end');
});
