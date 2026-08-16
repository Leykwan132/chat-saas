# Manual Event Google Calendar Sync Design

## Goal

Create a matching Google Calendar event whenever a staff member manually creates a calendar event while they have an active Google Calendar connection. Keep connected creation fail-closed so a Google failure never leaves an unsynced local event.

## Scope

Manual creation moves from a public mutation to a public action. The action authenticates the creator, asks an internal mutation to validate and create a pending Kilobot-origin event, and then uses the existing idempotent Google Calendar create writer.

When the creator has no active connection, the internal mutation completes the local event normally. When a connection exists, it records the creator as the external owner, marks the event pending, and returns a Google write payload and deterministic create operation key. The action refreshes the connection once when required, writes to the creator's primary calendar, and finalizes the existing event metadata after success. A failed Google write removes the pending event and its participants before returning the provider error.

The calendar client invokes the action with the same event fields and continues to receive the event ID after successful creation. Existing update and delete flows recognize the finalized Kilobot-origin event and keep it synchronized with Google Calendar.

The connected-account status marker changes from the Lucide glyph to `HiCheckBadge` from `react-icons/hi2`, rendered with the intended green badge and visible white check.

## Non-goals

- Changing Google-origin imported-event behavior, booking flows, connection permissions, or the PostHog connection gate.
- Syncing events to an assigned teammate's calendar instead of the creating user's calendar.
- Retrying, queueing, or retaining a local-only event after a connected Google write fails.
- Changing event-list or event-details Google Calendar source indicators.

## Failure behavior

Local-only creation remains available to users without a connection. For users with a connected calendar, refresh, provider, and finalization failures fail the request and roll back the draft local event. This preserves the selected fail-closed behavior and avoids presenting a successful event that is absent from Google Calendar.

## Verification

Unit tests cover local-only creation, connected creation, refresh-before-create, and rollback on Google failure. A UI test verifies the client calls the creation action and renders the `HiCheckBadge` status glyph. Focused frontend and Convex tests, generated API types, TypeScript checks, and diff checks validate the change.
