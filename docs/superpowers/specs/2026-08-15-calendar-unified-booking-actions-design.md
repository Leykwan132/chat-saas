# Calendar Unified Booking Actions Design

## Goal

Make every Calendar creation action open the same booking dialog for the active selected date, with the primary header action aligned to the far-right edge of its panel.

## Header alignment

`CalendarDayHeader` fills its parent width. Its existing `justify-between` layout keeps the selected-day label at the left and the dark New Booking button at the far-right edge.

## Unified booking action

The calendar-grid context menu retains its creation affordance but changes its label from `Create event` to `Create Booking`. It invokes the same parent callback used by the header and no-events actions.

Before opening the dialog from a grid cell, `CalendarPage` selects that cell’s date. `CalendarCreateBookingDialog` continues to receive its `initialDate` from `selectedDate`, so grid, header, and empty-state actions all create bookings for the intended day.

## Boundaries

Keep existing event details, editing, and deletion behavior unchanged. Do not change the generic event form or mutation code in this task because it remains relevant to editing existing events. The only altered creation entry point is the grid context-menu action.

## Verification

Extend the rendered Calendar component tests to verify the header fills its parent width and the grid-cell context menu renders `Create Booking` rather than `Create event`. Add a focused CalendarPage behavior test for selecting a grid date before opening the booking dialog. Run focused tests under Node v22 and `git diff --check`.

## Release

Production availability is unconfirmed, so do not add a release-changelog entry.
