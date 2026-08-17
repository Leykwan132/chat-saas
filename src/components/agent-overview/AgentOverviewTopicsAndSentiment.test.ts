import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { AgentOverviewActiveDonutChart } from './AgentOverviewActiveDonutChart';
import {
  AgentOverviewTopicsAndSentiment,
  AgentOverviewPreviewUpgradeAction,
  buildSentimentChartData,
  buildTopicChartData,
  getTopicChartOuterRadius,
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
  expect(markup).toContain('justify-start');
  expect(markup.match(/style="min-height:340px"/g)).toHaveLength(2);
  expect(markup.match(/bg-background/g)).toHaveLength(2);
  expect(markup).toContain('Most discussed topics.');
  expect(markup).toContain('Conversation sentiment.');
  expect(markup.match(/font-sans font-medium leading-tight/g)).toHaveLength(2);
  expect(markup).toContain('mt-0.5');
  expect(markup.match(/px-5 pb-3 pt-5/g) ?? []).toHaveLength(2);
  expect(markup).not.toContain('px-5 pb-5 pt-2');
});

test('keeps topic rows visible and expands the hovered donut segment', () => {
  expect(getTopicChartOuterRadius(86, 2, 2)).toBe(96);
  expect(getTopicChartOuterRadius(86, 2, 1)).toBe(86);
});

test('keeps customer counts with customer-sentiment donut data', () => {
  expect(buildSentimentChartData({ positive: 6, neutral: 3, negative: 1 })).toEqual([
    expect.objectContaining({ label: 'Positive', customerCount: 6 }),
    expect.objectContaining({ label: 'Neutral', customerCount: 3 }),
    expect.objectContaining({ label: 'Negative', customerCount: 1 }),
  ]);
});

test('renders active donut details in the center', () => {
  const markup = renderToStaticMarkup(
    createElement(AgentOverviewActiveDonutChart, {
      data: [{ key: 'pricing', label: 'Pricing', customerCount: 4, fill: '#7cb4f4' }],
      activeIndex: 0,
    }),
  );

  expect(markup).toContain('Pricing');
  expect(markup).toContain('4 customers');
  expect(markup).toContain('inset-[28%]');
  expect(markup).not.toContain('foreignObject');
});

test('does not render an active donut tooltip without a hovered row', () => {
  const markup = renderToStaticMarkup(
    createElement(AgentOverviewTopicsAndSentiment, {
      topics: [{ topicId: 'pricing', topic: 'Pricing', count: 4, description: null }],
      sentimentDistribution: { positive: 6, neutral: 3, negative: 1 },
    }),
  );

  expect(markup).not.toContain('role="tooltip"');
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
