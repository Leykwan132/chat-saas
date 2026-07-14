import { describe, expect, it } from 'vitest';
import {
  buildManualBookingCollectedFields,
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

  it('derives a stable selection in the service time zone', () => {
    expect(getManualBookingSelection(
      'service-1',
      '2026-07-14',
      '2:00 PM',
      'Asia/Kuala_Lumpur',
    )).toEqual({
      key: 'service-1|2026-07-14|2:00 PM|Asia/Kuala_Lumpur',
      startAt: 1784008800000,
    });
    expect(getManualBookingSelection(
      'service-1',
      '2026-07-14',
      '',
      'Asia/Kuala_Lumpur',
    )).toBeNull();
  });
});
