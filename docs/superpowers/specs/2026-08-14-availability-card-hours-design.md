# Availability card hours

## Goal

Show each teammate's available time directly on their roster card without changing the card's contact details or lead-assignment control.

## Behavior

Each card will render a compact weekly availability summary below its role and lead badges. The summary uses the existing weekly formatter, so grouped weekdays display concise ranges such as `Mon - Fri, 9:00 AM - 5:00 PM`. Cards with no saved shifts display `No available hours`. The schedule's enabled state, status badge, time-off state, card link, and Accepting leads toggle remain unchanged.

## Implementation

`SchedulePage` already receives each roster entry's shifts. It will pass those shifts to `UserScheduleCard`, which will call the existing `describeWeeklyAvailabilityLines` formatter and render up to its existing two summary lines in muted text. No Convex query, schedule persistence, or new formatter is needed.

## Verification

Add a server-rendered SchedulePage regression test using an active Monday-to-Friday schedule and assert the visible compact summary. Run it red before the card change and green afterward, then run TypeScript and whitespace-diff checks.
