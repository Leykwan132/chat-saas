# Manual Booking Service Eligibility Design

## Goal

Allow staff to create a manual booking whenever the selected agent has an active, unarchived service, independently of the AI workflow configuration.

## Decision

Manual booking entry points in Inbox and Calendar will load active, unarchived services directly from the agent's service catalogue. AI booking sessions will keep their existing workflow service-selection filter.

## Data Flow

- Inbox Create booking and Calendar New booking call their existing `getCreateOptions` queries.
- Those queries use a manual-booking service helper that excludes inactive and archived services only.
- Booking availability and creation retain their existing agent ownership and active-service validation.
- AI booking session functions continue using the workflow-filtered helper.

## Testing

Add focused Convex regressions proving both Inbox and Calendar manual-booking option queries return an active service when no Book appointment workflow node exists.

## Scope

No schema changes, UI changes, workflow changes, or changes to AI booking behavior.
