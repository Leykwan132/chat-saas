# Calendar New Booking Header and Empty State Design

## Goal

Make Calendar booking creation prominent at the selected-day level while preserving the selected date for every booking flow.

## Header action

The right Calendar panel header uses a single flex row with `justify-between`. The selected-day label remains left aligned. A compact dark primary `+ New Booking` button is right aligned and is shown only when `canManageCalendar` is true.

## Empty state

When the selected day has no events, the right panel uses the shared `Empty` component. It shows the Calendar icon, the existing no-events title and description, and the same compact dark primary `+ New Booking` button beneath the message when `canManageCalendar` is true.

## Interaction

Both actions call the existing `setCreateBookingOpen(true)` handler. `CalendarCreateBookingDialog` continues to receive `initialDate={format(selectedDate, 'yyyy-MM-dd')}`, so any booking begins on the active selected date.

## Boundaries

Do not alter event search, event lists, sidebar navigation, dialog fields, or calendar permissions. Use the existing shadcn `Button`, `Empty` primitives, and Lucide icons. No release-changelog entry is added because production availability is unconfirmed.

## Verification

Extend the source-level Calendar page test to assert the spaced header row, dark button styling, shared empty-state primitives, permission gating, and retained selected-date dialog prop. Run the focused Calendar test under Node v22 and run `git diff --check`.
