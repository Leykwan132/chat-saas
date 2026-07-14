# Shared Staff Booking and Booking Created Reminder Event Design

## Goal

Give Calendar and Inbox staff bookings one shared creation function, then give every successful staff or AI booking one shared `Booking created` event boundary that prepares eligible reminder Workpool jobs.

## Scope

The event applies to all three booking creators:

- staff booking from Calendar
- staff booking from Conversation Details
- AI agent booking through `bookAppointment`

Generic Calendar events, appointment updates, rescheduling, reconciliation, and cancellation remain outside this creation event.

## Shared Staff Booking Function

Calendar and Inbox keep separate public mutations because their authorization, customer resolution, and availability inputs differ. After resolving those inputs, both mutations call one shared function:

```ts
createStaffBooking(ctx, resolvedBookingInput)
```

The shared function owns Calendar event creation, participant creation, booked-session persistence, round-robin state, optional Inbox conversation bookkeeping, and the `Booking created` event. Its input includes the already-resolved service, team, customer, optional eligible conversation, assignee, slot, collected fields, remarks, and whether the Inbox conversation should be marked booked.

Calendar can attach an eligible existing conversation for reminder delivery while setting Inbox bookkeeping off. Conversation Details passes its conversation with Inbox bookkeeping on, preserving its existing status update and conversation event. This keeps the two staff entrypoints on the same creation path without making Calendar create or mutate an Inbox conversation.

## Shared Event Function

Add one small backend module that exports a function with a stable interface:

```ts
handleBookingCreated(ctx, appointmentId)
```

The function represents the `Booking created` domain event. Callers provide only the persisted appointment ID. The function logs the event with that ID and delegates reminder preparation to `scheduleWorkflowRemindersForAppointment`.

The function does not duplicate reminder eligibility, candidate calculation, deduplication, Workpool enqueue, or persistence logic. Those remain owned by the existing reminder runtime.

## Data Flow

The Calendar and Inbox mutations validate their distinct inputs, then call `createStaffBooking`. That shared function completes all booking records and the source-specific Inbox bookkeeping. Immediately before returning success, it calls `handleBookingCreated` with the new Calendar appointment ID.

The AI mutation keeps its AI-specific session and confirmation flow. After completing its booking records and related state, it calls the same `handleBookingCreated` function.

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

- Add a contract test that verifies Calendar and Inbox call `createStaffBooking`, the staff function calls `handleBookingCreated`, and the AI booking path calls the same event handler after persistence.
- Keep the existing reminder runtime tests for eligibility, deduplication, and Workpool scheduling.
- Do not add a console-log assertion test.
- Run the affected Calendar staff, Conversation Details staff, AI booking, and reminder runtime suites.

## Non-Goals

- A generic event bus, event table, queue, or schema change.
- Combining Calendar and Inbox authorization, customer resolution, availability checking, or public mutation arguments.
- Moving rescheduling or reconciliation through the creation event.
- Changing reminder eligibility, timing, templates, retries, or sending behavior.
- Creating an Inbox conversation solely to support reminders.
