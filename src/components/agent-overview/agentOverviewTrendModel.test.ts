import { expect, test } from 'vitest';
import { buildOverviewTrendRows } from './agentOverviewTrendModel';

const summaryDaily = [
  { date: '2026-07-01', bookings: 1, aiAssistedConversations: 2, escalations: 1 },
  { date: '2026-07-02', bookings: 2, aiAssistedConversations: 3, escalations: 0 },
  { date: '2026-07-03', bookings: 0, aiAssistedConversations: 0, escalations: 0 },
];

const creditDaily = [
  { date: '2026-07-01', credits: 10 },
  { date: '2026-07-02', credits: 15 },
];

test('buildOverviewTrendRows returns daily metric rows by default', () => {
  expect(buildOverviewTrendRows(summaryDaily, creditDaily)).toMatchObject([
    {
      date: '2026-07-01',
      aiAssistedConversations: 2,
      credits: 10,
      bookings: 1,
      humanEscalations: 1,
    },
    {
      date: '2026-07-02',
      aiAssistedConversations: 3,
      credits: 15,
      bookings: 2,
      humanEscalations: 0,
    },
    {
      date: '2026-07-03',
      aiAssistedConversations: 0,
      credits: 0,
      bookings: 0,
      humanEscalations: 0,
    },
  ]);
});

test('buildOverviewTrendRows can return cumulative metric rows', () => {
  expect(buildOverviewTrendRows(summaryDaily, creditDaily, 'cumulative')).toMatchObject([
    {
      date: '2026-07-01',
      aiAssistedConversations: 2,
      credits: 10,
      bookings: 1,
      humanEscalations: 1,
    },
    {
      date: '2026-07-02',
      aiAssistedConversations: 5,
      credits: 25,
      bookings: 3,
      humanEscalations: 1,
    },
    {
      date: '2026-07-03',
      aiAssistedConversations: 5,
      credits: 25,
      bookings: 3,
      humanEscalations: 1,
    },
  ]);
});
