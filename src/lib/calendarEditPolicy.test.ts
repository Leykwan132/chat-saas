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

  test('allows a Google event owner to edit without calendar management permission', () => {
    expect(
      canEditCalendarEvent({
        canManageCalendar: false,
        externalOrigin: 'google',
        externalOwnerUserId: 'user_1',
        viewerUserId: 'user_1',
        externalCanEdit: true,
      }),
    ).toBe(true);
  });

  test('does not allow teammates to edit a Busy Google event', () => {
    expect(
      canEditCalendarEvent({
        canManageCalendar: true,
        viewerCanMutate: false,
      }),
    ).toBe(false);
  });
});
