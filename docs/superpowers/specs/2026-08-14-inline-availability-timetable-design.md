# Inline Availability Timetable Design

## Goal

Make every Availability detail page immediately show its editable weekly timetable and remove service cards from Availability.

## Page Layout

- Personal, member, admin, and organizational owner detail pages render the full `ScheduleAvailabilityEditor` inline.
- Organizational owner detail pages retain their Back link and the teammate’s role, name, and email header.
- Direct self-Availability pages continue to omit identity metadata.
- Remove the compact Available hours summary card and its edit-link chevron from organizational owner detail pages.
- The timetable is followed directly by Time off.
- Remove Active services and its empty state from every Availability detail page.

## Data and Scope

- Remove the `services` field from the schedule-detail query because Availability no longer displays service information.
- Do not change service assignment, booking eligibility, weekly-hour editing, time-off behavior, or roster navigation.

## Verification

- Page tests verify that team details render the inline editor and no edit-route link, Active services title, service names, duration, or description.
- Convex schedule-detail tests verify that the removed `services` payload is absent.
- TypeScript, diff checks, and the full project suite pass.
