import { describe, expect, it } from 'vitest';
import {
  createAllDayShiftDrafts,
  createStandardShiftDrafts,
  getInitialShiftsFromDetail,
  isFullWeekAllDay,
} from './scheduleShiftDrafts';

describe('full-week availability drafts', () => {
  it('recognizes only one exact all-day shift for every weekday', () => {
    const allDay = createAllDayShiftDrafts();

    expect(isFullWeekAllDay(allDay)).toBe(true);
    expect(isFullWeekAllDay(allDay.slice(0, 6))).toBe(false);
    expect(isFullWeekAllDay([...allDay.slice(0, 6), allDay[0]!])).toBe(false);
    expect(isFullWeekAllDay(allDay.map((shift, index) =>
      index === 3 ? { ...shift, startMinutes: 540, endMinutes: 1020 } : shift,
    ))).toBe(false);
    expect(isFullWeekAllDay([...allDay, { ...allDay[0]!, key: 'duplicate' }])).toBe(false);
  });

  it('builds complete all-day and standard weekly drafts', () => {
    expect(createAllDayShiftDrafts()).toEqual(
      Array.from({ length: 7 }, (_, dayOfWeek) => ({
        key: `shift-${dayOfWeek}-0-1440-${dayOfWeek}`,
        dayOfWeek,
        startMinutes: 0,
        endMinutes: 1440,
      })),
    );
    expect(createStandardShiftDrafts()).toEqual(
      Array.from({ length: 7 }, (_, dayOfWeek) => ({
        key: `shift-${dayOfWeek}-540-1020-${dayOfWeek}`,
        dayOfWeek,
        startMinutes: 540,
        endMinutes: 1020,
      })),
    );
  });

  it('preserves persisted all-day shifts during editor initialization', () => {
    const allDay = createAllDayShiftDrafts().map(
      ({ dayOfWeek, startMinutes, endMinutes }) => ({
        dayOfWeek,
        startMinutes,
        endMinutes,
      }),
    );

    expect(getInitialShiftsFromDetail({ shifts: allDay, schedule: {} })).toEqual(allDay);
  });
});
