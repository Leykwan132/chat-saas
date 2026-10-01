import { expect, expectTypeOf, test } from 'vitest';
import type { AppointmentBookingDisplayStatus } from '../../lib/appointmentBookingStatusPresentation';
import {
  getMostRecentCustomerBooking,
  upcomingCustomerBookings,
  type CustomerBookingHistoryItem,
} from './customerBookingsModel';

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

test('keeps the appointment in progress and later scheduled appointments', () => {
  const now = 100;
  expect(upcomingCustomerBookings([
    booking(10, 1, 'booked'),
    booking(80, 2, 'booked'),
    booking(90, 3, 'cancelled'),
    booking(120, 4, 'booked'),
    booking(200, 5, 'no_show'),
  ], now).map((item) => item.startAt)).toEqual([80, 120]);
});

test('uses the shared booking display status contract', () => {
  expectTypeOf<CustomerBookingHistoryItem['status']>().toEqualTypeOf<AppointmentBookingDisplayStatus>();
  expect(booking(40, 50, 'no_show').status).toBe('no_show');
});
