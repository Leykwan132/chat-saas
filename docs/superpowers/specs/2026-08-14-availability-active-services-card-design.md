# Availability Active Services Card Design

## Goal

Make a teammate’s assigned services easy to scan from Availability without repeating the surrounding availability explanation.

## Design

- Rename the section to `Active services`.
- Remove the section-level helper description.
- Render each assigned active service as its own compact bordered card.
- Each card displays the service name and its duration in minutes.
- Display the service’s description below those details only when it is present.
- Keep the section between Available hours and Time off.
- Preserve the existing empty state when no active services are assigned.

## Data and Scope

- Extend the existing schedule-detail services payload with `durationMinutes` and optional `description`.
- Do not add service editing, pricing, assignment-method details, or booking controls to Availability.

## Verification

- Page coverage verifies the new title, service duration, optional description, placement before Time off, and absence of the removed helper text.
- TypeScript and diff checks remain clean.
