# Manual Booking Nearest Slot Design

## Goal

When staff open Create booking from Inbox, prefill the selected service with the first valid 30-minute booking slot at or after the current time.

## Decision

The Inbox manual-booking backend exposes a server-authoritative nearest-slot mutation. It starts at the server's current time, evaluates consecutive 30-minute boundaries using the existing roster, time-off, buffer, conflict, and assignment logic, and returns the earliest available interval within the existing booking search horizon.

The lookup must preserve chronological order. It does not apply a service's preferred-time ordering, because the requested default is the nearest valid slot.

## Data Flow

- The shared Create booking controller supports an optional nearest-slot loader.
- Inbox passes a loader that keeps the conversation in scope, so assignment strategies remain unchanged.
- Calendar New Booking does not pass the loader because it has no selected customer on open and may need that customer's related conversation for assignment.
- The controller formats the returned timestamps in the service time zone and fills the date, start time, and duration-derived end time.
- The existing availability check still runs for the filled interval and booking creation still revalidates it transactionally.
- If no valid slot exists in the horizon, the schedule remains unfilled and the existing manual-entry flow remains available.

## Testing

- Add a Convex test for the Inbox nearest-slot mutation, including a case where a preferred service time is later than the first valid chronological slot.
- Add a schedule-model regression showing a returned slot is converted into date and time defaults.

## Scope

No schema migration, AI booking behavior, service configuration, or existing manual time-entry behavior changes.
