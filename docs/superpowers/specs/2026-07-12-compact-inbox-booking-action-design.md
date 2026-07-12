# Compact Inbox Booking Action Design

## Goal

Show only Edit booking on the compact booking card above the inbox prompt input.

## Behavior

- The compact prompt-area booking card renders Edit booking as its only action.
- Mark as completed remains available on the expanded booking-details card.
- The completion mutation, confirmation dialog, permissions, and completed status remain unchanged.
- Booking title, date, time, styling, and Edit booking behavior remain unchanged.

## Implementation

Remove `onMarkCompleted` and `disableMarkCompleted` from the compact action object in `InboxBookingDetailsCard`. Keep the expanded action object unchanged.

## Verification

Add a focused regression that distinguishes compact actions from expanded actions. Run the focused test, targeted ESLint, TypeScript, and `git diff --check`.
