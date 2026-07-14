# Booking Created Reminder Event Design

## Goal

Give every successful booking creation path one shared `Booking created` event boundary that prepares eligible reminder Workpool jobs.

## Scope

The event applies to all three booking creators:

- staff booking from Calendar
- staff booking from Conversation Details
- AI agent booking through `bookAppointment`

Generic Calendar events, appointment updates, rescheduling, reconciliation, and cancellation remain outside this creation event.

## Shared Event Function

Add one small backend module that exports a function with a stable interface:

```ts
handleBookingCreated(ctx, appointmentId)
```

The function represents the `Booking created` domain event. Callers provide only the persisted appointment ID. The function logs the event with that ID and delegates reminder preparation to `scheduleWorkflowRemindersForAppointment`.

The function does not duplicate reminder eligibility, candidate calculation, deduplication, Workpool enqueue, or persistence logic. Those remain owned by the existing reminder runtime.

## Data Flow

Each creator first completes all booking records and related state changes. Immediately before returning success, it calls `handleBookingCreated` with the new Calendar appointment ID.

The shared function emits the `booking_created` console event and invokes the existing reminder runtime. The runtime loads the persisted appointment and checks the saved automation configuration, appointment status, conversation, WhatsApp channel, customer, timing candidates, and deduplication state. Every successful enqueue continues to emit `workflow_reminder_workpool_scheduled` with its Workpool ID.

Calendar staff bookings may reuse an eligible existing customer conversation but do not create or mutate an Inbox conversation. Bookings without an eligible WhatsApp conversation still emit `booking_created`; reminder preparation returns without scheduling a Workpool job.

## Transaction and Error Behavior

The event handler runs synchronously inside the same Convex mutation as booking creation. This keeps booking persistence and reminder preparation in one transactional boundary. If reminder preparation throws, the mutation fails rather than returning a successful booking that skipped required preparation.

Normal ineligibility is not an error. Disabled reminder automation, missing eligible conversation data, non-WhatsApp delivery, and expired timing candidates produce no Workpool job and preserve the successful booking.

## Logging

The shared function emits:

```ts
console.log('booking_created', { appointmentId })
```

It contains no customer identity, contact address, or message content. Existing scheduling and before-send logs remain unchanged. The Calendar-only `workflow_reminder_scheduling_after_booking_created` log is removed because the shared event replaces it for all creators.

## Testing

- Add a contract test that verifies all three booking creation entrypoints call `handleBookingCreated` after persistence and before returning success.
- Keep the existing reminder runtime tests for eligibility, deduplication, and Workpool scheduling.
- Do not add a console-log assertion test.
- Run the affected Calendar staff, Conversation Details staff, AI booking, and reminder runtime suites.

## Non-Goals

- A generic event bus, event table, queue, or schema change.
- Moving rescheduling or reconciliation through the creation event.
- Changing reminder eligibility, timing, templates, retries, or sending behavior.
- Creating an Inbox conversation solely to support reminders.
