import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Infer } from 'convex/values';
import {
  APPOINTMENT_BOOKING_STATUS_OPTIONS,
  appointmentBookingStatusAccentColor,
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

  test('uses a white tag surface for every status', () => {
    for (const status of APPOINTMENT_BOOKING_STATUS_OPTIONS.map(({ value }) => value)) {
      expect(appointmentBookingStatusClass(status)).toContain('bg-background');
      expect(appointmentBookingStatusClass(status)).toContain('text-foreground');
      expect(appointmentBookingStatusClass(status)).not.toContain('bg-muted');
      expect(appointmentBookingStatusClass(status)).not.toContain('text-white');
    }
  });

  test('uses a distinct Inbox accent color for every lifecycle status', () => {
    expect(appointmentBookingStatusAccentColor('booked')).toBe('#eab308');
    expect(appointmentBookingStatusAccentColor('completed')).toBe('#15803d');
    expect(appointmentBookingStatusAccentColor('cancelled')).toBe('#dc2626');
    expect(appointmentBookingStatusAccentColor('no_show')).toBe('#f97316');

    const rowSource = readFileSync(
      new URL('../components/inbox/InboxCustomerBookingRow.tsx', import.meta.url),
      'utf8',
    );
    expect(rowSource).toContain('appointmentBookingStatusAccentColor(booking.status)');
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
