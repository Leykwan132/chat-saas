import { expect, test } from 'vitest';
import {
  getReferralCodeInputState,
  normalizeReferralCodeInput,
} from './referralCode';

test('normalizes referral codes to uppercase and caps them at 13 characters', () => {
  expect(normalizeReferralCodeInput(' kilo-abcd2345 extra')).toBe(
    'KILO-ABCD2345',
  );
});

test('distinguishes empty, incomplete, invalid, and complete code input', () => {
  expect(getReferralCodeInputState('')).toBe('empty');
  expect(getReferralCodeInputState('KILO-ABC')).toBe('incomplete');
  expect(getReferralCodeInputState('OTHER-ABCD')).toBe('invalid');
  expect(getReferralCodeInputState('KILO-ABCD2345')).toBe('complete');
});
