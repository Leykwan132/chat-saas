# Manual Booking Flexible Schedule Design

## Goal

Make inbox manual booking use one Google Calendar-style schedule row with a date, editable start time, and editable end time. The selected service supplies only the initial duration; the user can choose any valid start and end time.

## Approved Experience

- Render one `Schedule` field containing a Lucide clock icon, Booking Date, Start time, a dash, and End time on the same row.
- Keep the schedule row on one line at dialog widths while allowing each control to shrink without clipping its value.
- Use the existing Calendar date picker without its internal label.
- Use editable time comboboxes for Start and End.
- Opening a time combobox shows the standard half-hour time options.
- Typing accepts flexible values such as `11:41am`, `1141 AM`, and `23:41`; a valid value normalizes to the standard display label.
- A newly selected start time initializes End using the selected service's `durationMinutes`.
- Before the user edits End, subsequent Start changes continue to apply the service duration.
- Editing End marks the duration as customized, and later Start changes do not overwrite it.
- Changing Service resets the customized-duration state and derives End from the new service duration when Start is valid.
- Keep checking, available, unavailable, and failed-request feedback directly below the schedule row.

## Validation

- Service, Date, Start, and End must all be present before checking availability.
- Start and End must be parseable in the service time zone.
- End must be later than Start on the selected date.
- Invalid schedule feedback appears in destructive red and keeps Create booking disabled.
- The chosen custom interval cannot exceed 24 hours; the same rule is enforced by Convex.

## Components

- `EditableTimeCombobox` owns editable text, the standard time-option popover, normalization on Enter or blur, and combobox accessibility attributes.
- `ManualBookingScheduleField` composes the clock icon, date picker, Start combobox, separator, End combobox, and inline schedule feedback.
- `manualBookingScheduleModel` owns default-end derivation, parsing, validation, and stable interval identity.
- `CreateCustomerBookingDialog` owns service/customer state, whether End has been customized, stale-request protection, and submission.

## Availability and Creation

- The frontend sends both `startAt` and `endAt` for availability checks and creation.
- Convex validates the interval before resolving an assignee.
- A dedicated exact-interval resolver reuses the existing roster, shifts, service buffers, time off, assignment strategy, and calendar conflict rules without rounding custom times to a slot boundary.
- Preview checking and final creation call the same exact-interval resolver.
- The created calendar event and booking session persist the user's selected `startAt` and `endAt`.
- The collected `date` and `time` service fields remain derived from Booking Date and Start time.

## Testing

- Pure tests cover flexible time parsing, service-duration defaults, invalid intervals, and custom interval identity.
- Component source tests cover the editable combobox contract and the one-row clock/date/start/end composition.
- Dialog tests cover default-duration state and sending `endAt` to both preview and Create.
- Convex tests cover non-half-hour custom intervals, overlaps, invalid ranges, and final-create revalidation.
- Existing Calendar and inbox booking tests remain green.
