import { describe, expect, test } from 'vitest';
import type { Infer } from 'convex/values';
import {
  APPOINTMENT_BOOKING_STATUS_OPTIONS,
  appointmentBookingStatusClass,
  appointmentBookingStatusLabel,
} from './appointmentBookingStatusPresentation';
import {
  APPOINTMENT_BOOKING_SESSION_METRIC_STATUSES,
  APPOINTMENT_BOOKING_SESSION_STATUS_LABELS,
  AppointmentBookingSessionStatus as FrontendAppointmentBookingSessionStatus,
} from './appointmentBookingSessionStatus';
import {
  appointmentBookingSessionStatusValidator,
  AppointmentBookingSessionStatus as BackendAppointmentBookingSessionStatus,
  createEmptyAppointmentBookingSessionStatusCounts,
} from '../../convex/appointmentBookingSessionStatus';

describe('appointment booking status presentation', () => {
  test('exposes the four approved lifecycle statuses', () => {
    expect(APPOINTMENT_BOOKING_STATUS_OPTIONS.map(({ value }) => value)).toEqual([
      'booked',
      'completed',
      'cancelled',
      'no_show',
    ]);
    expect(appointmentBookingStatusLabel('no_show')).toBe('No-show');
  });

  test('uses dark green for completed', () => {
    expect(appointmentBookingStatusClass('completed')).toContain('bg-green-800');
    expect(appointmentBookingStatusClass('completed')).toContain('text-white');
    expect(appointmentBookingStatusClass('completed')).not.toContain('zinc');
  });

  test('exposes no-show in the frontend session contract', () => {
    expect(FrontendAppointmentBookingSessionStatus.NoShow).toBe('no_show');
    expect(APPOINTMENT_BOOKING_SESSION_STATUS_LABELS.no_show).toBe('No-show');
    expect(APPOINTMENT_BOOKING_SESSION_METRIC_STATUSES).toContain('no_show');
  });

  test('accepts and counts no-show in the backend session contract', () => {
    const noShowStatus: Infer<typeof appointmentBookingSessionStatusValidator> = 'no_show';

    expect(BackendAppointmentBookingSessionStatus.NoShow).toBe('no_show');
    expect(noShowStatus).toBe('no_show');
    expect(createEmptyAppointmentBookingSessionStatusCounts().no_show).toBe(0);
  });
});
