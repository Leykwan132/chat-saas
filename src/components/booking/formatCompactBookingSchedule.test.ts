import { expect, test } from 'vitest';
import { formatCompactBookingSchedule } from './formatCompactBookingSchedule';

test('formats compact booking schedules with the localized date and start time', () => {
  const startAt = Date.UTC(2026, 5, 30, 7, 0);
  const endAt = Date.UTC(2026, 5, 30, 7, 30);

  expect(formatCompactBookingSchedule(startAt, endAt, 'Asia/Kuala_Lumpur')).toBe(
    'June 30, 2026, 3:00 PM',
  );

  const octoberStart = Date.UTC(2026, 9, 23, 7, 30);
  expect(
    formatCompactBookingSchedule(
      octoberStart,
      octoberStart + 30 * 60 * 1000,
      'Asia/Kuala_Lumpur',
    ),
  ).toBe('October 23, 2026, 3:30 PM');
});
