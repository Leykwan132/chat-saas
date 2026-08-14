# Service Editor Section Navigation Design

## Goal

Make service configuration easier to navigate by showing one focused section at a time with persistent left-side navigation.

## Layout

- The service edit page uses a two-column layout on medium and larger screens.
- A sticky left navigation lists Your service, Timing & availability, Data to collect, and Booking assignment.
- The selected item uses the rounded highlighted-row treatment from the approved reference.
- The right column renders only the selected section’s existing title, description, and fields.
- On narrow screens, the navigation becomes a horizontal, wrapping control above the active section.
- Form state remains shared across sections, so switching sections never discards edits.

## Scope

- Remove the confirming, booked, completed, cancelled, and no-show metric tiles from the service edit page.
- Stop requesting those metrics from the service edit page.
- Keep service status, deletion, save behavior, validation, assignment selection, and booking data unchanged.

## Verification

- Service-page coverage verifies the metrics query and tiles are absent.
- Service-form coverage verifies the navigation labels, active section treatment, and one-section rendering behavior.
- TypeScript and diff checks pass.
