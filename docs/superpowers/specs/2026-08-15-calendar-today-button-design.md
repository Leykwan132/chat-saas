# Calendar Today button design

## Goal

Keep a visible Today button immediately beside the Calendar month label.

## Header layout

The left side of the Calendar content header contains the formatted visible month followed by a compact Today button. The right side remains unchanged: Google Calendar connection control, time-zone control, then previous and next month navigation.

## Interaction

Selecting Today calls the existing date-selection path with the current date. That path normalizes the selected day, updates the visible month, clears the selected event, and clears the day-event search. The button remains visible even when today is already selected.

## Scope

This is a Calendar header-only change. It does not modify date navigation, timezone behavior, Google Calendar connection behavior, or calendar data.

## Verification

Update the Calendar header source-level regression test to require the Today button and to verify it is rendered alongside the month label. Run that focused test under Node v22 and verify the diff has no whitespace errors.
