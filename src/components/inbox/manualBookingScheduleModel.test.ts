import { describe, expect, it } from 'vitest';
import {
  buildManualBookingCollectedFields,
  defaultManualBookingEndTime,
  getManualBookingSelection,
  manualBookingCustomerFields,
} from './manualBookingScheduleModel';

describe('manual booking schedule model', () => {
  it('separates schedule fields from customer fields', () => {
    expect(manualBookingCustomerFields([
      { key: 'date', label: 'Booking Date', type: 'date' },
      { key: 'TIME', label: 'Booking Time', type: 'time' },
      { key: 'name', label: 'Customer Name', type: 'text' },
    ])).toEqual([{ key: 'name', label: 'Customer Name', type: 'text' }]);
  });

  it('adds the selected schedule to collected fields', () => {
    expect(buildManualBookingCollectedFields(
      { name: 'Kwan' },
      '2026-07-14',
      '2:00 PM',
    )).toEqual({
      name: 'Kwan',
      date: '2026-07-14',
      time: '2:00 PM',
    });
  });

  it('defaults the end time from a flexible start and service duration', () => {
    expect(defaultManualBookingEndTime('11:41am', 60)).toBe('12:41 PM');
    expect(defaultManualBookingEndTime('not a time', 60)).toBe('');
  });

  it('derives a stable custom interval in the service time zone', () => {
    expect(getManualBookingSelection(
      'service-1',
      '2026-07-14',
      '2:07 PM',
      '3:22 PM',
      'Asia/Kuala_Lumpur',
    )).toEqual({
      kind: 'ready',
      key: 'service-1|2026-07-14|2:07 PM|3:22 PM|Asia/Kuala_Lumpur',
      startAt: 1784009220000,
      endAt: 1784013720000,
    });
  });

  it('distinguishes incomplete and invalid schedules', () => {
    expect(getManualBookingSelection(
      'service-1',
      '2026-07-14',
      '',
      '',
      'Asia/Kuala_Lumpur',
    )).toEqual({ kind: 'incomplete' });
    expect(getManualBookingSelection(
      'service-1',
      '2026-07-14',
      'later',
      '3:00 PM',
      'Asia/Kuala_Lumpur',
    )).toEqual({ kind: 'invalid', message: 'Enter a valid start and end time.' });
    expect(getManualBookingSelection(
      'service-1',
      '2026-07-14',
      '3:00 PM',
      '2:00 PM',
      'Asia/Kuala_Lumpur',
    )).toEqual({ kind: 'invalid', message: 'End time must be after start time.' });
  });
});
