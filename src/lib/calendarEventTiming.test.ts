import { describe, expect, test } from 'vitest';
import { isCalendarEventHappening } from './calendarEventTiming';

describe('isCalendarEventHappening', () => {
  const event = { startAt: 1_000, endAt: 2_000 };

  test.each([
    [999, false],
    [1_000, true],
    [1_500, true],
    [2_000, false],
    [2_001, false],
  ])('returns the interval state at %i', (now, expected) => {
    expect(isCalendarEventHappening(event, now)).toBe(expected);
  });
});
