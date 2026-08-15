# Service Details Default Design

## Goal

Open a service detail page on its Service details pane so workflow users see the service information first.

## Behavior

- The workflow service link continues to navigate to `/dashboard/:agentId/services/:serviceId`.
- `ServiceForm` initially selects the `details` section, rendering Service details and its fields before a user navigates to another pane.
- The service name field uses the concise label `Name`.
- The navigation order and icons remain Service details, Appointment duration, Booking team, and Booking form.

## Scope

- Update the initial `activeSection` value in `ServiceForm`.
- Update the existing Service details form label and its static-render coverage.
- Do not change workflow routing, booking-team selection, service data, or save behavior.

## Verification

- `ServiceForm.test.tsx` verifies Service details is selected by default and that the `Name` label renders.
- Run the focused test, TypeScript validation, and `git diff --check` with Node v22.
