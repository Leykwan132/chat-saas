# Multi-Appointment Booking Design

## Goal

Let an AI agent check and create up to ten appointments requested in one customer chat message, with one shared service and one shared set of customer details.

## Scope

- `checkAvailability` accepts `preferredTimesIso`, an array of one to ten requested appointment start times. Its existing one-time and range inputs remain supported.
- A batch check returns every requested time with its availability and exact appointment interval, plus `allAvailable`.
- A batch may proceed to booking only when every requested time is currently available and the customer has clearly requested or confirmed that exact list.
- `bookAppointments` creates one calendar event, participant set, booking session, reminder schedule, notification, and conversation event for every requested slot.
- Batch booking uses the same service, field values, duration, timezone, and service assignment rules for every appointment.
- Existing single-appointment creation, editing, cancellation, confirmation messages, Calendar manual booking, and booking history continue to work.

## Constraints

- A batch contains at least two and at most ten distinct start times. A single requested time continues through the existing single-booking flow.
- Requested timestamps must be today or later in the service timezone and must be unique.
- The system must revalidate every requested slot in the creation transaction. If even one slot is no longer available, no local calendar event or booking session is created.
- A conversation can have only one active booking session or active batch at a time.
- The batch is limited to one service and one customer. The agent asks for a service when it cannot determine one, and it uses the existing required-field collection flow before booking.
- Code files remain below 300 lines, use Node 22, and contain no explanatory comments unless a workaround cannot be expressed by code structure.

## Data Model

Add `appointmentBookingBatches` as a durable parent record rather than overloading a one-event booking session. It contains the conversation, agent, service, shared collected fields, requested slots, a status, customer confirmation message, creation timestamps, and a bounded list of child booking-session IDs.

Each requested slot is stored with the selected staff member resolved during availability checking. Child events and child booking sessions remain normal `calendarEvents` and `appointmentBookingSessions` records, so customer history, calendar UI, status changes, reminders, and reporting need no special read path.

The batch status distinguishes collecting details, awaiting confirmation, creating, booked, and failed. A batch can only be created from the awaiting-confirmation state. A failed batch remains available for diagnosis and retry only when it contains no local children.

## Availability Flow

The AI calls `checkAvailability` with `preferredTimesIso` for a multi-date request. The tool parses every timestamp using the current service-timezone rules and checks each exact service-duration interval against live availability.

If one or more entries are unavailable, the result identifies every unavailable requested start time and does not create an active batch. The agent presents the unavailable dates together and asks for replacements.

If every entry is available, the tool creates or updates a pending batch with the resolved slots. It returns `allAvailable: true`, `readyForBooking`, missing shared fields, and the exact requested interval for each slot. The customer message that supplied the exact list is stored as the confirmation when it is an incoming message. If required details are missing, the normal field collection continues on the batch before it can be created.

## Creation Flow

`bookAppointments` accepts the service ID, the exact confirmed start-time array, and `customerConfirmed: true`. It requires that the array exactly matches the persisted pending batch, and that all fields and the customer confirmation are present.

The local creation mutation reloads the service, conversation, batch, and every interval; it regenerates availability for all requested start times before any event is inserted. It then creates all events, participants, and child booking sessions in one Convex transaction. It marks the batch booked, marks the conversation booked, records an `event_booked` conversation event for each appointment, applies round-robin assignment in chronological slot order, and invokes existing reminder and notification scheduling for each event.

For a local-only calendar this is atomic: an unavailable slot or write failure leaves no partial bookings.

Google Calendar is not transactionally atomic. The create action prepares the complete batch locally, writes remote events one by one, and finalizes the batch only after every remote write succeeds. If a remote write fails, it deletes each earlier remote event and rolls back all local pending records. If that compensation fails, the batch persists a recoverable failed state containing the affected event IDs and never reports success to the customer.

## Agent and Customer Experience

The booking prompt instructs the agent to use the array input when a customer names two or more exact dates for the same service. It must report the complete availability result before asking for replacements, collect any missing details once, and call `bookAppointments` immediately once the batch is ready. A successful tool result lists every confirmed appointment. The agent sends the existing confirmation for each created booking in a single customer reply.

The single-slot booking prompt and tools remain the preferred flow for one requested time. Editing and cancelling apply to one individual booking; batch-wide edit or cancellation is out of scope.

## Error Handling

- Duplicate, malformed, past, empty, or more-than-ten requested times return a clear validation error and create no batch.
- A mixed availability result returns success with `allAvailable: false`, per-slot results, and no active batch.
- A changed slot at creation returns a retryable failure and leaves no local child records.
- A Google authorization or health failure returns the existing reconnect guidance before any local records are created.
- A Google write failure performs compensation and returns a failure. The agent must not send a booking confirmation.
- A batch cannot silently substitute a different time, staff member, service, or partial list.

## Testing

- Availability tests cover all-requested-slots available, one unavailable among five, duplicate input, past input, and the ten-slot maximum.
- Creation tests prove five requested slots create five events, participants, and booking sessions and mark the batch and conversation booked.
- Creation revalidation tests prove an unavailable later slot creates zero local events and sessions.
- Agent tool contract tests verify array parsing, exact-list confirmation, multi-booking prompt instructions, and no regression to single-slot commands.
- Google sync tests cover a complete five-event success, remote failure with successful compensation, and a recoverable failure when compensation cannot finish.
- Existing single-booking, editing, cancellation, history, availability, notification, and reminder tests remain green.

## Non-Goals

- Recurring appointment rules, arbitrary unbounded appointment lists, or multiple services in one batch.
- Batch-wide edit, reschedule, cancel, or completion actions.
- Automatic replacement of unavailable dates.
- Changes to booking availability rules, service configuration, customer history presentation, or manual Calendar booking.
