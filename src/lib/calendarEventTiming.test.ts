import { describe, expect, test } from 'vitest';
import { isCalendarEventNotPast } from './calendarEventTiming';

describe('isCalendarEventNotPast', () => {
  const event = { startAt: 1_000, endAt: 2_000 };

  test.each([
    [999, true],
    [1_000, true],
    [1_500, true],
    [2_000, true],
    [2_001, false],
  ])('returns whether the event has not passed at %i', (now, expected) => {
    expect(isCalendarEventNotPast(event, now)).toBe(expected);
  });
});
