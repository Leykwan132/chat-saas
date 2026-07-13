# Task 1 Review Package

## Working-tree diff

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
diff --git a/convex/schema.ts b/convex/schema.ts
index 6125a09d..40e52c2b 100644
--- a/convex/schema.ts
+++ b/convex/schema.ts
@@ -1275,6 +1275,7 @@ export default defineSchema({
     updatedAt: v.number(),
   })
     .index("by_conversationId", ["conversationId"])
+    .index("by_calendarEventId", ["calendarEventId"])
     .index("by_agentId_and_updatedAt", ["agentId", "updatedAt"]),
   quickReplies: defineTable({
     teamId: v.id("teams"),
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

## Full file: src/components/inbox/customerBookingsModel.ts

```
export type CustomerBookingHistoryItem = {
  bookingId: string;
  sessionId: string;
  bookingReference: string;
  title: string;
  status: 'booked' | 'completed' | 'cancelled' | 'no_show';
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

## Full file: src/lib/appointmentBookingStatusPresentation.ts

```
export const APPOINTMENT_BOOKING_STATUS_OPTIONS = [
  { value: 'booked', label: 'Scheduled', className: 'bg-emerald-700 text-white' },
  { value: 'completed', label: 'Completed', className: 'bg-green-800 text-white' },
  { value: 'cancelled', label: 'Cancelled', className: 'bg-red-700 text-white' },
  { value: 'no_show', label: 'No-show', className: 'bg-amber-700 text-white' },
] as const;

export type AppointmentBookingDisplayStatus =
  (typeof APPOINTMENT_BOOKING_STATUS_OPTIONS)[number]['value'];

const PRESENTATION_BY_STATUS = Object.fromEntries(
  APPOINTMENT_BOOKING_STATUS_OPTIONS.map((option) => [option.value, option]),
) as Record<
  AppointmentBookingDisplayStatus,
  (typeof APPOINTMENT_BOOKING_STATUS_OPTIONS)[number]
>;

export const appointmentBookingStatusLabel = (status: AppointmentBookingDisplayStatus) =>
  PRESENTATION_BY_STATUS[status].label;

export const appointmentBookingStatusClass = (status: AppointmentBookingDisplayStatus) =>
  PRESENTATION_BY_STATUS[status].className;

```

## Full file: src/lib/appointmentBookingStatusPresentation.test.ts

```
import { describe, expect, test } from 'vitest';
import {
  APPOINTMENT_BOOKING_STATUS_OPTIONS,
  appointmentBookingStatusClass,
  appointmentBookingStatusLabel,
} from './appointmentBookingStatusPresentation';

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
});

```

