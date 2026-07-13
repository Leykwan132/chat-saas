# Task 1 Re-review Package

```diff
diff --git a/convex/appointmentBookingSessionStatus.ts b/convex/appointmentBookingSessionStatus.ts
index fd793a69..ea17d75f 100644
--- a/convex/appointmentBookingSessionStatus.ts
+++ b/convex/appointmentBookingSessionStatus.ts
@@ -5,7 +5,9 @@ export const AppointmentBookingSessionStatus = {
   Confirming: "confirming",
   Editing: "editing",
   Booked: "booked",
+  Completed: "completed",
   Cancelled: "cancelled",
+  NoShow: "no_show",
 } as const;
 
 export type AppointmentBookingSessionStatus =
@@ -16,7 +18,9 @@ export const appointmentBookingSessionStatusValidator = v.union(
   v.literal(AppointmentBookingSessionStatus.Confirming),
   v.literal(AppointmentBookingSessionStatus.Editing),
   v.literal(AppointmentBookingSessionStatus.Booked),
+  v.literal(AppointmentBookingSessionStatus.Completed),
   v.literal(AppointmentBookingSessionStatus.Cancelled),
+  v.literal(AppointmentBookingSessionStatus.NoShow),
 );
 
 const ACTIVE_APPOINTMENT_BOOKING_SESSION_STATUSES: readonly AppointmentBookingSessionStatus[] = [
@@ -40,6 +44,8 @@ export function createEmptyAppointmentBookingSessionStatusCounts(): Record<
     [AppointmentBookingSessionStatus.Confirming]: 0,
     [AppointmentBookingSessionStatus.Editing]: 0,
     [AppointmentBookingSessionStatus.Booked]: 0,
+    [AppointmentBookingSessionStatus.Completed]: 0,
     [AppointmentBookingSessionStatus.Cancelled]: 0,
+    [AppointmentBookingSessionStatus.NoShow]: 0,
   };
 }
diff --git a/src/lib/appointmentBookingSessionStatus.ts b/src/lib/appointmentBookingSessionStatus.ts
index cb854215..e45fbb7f 100644
--- a/src/lib/appointmentBookingSessionStatus.ts
+++ b/src/lib/appointmentBookingSessionStatus.ts
@@ -2,7 +2,9 @@ export const AppointmentBookingSessionStatus = {
   Collecting: "collecting",
   Confirming: "confirming",
   Booked: "booked",
+  Completed: "completed",
   Cancelled: "cancelled",
+  NoShow: "no_show",
 } as const;
 
 export type AppointmentBookingSessionStatus =
@@ -13,12 +15,16 @@ export type AppointmentBookingSessionStatusCounts = Record<AppointmentBookingSes
 export const APPOINTMENT_BOOKING_SESSION_METRIC_STATUSES: readonly AppointmentBookingSessionStatus[] = [
   AppointmentBookingSessionStatus.Confirming,
   AppointmentBookingSessionStatus.Booked,
+  AppointmentBookingSessionStatus.Completed,
   AppointmentBookingSessionStatus.Cancelled,
+  AppointmentBookingSessionStatus.NoShow,
 ];
 
 export const APPOINTMENT_BOOKING_SESSION_STATUS_LABELS: Record<AppointmentBookingSessionStatus, string> = {
   [AppointmentBookingSessionStatus.Collecting]: "Collecting details",
   [AppointmentBookingSessionStatus.Confirming]: "Confirming",
   [AppointmentBookingSessionStatus.Booked]: "Booked",
+  [AppointmentBookingSessionStatus.Completed]: "Completed",
   [AppointmentBookingSessionStatus.Cancelled]: "Cancelled",
+  [AppointmentBookingSessionStatus.NoShow]: "No-show",
 };

```

## src/lib/appointmentBookingStatusPresentation.test.ts

```
import { describe, expect, test } from 'vitest';
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
    expect(BackendAppointmentBookingSessionStatus.NoShow).toBe('no_show');
    expect(appointmentBookingSessionStatusValidator.json).toMatchObject({
      type: 'union',
      value: expect.arrayContaining([{ type: 'literal', value: 'no_show' }]),
    });
    expect(createEmptyAppointmentBookingSessionStatusCounts().no_show).toBe(0);
  });
});

```

## src/components/inbox/customerBookingsModel.ts

```
import type { AppointmentBookingDisplayStatus } from '../../lib/appointmentBookingStatusPresentation';

export type CustomerBookingHistoryItem = {
  bookingId: string;
  sessionId: string;
  bookingReference: string;
  title: string;
  status: AppointmentBookingDisplayStatus;
  startAt: number;
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
    booking.startAt > mostRecent.startAt ? booking : mostRecent,
  );
}

```

## src/components/inbox/customerBookingsModel.test.ts

```
import { expect, expectTypeOf, test } from 'vitest';
import type { AppointmentBookingDisplayStatus } from '../../lib/appointmentBookingStatusPresentation';
import { getMostRecentCustomerBooking, type CustomerBookingHistoryItem } from './customerBookingsModel';

function booking(startAt: number, status: CustomerBookingHistoryItem['status']): CustomerBookingHistoryItem {
  return {
    bookingId: `booking-${startAt}`,
    sessionId: `session-${startAt}`,
    bookingReference: `booking-${startAt}`,
    title: 'Viewing',
    status,
    startAt,
    endAt: startAt + 30,
    date: 'June 30',
    timeRange: '3:00 PM - 3:30 PM',
    timeZone: 'Asia/Kuala_Lumpur',
    service: { serviceId: 'service', name: 'Viewing', durationMinutes: 30 },
    collectedFields: {},
  };
}

test('selects the greatest scheduled start as most recent regardless of status', () => {
  expect(getMostRecentCustomerBooking([
    booking(10, 'booked'),
    booking(30, 'cancelled'),
    booking(20, 'completed'),
  ])?.startAt).toBe(30);
  expect(getMostRecentCustomerBooking([])).toBeNull();
});

test('uses the shared booking display status contract', () => {
  expectTypeOf<CustomerBookingHistoryItem['status']>().toEqualTypeOf<AppointmentBookingDisplayStatus>();
  expect(booking(40, 'no_show').status).toBe('no_show');
});

```

