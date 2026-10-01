import { expect, test } from 'vitest';
import { formatCompactBookingSchedule } from './formatCompactBookingSchedule';

test('formats compact booking schedules with the localized date and start time', () => {
  const startAt = Date.UTC(2026, 5, 30, 7, 0);
  const endAt = Date.UTC(2026, 5, 30, 7, 30);

  expect(formatCompactBookingSchedule(startAt, endAt, 'Asia/Kuala_Lumpur')).toBe(
    'Tuesday, 30 Jun · 3:00 – 3:30pm',
  );

  const octoberStart = Date.UTC(2026, 9, 23, 7, 30);
  expect(
    formatCompactBookingSchedule(
      octoberStart,
      octoberStart + 30 * 60 * 1000,
      'Asia/Kuala_Lumpur',
    ),
  ).toBe('Friday, 23 Oct · 3:30 – 4:00pm');

  expect(
    formatCompactBookingSchedule(
      Date.UTC(2026, 8, 23, 3, 30),
      Date.UTC(2026, 8, 23, 4, 0),
      'Asia/Kuala_Lumpur',
    ),
  ).toBe('Wednesday, 23 Sep · 11:30am – 12:00pm');
});
