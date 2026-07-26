import { expect, test } from 'vitest';
import { buildCreditBalanceRows } from './creditBalanceRows';

test('keeps plan, additional, and referral balances separate', () => {
  expect(
    buildCreditBalanceRows({
      monthlyRemaining: 420,
      monthlyGranted: 500,
      additionalRemaining: 2000,
      additionalGranted: 2000,
      referralRemaining: 1000,
      referralGranted: 1000,
    }),
  ).toEqual([
    { key: 'plan', label: 'Plan', remaining: 420, granted: 500 },
    {
      key: 'additional',
      label: 'Additional',
      remaining: 2000,
      granted: 2000,
    },
    {
      key: 'referral',
      label: 'Referral',
      remaining: 1000,
      granted: 1000,
    },
  ]);
});

test('hides non-plan rows when their remaining balance is zero', () => {
  expect(
    buildCreditBalanceRows({
      monthlyRemaining: 500,
      monthlyGranted: 500,
      additionalRemaining: 0,
      additionalGranted: 2000,
      referralRemaining: 0,
      referralGranted: 1000,
    }),
  ).toEqual([
    { key: 'plan', label: 'Plan', remaining: 500, granted: 500 },
  ]);
});
