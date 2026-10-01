# Batch Booking Update Design

## Goal

Let the agent reschedule one or more existing appointments in one confirmed request, with every target explicitly identified by its booking ID and replacement ISO start time.

## Tool Contract

The agent-facing tool is `updateBookings`:

```ts
updateBookings({
  bookings: [
    {
      bookingId: "calendar-event-id",
      startTimeIso: "2026-10-01T16:00:00+08:00",
    },
  ],
  confirmed: true,
})
```

For a multiple-booking request, the same array contains every explicit update:

```ts
updateBookings({
  bookings: [
    {
      bookingId: "october-1-booking-id",
      startTimeIso: "2026-10-01T16:00:00+08:00",
    },
    {
      bookingId: "october-5-booking-id",
      startTimeIso: "2026-10-05T14:00:00+08:00",
    },
  ],
  confirmed: true,
})
```

`bookings` has one to ten distinct entries. Each `bookingId` must come from `listCustomerBookings` in the current customer conversation. `confirmed` must be true only after the customer explicitly approves the final requested changes.

## Scope

- Replace the current agent calendar-update tool with `updateBookings`; a one-item array is the single-booking path.
- Reschedule only Kilobot-originated, non-cancelled events owned by the current conversation or its customer.
- Preserve every event's existing duration by deriving the new end time from `event.endAt - event.startAt`.
- Support different services and durations in the same request when each target independently passes ownership and availability checks.
- Continue to use the existing Google Calendar write, participant, reminder, notification, and conversation-history paths.
- Keep cancellation separate and unchanged. An update request never cancels or recreates an appointment.

## Validation and Preparation

The preparation mutation receives the full array and loads every event before changing any record. It rejects an empty, duplicate, malformed, unavailable, cancelled, Google-only, or other-customer target.

For each valid event, preparation loads its service and resolves an exact availability interval using the target start time and its preserved event duration. It excludes every target event from the availability view so a simultaneous reschedule can swap or move appointments without treating the old target rows as conflicts. It returns the complete validation failure set before any Google write starts.

Preparation records the original event state and emits a durable per-item write plan: event ID, original and requested intervals, selected assignee, connection, operation key, and Google update payload. Local-only plans need no remote write.

## Execution and Recovery

The update action refreshes every required Google connection once, then rebuilds and revalidates the full plan. It writes remote updates in deterministic request order and finalizes each local event only after its corresponding remote write succeeds.

Google does not provide a transaction across several events. If an update fails after earlier updates succeeded, the action attempts to restore every earlier remote event to its captured original interval and leaves their local records unchanged until restoration succeeds. A failed restoration persists a recoverable failed batch result and returns a system failure; it never claims that all bookings were updated.

For a fully local calendar, all validation and finalization occur in one Convex mutation. A validation failure changes no event.

## Finalization

Each finalized event receives its new start and end time, selected assignee and participants, availability intervals, reminder schedule, notification, and `event_updated` conversation record. The underlying booking session remains tied to the same calendar event ID; the update does not create a replacement session or event.

The result returns the exact updated booking IDs and intervals. A successful multi-item result directs the agent to send one concise combined confirmation that lists every changed appointment. A failure returns no cancellation/rebooking recommendation and uses the existing short system-error customer reply.

## Agent Guidance

The booking prompt instructs the model to call `listCustomerBookings` first, map the customer-named date/time to returned IDs, and submit all confirmed changes in one `updateBookings` call. It includes the single and multiple-item examples above.

The old begin-edit, active-session, and `updateBookingAppointment` path remains available only for changing customer details. Date-and-time reschedules use `updateBookings` directly, so multiple targets do not compete for one active edit session.

## Testing

- Tool contract tests cover one item, two ordered items, malformed timestamps, duplicate IDs, and the ten-item limit.
- Ownership tests reject a different conversation/customer, imported Google event, and cancelled event without changing any target.
- Preparation tests prove each request preserves its original duration and validates every target before a local mutation.
- Availability tests cover a two-booking swap and a request where one target is unavailable; the unavailable batch changes no local event.
- Sync tests cover full Google success, a Google failure restored to original times, and an unrecoverable restoration failure.
- Prompt tests assert that the agent must list bookings first, passes an array, and never recommends cancellation/rebooking for an update failure.

## Non-Goals

- Batch cancellation, replacement bookings, automatic alternative-time selection, or bulk editing customer details.
- More than ten appointments in one request.
- Changing a booking's service, duration, or customer through this tool.
