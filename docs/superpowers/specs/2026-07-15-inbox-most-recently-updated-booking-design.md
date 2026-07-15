# Inbox Most Recently Updated Booking Design

## Goal

The compact booking card immediately above the Inbox reply prompt shows the booking with the most recent effective update instead of the booking with the latest scheduled start time.

## Effective Update Time

Each booking returned by `appointmentBooking/customerBookings.listForConversation` includes an `updatedAt` value calculated as the greater of the calendar event's `updatedAt` and the appointment booking session's `updatedAt`.

This single value covers both relevant update sources:

- Calendar event edits, including schedule and booking-detail changes.
- Booking session lifecycle changes, including completed, cancelled, and no-show status updates.

Both source documents already require numeric `updatedAt` fields, so the projection does not add a fallback or schema migration.

## Selection and Ordering

`getMostRecentCustomerBooking` selects the booking with the greatest `updatedAt`. The compact card above the prompt and its associated Booked rail marker continue consuming this shared selector.

The expanded Bookings history keeps the backend's current descending scheduled-start order. This change affects only which booking is surfaced as the compact current-context card; it does not reorder history or change booking status eligibility.

If two bookings have the same effective `updatedAt`, the existing first item wins. Because the backend history is already ordered by scheduled start descending, this produces a stable scheduled-start tie-break without another sort.

## Verification

Backend coverage verifies that the returned `updatedAt` is the maximum of the event and session timestamps. Frontend model coverage verifies that a booking with an earlier scheduled start is selected when its effective update is newer, while empty input still returns `null`.
