import { expect, expectTypeOf, test } from 'vitest';
import type { AppointmentBookingDisplayStatus } from '../../lib/appointmentBookingStatusPresentation';
import { getMostRecentCustomerBooking, type CustomerBookingHistoryItem } from './customerBookingsModel';

function booking(
  startAt: number,
  updatedAt: number,
  status: CustomerBookingHistoryItem['status'],
): CustomerBookingHistoryItem {
  return {
    bookingId: `booking-${startAt}`,
    sessionId: `session-${startAt}`,
    bookingReference: `booking-${startAt}`,
    title: 'Viewing',
    status,
    startAt,
    updatedAt,
    endAt: startAt + 30,
    date: 'June 30',
    timeRange: '3:00 PM - 3:30 PM',
    timeZone: 'Asia/Kuala_Lumpur',
    service: { serviceId: 'service', name: 'Viewing', durationMinutes: 30 },
    collectedFields: {},
  };
}

test('selects the greatest effective update time regardless of schedule or status', () => {
  expect(getMostRecentCustomerBooking([
    booking(10, 90, 'booked'),
    booking(30, 70, 'cancelled'),
    booking(20, 80, 'completed'),
  ])?.startAt).toBe(10);
  expect(getMostRecentCustomerBooking([])).toBeNull();
});

test('uses the shared booking display status contract', () => {
  expectTypeOf<CustomerBookingHistoryItem['status']>().toEqualTypeOf<AppointmentBookingDisplayStatus>();
  expect(booking(40, 50, 'no_show').status).toBe('no_show');
});
