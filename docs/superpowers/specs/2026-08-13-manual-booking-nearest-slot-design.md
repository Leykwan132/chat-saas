# Manual Booking Nearest Slot Design

## Goal

When staff open Create booking from Inbox or New Booking from Calendar, prefill the selected service with the first valid 30-minute booking slot at or after the current time.

## Decision

Each manual-booking backend exposes a server-authoritative nearest-slot mutation. It starts at the server's current time, evaluates consecutive 30-minute boundaries using the existing roster, time-off, buffer, conflict, and assignment logic, and returns the earliest available interval within the existing booking search horizon.

The lookup must preserve chronological order. It does not apply a service's preferred-time ordering, because the requested default is the nearest valid slot.

## Data Flow

- The shared Create booking controller requests the nearest slot after the active services load and whenever the staff member selects another service.
- The Inbox mutation keeps the conversation in scope so assignment strategies remain unchanged.
- The Calendar mutation resolves the selected customer's related conversation in the same way as its existing availability and creation mutations.
- The controller formats the returned timestamps in the service time zone and fills the date, start time, and duration-derived end time.
- The existing availability check still runs for the filled interval and booking creation still revalidates it transactionally.
- If no valid slot exists in the horizon, the schedule remains unfilled and the existing manual-entry flow remains available.

## Testing

- Add Convex tests for Inbox and Calendar nearest-slot mutations, including a case where a preferred service time is later than the first valid chronological slot.
- Add a controller-level regression showing a returned slot is converted into date and time defaults and checked for availability.

## Scope

No schema migration, AI booking behavior, service configuration, or existing manual time-entry behavior changes.
