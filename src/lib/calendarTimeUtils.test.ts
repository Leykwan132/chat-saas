import { describe, expect, it } from 'vitest';
import {
  CALENDAR_TIME_OPTIONS,
  calendarTimeLabelToMinutes,
  formatCalendarTimeOption,
  parseCalendarTimeLabel,
} from './calendarTimeUtils';

describe('calendar time labels', () => {
  it('uses compact lowercase meridiem labels', () => {
    expect(formatCalendarTimeOption(23 * 60 + 20)).toBe('11:20pm');
    expect(parseCalendarTimeLabel('11:20 PM')?.label).toBe('11:20pm');
    expect(parseCalendarTimeLabel('23:20')?.label).toBe('11:20pm');
  });

  it('provides every quarter-hour option', () => {
    expect(CALENDAR_TIME_OPTIONS).toHaveLength(96);
    expect(CALENDAR_TIME_OPTIONS[0]).toBe('12:00am');
    expect(CALENDAR_TIME_OPTIONS[95]).toBe('11:45pm');
    expect(CALENDAR_TIME_OPTIONS.map(calendarTimeLabelToMinutes)).toEqual(
      Array.from({ length: 96 }, (_, index) => index * 15),
    );
  });
});
