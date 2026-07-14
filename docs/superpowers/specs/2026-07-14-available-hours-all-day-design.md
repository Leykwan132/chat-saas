# Available Hours 24/7 Design

## Goal

Make it easy to mark a person available for bookings at any time on every day of the week. Keep the setting visually clear in Available Hours, store it in the existing schedule model, and ensure AI booking availability checks interpret it correctly.

## Scope

- Remove the timezone control's separate bordered card while retaining the timezone label and selector.
- Add one global switch below all seven weekday rows.
- Label the switch `Available 24/7`.
- Add the supporting text `Set availability to 24 hours for all seven days.`
- Make enabling the switch replace the weekly draft with seven all-day shifts.
- Make disabling the switch replace the weekly draft with seven 9:00am–5:00pm shifts.
- Preserve existing custom weekday controls when the global switch is off.
- Preserve existing calendar-conflict, time-off, schedule-enabled, assignment, and booking-slot behavior.

## Editor Layout

The weekday rows remain inside their existing availability card. The `Available 24/7` control appears as the final row below Saturday, separated consistently from the weekday rows.

The timezone label and selector remain beside the availability card at the current desktop breakpoint, but their `rounded-xl`, border, background, and padding container is removed. The controls keep their existing intrinsic width and accessible label relationship.

When `Available 24/7` is on:

- All seven weekday switches display as on.
- The weekday switches are disabled.
- The time selectors, add-slot buttons, and remove-slot buttons are replaced by the non-editable text `24 hours`.
- The global switch remains interactive so the user can return to standard hours.

When `Available 24/7` is off, all weekday controls are editable and each day initially shows 9:00am–5:00pm.

## Interaction Semantics

The global switch is derived from the weekly draft. It is on only when every weekday has exactly one shift with `startMinutes: 0` and `endMinutes: 1440`.

Turning it on replaces every existing custom, unavailable, or multi-slot day with these seven shifts:

```ts
[
  { dayOfWeek: 0, startMinutes: 0, endMinutes: 1440 },
  { dayOfWeek: 1, startMinutes: 0, endMinutes: 1440 },
  { dayOfWeek: 2, startMinutes: 0, endMinutes: 1440 },
  { dayOfWeek: 3, startMinutes: 0, endMinutes: 1440 },
  { dayOfWeek: 4, startMinutes: 0, endMinutes: 1440 },
  { dayOfWeek: 5, startMinutes: 0, endMinutes: 1440 },
  { dayOfWeek: 6, startMinutes: 0, endMinutes: 1440 },
]
```

Turning it off replaces the all-day shifts with seven shifts from minute `540` through minute `1020`, representing 9:00am–5:00pm. Previous custom hours are not restored. Both transitions remain draft-only until the user presses Save.

## Availability Data Contract

The existing `userShifts` rows remain the only persisted weekly-availability contract. No `allDay` or `available24x7` field is added to `userSchedules`.

One shift spanning minute `0` through minute `1440` means that its weekday is available for the full local calendar day in the schedule's IANA timezone. A weekly schedule is 24/7 only when all seven weekdays contain that exact all-day shift.

The frontend must stop converting persisted all-day shifts to 9:00am–5:00pm during draft initialization, dirty-state comparison, and summary display. Existing all-day rows therefore round-trip without data loss.

The Convex mutation continues to replace shift rows, and the existing data model accepts the end-of-day boundary of `1440`. No schema migration is required.

## AI Booking Behavior

The AI agent does not infer availability from the switch label or inspect a separate boolean. Its `checkAvailability` tool calls the existing booking-slot generator, which evaluates candidate appointment intervals against `userShifts` in the schedule timezone.

For an all-day shift, every interval beginning at or after minute `0` and ending by minute `1440` passes the weekly-hours check. A slot can still be excluded when:

- The user's schedule is disabled.
- The slot overlaps time off.
- The slot conflicts with an existing calendar event.
- The service's assignee or assignment strategy does not select that user.
- The requested service duration, buffer, date range, or slot limit excludes it.

The tool returns concrete bookable timestamps to the agent. This keeps the agent-facing contract consistent for custom and 24/7 schedules and avoids exposing internal schedule representation in the conversation prompt.

## Error Handling

- Toggling either direction produces a complete valid seven-day draft in one state transition.
- Saving uses the existing failure behavior and keeps the draft visible if persistence fails.
- An exact all-day schedule is recognized from persisted shifts after reload.
- A partially all-day schedule does not activate the global switch and remains editable as a custom weekly schedule.
- Timezone changes continue to affect how stored weekday/minute shifts map to real timestamps.

## Testing

- A schedule-model test proves seven exact `0–1440` shifts are recognized as 24/7.
- A schedule-model test proves missing days, duplicate shifts, custom hours, and mixed all-day/custom weeks are not recognized as 24/7.
- A transition test proves enabling replaces every prior schedule with seven all-day shifts.
- A transition test proves disabling replaces the schedule with seven 9:00am–5:00pm shifts.
- An editor test proves the label and supporting text render below the weekday rows.
- An editor test proves per-day controls cannot create contradictory edits while 24/7 is enabled.
- A layout test proves the timezone selector remains present without its bordered card wrapper.
- A round-trip regression proves persisted all-day shifts are no longer normalized to 9:00am–5:00pm.
- A Convex booking-availability test proves an overnight or off-hours slot inside an all-day shift is offered while calendar conflicts and time off still exclude slots.

## Non-Goals

- Remembering or restoring custom hours after the global switch is turned off.
- Adding an all-day database flag.
- Bypassing time off, calendar conflicts, disabled schedules, service rules, or assignment rules.
- Changing the AI booking tool schema or exposing raw shift rows to the model.
- Changing availability for only a subset of weekdays through the global control.
