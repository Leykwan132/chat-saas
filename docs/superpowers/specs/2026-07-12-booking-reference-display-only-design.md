# Booking Reference Display-Only Design

## Goal

Keep the booking reference visible in calendar event details while removing it from the event-detail edit form.

## Behavior

- View mode continues to show the booking reference as read-only event information.
- Edit mode does not render a booking reference row, input, placeholder, or disabled control.
- Saving edits does not alter the booking reference or its underlying event identity.
- Other editable booking fields and actions remain unchanged.

## Implementation

Remove the Booking reference `EditRow` from `CalendarEventDetailsEditBody`. Preserve the existing display row created by `CalendarEventDetailsBody`. No schema, query, mutation, or migration changes are required.

## Verification

Add a focused source regression proving the display component retains Booking reference while the edit component omits it. Run the focused calendar tests, TypeScript, targeted ESLint, and `git diff --check`.
