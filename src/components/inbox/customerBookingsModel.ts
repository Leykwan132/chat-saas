import type { AppointmentBookingDisplayStatus } from '../../lib/appointmentBookingStatusPresentation';

export type CustomerBookingHistoryItem = {
  bookingId: string;
  sessionId: string;
  bookingReference: string;
  title: string;
  status: AppointmentBookingDisplayStatus;
  startAt: number;
  updatedAt: number;
  endAt: number;
  date: string;
  timeRange: string;
  timeZone: string;
  teamMember?: string;
  remarks?: string;
  service: {
    serviceId: string;
    name: string;
    durationMinutes: number;
    fields?: Array<{ key: string; label: string; type?: string }>;
  };
  collectedFields: Record<string, string | number | boolean | null>;
};

export function getMostRecentCustomerBooking(
  bookings: CustomerBookingHistoryItem[],
) {
  if (bookings.length === 0) return null;
  return bookings.reduce((mostRecent, booking) =>
    booking.updatedAt > mostRecent.updatedAt ? booking : mostRecent,
  );
}
