import { expect, test } from 'vitest';
import type { ScheduleShift } from '@/lib/scheduleUtils';
import {
  formatWorkflowWeeklyAvailability,
  hasAcceptingLeadMember,
} from './workflowBookingAvailabilityModel';

const weekdayShifts: ScheduleShift[] = [1, 2, 3, 4, 5].map((dayOfWeek) => ({
  dayOfWeek,
  startMinutes: 9 * 60,
  endMinutes: 17 * 60,
}));

const splitShifts: ScheduleShift[] = [
  ...[1, 2].flatMap((dayOfWeek) => [
    { dayOfWeek, startMinutes: 9 * 60, endMinutes: 12 * 60 },
    { dayOfWeek, startMinutes: 13 * 60, endMinutes: 17 * 60 },
  ]),
  { dayOfWeek: 6, startMinutes: 10 * 60, endMinutes: 14 * 60 },
];

test('groups consecutive weekdays with identical hours', () => {
  const summary = formatWorkflowWeeklyAvailability(
    weekdayShifts,
    'Asia/Kuala_Lumpur',
  );

  expect(summary.lines).toEqual(['Mon–Fri · 9:00 AM–5:00 PM']);
  expect(summary.timezoneLabel).toContain('Kuala Lumpur');
});

test('keeps split schedules compact', () => {
  expect(
    formatWorkflowWeeklyAvailability(splitShifts, 'Asia/Kuala_Lumpur').lines,
  ).toEqual([
    'Mon–Tue · 9:00 AM–12:00 PM, 1:00 PM–5:00 PM',
    'Sat · 10:00 AM–2:00 PM',
  ]);
});

test('does not invent default hours', () => {
  expect(formatWorkflowWeeklyAvailability([], undefined).lines).toEqual([
    'No hours set',
  ]);
});

test('eligibility depends only on accepting leads', () => {
  expect(hasAcceptingLeadMember([{ schedule: { enabled: false } }])).toBe(false);
  expect(hasAcceptingLeadMember([{ schedule: { enabled: true } }])).toBe(true);
});
