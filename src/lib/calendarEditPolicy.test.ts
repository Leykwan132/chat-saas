import { describe, expect, test } from 'vitest';
import { canEditCalendarEvent } from './calendarEditPolicy';

describe('canEditCalendarEvent', () => {
  test('allows a calendar manager to edit an event after its end time', () => {
    expect(
      canEditCalendarEvent({
        canManageCalendar: true,
        endAt: Date.now() - 60_000,
      }),
    ).toBe(true);
  });

  test('does not allow editing without calendar management permission', () => {
    expect(
      canEditCalendarEvent({
        canManageCalendar: false,
        endAt: Date.now() + 60_000,
      }),
    ).toBe(false);
  });
});
