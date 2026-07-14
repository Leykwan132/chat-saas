# Manual Booking Schedule Availability Design

## Goal

Make inbox manual booking creation use the Calendar page's schedule controls, remove the separate availability-search flow, provide immediate conflict feedback, and align the Service selector with the rest of the form.

## Approved Experience

- Render Service as a full-width control with the same 40px height, border, background, typography, and spacing as the other form controls.
- Render Booking Date with `CalendarDatePickerField`.
- Render Booking Time with `TimeSelectInput`.
- Do not render service-configured `date` and `time` fields as additional native inputs.
- Remove the Find available times button and the available-slot button grid.
- Keep availability idle until Service, Booking Date, and Booking Time are selected.
- Check the selected combination automatically when any of those three values changes and all three are present.
- Show `Checking availability…` beneath Booking Time while the request is running.
- Show `Slot is available.` beneath Booking Time in semantic green when the current combination is available.
- Show the conflict response beneath Booking Time in destructive red when unavailable.
- Disable Create booking unless the current Service, Date, and Time combination has a successful availability result.

## Schedule Data

The selected service supplies the booking time zone and duration. The frontend combines Booking Date and Booking Time in that time zone to produce `startAt`; the service duration determines `endAt`. The selected date and time are also supplied as the service's collected `date` and `time` values so required-field validation remains strict without duplicate controls.

## Frontend Boundaries

- `CalendarDatePickerField` accepts an optional label while preserving `Date` as its default for existing consumers.
- `TimeSelectInput` is reused unchanged with the `Booking Time` label.
- A small pure manual-booking model owns schedule-field filtering, selected-combination identity, and collected-field construction.
- `CreateCustomerBookingDialog` owns interaction state: idle, checking, available, or conflict.
- Service, date, and time handlers clear stale availability immediately, request one check when the combination is complete, and ignore responses for superseded combinations.

## Backend Boundaries

- Replace the slot-listing UI contract with one authenticated Convex mutation that checks a single `startAt` for the selected service and conversation.
- The check does not depend on customer collected fields; those remain validated only when creating the booking.
- Reuse the existing schedule, time-off, conflict, and assignment logic to decide whether the exact service-duration slot is available.
- Return a strict result union: available, or unavailable with a user-facing message.
- Keep the final Create mutation's availability check so a slot cannot be created after becoming unavailable between the preview check and submission.

## Error Handling

- Invalid date/time combinations remain idle and keep Create booking disabled.
- A failed availability request is displayed beneath Booking Time in destructive red.
- Changing Service, Date, or Time invalidates the prior result before checking the new combination.
- Create mutation errors continue to use the existing toast behavior.
- No hard override is provided for conflicts, unavailable schedules, or missing assignees.

## Verification

- Pure tests cover schedule-field filtering, derived collected date/time fields, and selection identity.
- Dialog regression coverage requires Calendar date/time controls, full-width Service styling, inline availability states, and absence of Find available times and slot buttons.
- Convex tests cover available and conflicting single-slot responses and final create revalidation.
- Existing Calendar date picker and inbox booking tests remain green.
- Run focused tests, targeted ESLint, Convex code generation when the public API changes, `git diff --check`, and touched-code line counts under Node 22.
