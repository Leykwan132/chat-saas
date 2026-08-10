import { expect, test } from 'vitest';
import { formatRenewalDate } from './formatRenewalDate';

test('formats renewal timestamps in Malaysia time', () => {
  expect(formatRenewalDate(Date.UTC(2026, 8, 10, 8))).toBe(
    'Sept 10, 2026 at 4:00 PM MYT',
  );
});
