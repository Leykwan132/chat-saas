import assert from 'node:assert/strict';
import { formatCompactBookingSchedule } from './formatCompactBookingSchedule';

const startAt = Date.UTC(2026, 5, 30, 7, 0);
const endAt = Date.UTC(2026, 5, 30, 7, 30);

assert.equal(
  formatCompactBookingSchedule(startAt, endAt, 'Asia/Kuala_Lumpur'),
  'June 30, 2026, 3:00 PM',
);

const octoberStart = Date.UTC(2026, 9, 23, 7, 30);
assert.equal(
  formatCompactBookingSchedule(octoberStart, octoberStart + 30 * 60 * 1000, 'Asia/Kuala_Lumpur'),
  'October 23, 2026, 3:30 PM',
);

console.log('formatCompactBookingSchedule ok');
