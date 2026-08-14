# Service Editor Navigation Icons Design

## Goal

Make the service-editor navigation easier to scan by pairing each section with a clear icon and user-approved label.

## Navigation

The existing four-item order remains unchanged. Each item uses a 16px Lucide icon before the label and keeps its current selected or muted color treatment.

- `UsersRound` — Booking assignment
- `BriefcaseBusiness` — Service details
- `CalendarClock` — Appointment duration
- `ClipboardList` — Booking form

## Scope

- Change the navigation and matching section-heading copy through `SERVICE_SECTION_COPY`.
- Keep the assignment-first order, focused-section behavior, field components, form state, permissions, and save behavior unchanged.
- Add focused static-render coverage for the labels, icon classes, and selected navigation item.

## Verification

- `src/components/ServiceForm.test.tsx` verifies all four labels, their order, icon output, and default selected state.
- Run the focused form test, TypeScript validation, and `git diff --check` with Node v22.
