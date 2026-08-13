# Weekly availability unavailable label

## Goal

Make a disabled weekday legible without changing the existing availability editor layout.

## Behavior

When a weekday has no shift drafts, its switch remains off and the time-slot area displays `Unavailable` in muted secondary text. When a weekday has one or more shift drafts, its existing time-slot controls remain unchanged. The all-day weekly mode continues to show `24 hours` and keeps weekday switches disabled.

## Implementation

`WeeklyAvailabilityEditor` already derives `isAvailable` from each weekday's shift drafts. Its unavailable rendering branch will add the label beside the weekday name, in the same horizontal area used for time controls. No persistence, API, schedule-draft, or timezone behavior changes.

## Verification

Extend the editor's focused regression test to assert the unavailable branch and label, run it red before the component edit, then green afterward. Run a TypeScript build check and whitespace diff check after the focused test.
