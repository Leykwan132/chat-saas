# Weekly Availability Time Combobox Design

## Goal

Make weekly availability times easier to read and edit without changing the stored schedule model.

## Interaction

Each start and end time control becomes an editable combobox. It presents the existing 15-minute options and accepts typed clock times. Accepted input includes 12-hour forms such as `9am` and `9:07 PM`, and 24-hour forms such as `09:00` and `17:00`.

On selection, blur, or Enter, valid input is normalized to the current compact display format and converted to the existing minutes-from-midnight value. Invalid input remains visible but does not update the schedule. An end time must remain later than its start time; the existing start-time update behaviour continues to correct an invalid end value.

## Visual treatment

Day labels use standard body-size text rather than the current large label treatment. Time inputs use a larger text size for scannability. Day and 24/7 controls use the shared standard Switch dimensions without custom scaling.

## Boundaries

The schedule data structure, 15-minute preset list, multiple time slots, 24/7 behaviour, timezone controls, and save flow remain unchanged. This work is limited to the weekly availability editor and a reusable schedule-time combobox component.

## Verification

Tests will cover accepted custom input normalization, conversion to minute values, and the editor rendering its editable combobox controls while retaining its existing unavailable and 24/7 behaviour.
