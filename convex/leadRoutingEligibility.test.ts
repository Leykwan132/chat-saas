import { expect, test } from 'vitest';
import type { Doc } from './_generated/dataModel';
import { isUserEligible } from './leadRouting/eligibility';

const now = Date.UTC(2026, 7, 14, 2, 0);

const legacySchedule = {
  enabled: false,
  mode: 'manual',
  manualStatus: 'away',
  timezone: 'Asia/Kuala_Lumpur',
} as Doc<'userSchedules'>;

const fridayMorningShift = [
  { dayOfWeek: 5, startMinutes: 540, endMinutes: 1020 },
] as Doc<'userShifts'>[];

test('uses weekly hours instead of legacy status for lead eligibility', () => {
  expect(isUserEligible(now, legacySchedule, fridayMorningShift, [])).toBe(true);
});

test('excludes a teammate on active time off', () => {
  const activeTimeOff = [
    { startAt: now - 60_000, endAt: now + 60_000 },
  ] as Doc<'userTimeOff'>[];

  expect(isUserEligible(now, legacySchedule, fridayMorningShift, activeTimeOff)).toBe(false);
});
