# Calendar Shared Booking Design

Date: 2026-07-14

## Goal

Make the Calendar sidebar action create the same appointment booking as the Inbox action while keeping generic calendar-event creation independent. Calendar adds searchable customer selection and service selection. The shared dialog retains the existing flexible schedule, service-duration default, customer detail fields, and conflict check.

## Success Criteria

- The Calendar sidebar action reads `New Booking` and opens the shared booking dialog.
- Inbox and Calendar render the same booking fields and validation behavior.
- Calendar shows all workspace customers through a searchable Base UI/shadcn Combobox.
- Calendar shows the current agent's active booking services.
- Selecting a service defaults End from its duration until the user customizes End.
- Availability is checked only after customer, service, date, Start, and End are valid.
- Calendar can book customers who have no Inbox conversation.
- Calendar booking never creates or mutates an Inbox conversation.
- Generic `calendarEvents.create` remains an event-only operation.
- The wider Start menu aligns to Start's left edge and the wider End menu aligns to End's right edge.
- Existing generic event editing and right-click `Create event` remain available.

## Approaches Considered

### Separate public commands with shared booking helpers

Use explicit Inbox and Calendar queries/mutations backed by small internal booking-domain helpers. This keeps authorization and inputs clear while sharing the actual scheduling and persistence rules.

This is the selected approach.

### One overloaded manual-booking mutation

A discriminated union could accept either `conversationId` or `customerId`. This reduces the number of public functions but makes one endpoint responsible for different authorization, side effects, and lifecycle rules.

Rejected because the function would no longer have one obvious responsibility.

### Reuse `calendarEvents.create`

The generic event mutation could accept service fields and branch into booking behavior.

Rejected because event creation and appointment booking are different domain operations. It would also preserve the current misleading `event_booked` side effect for generic events.

## Frontend Architecture

### Shared dialog

Extract the current Inbox dialog into a modular shared booking feature. The entry component accepts a discriminated context:

- Inbox context: `conversationId` and a fixed customer.
- Calendar context: `agentId`, optional initial date, and a selectable customer.

The shared presentation owns:

- service selection;
- date, Start, and End state;
- service-duration End defaulting;
- service-defined customer fields;
- availability status;
- submission state;
- the light no-blur overlay and dialog layout.

Surface adapters own only data loading and the correctly named backend calls.

The existing Inbox component remains a thin compatibility wrapper so current call sites do not change unnecessarily.

### Customer Combobox

Calendar renders a Base UI/shadcn Combobox above Service. Each result displays the best customer name plus a secondary identifying value such as phone or email. Search matches the customer's name, phone, email, and contact address.

The customer query is server-searchable and paginated so every workspace customer remains discoverable without loading an unbounded collection. Opening the Combobox shows a bounded recent page; typing searches the complete workspace customer index. Results remain scoped by authenticated workspace authorization.

Selecting a customer seeds standard customer fields from the customer record. Changing the customer replaces those seeded values and clears availability because the booking context changed.

### Service selection

Both surfaces use the same Service control and active-service options for the route's agent. The `Create new service` action remains beside the Service label.

### Calendar integration

The large sidebar button changes from `New Event` to `New Booking` and opens the shared booking dialog. A selected calendar day becomes the dialog's initial date.

The right-click `Create event` action continues to open the existing generic event sheet. Existing event details and editing remain unchanged.

### Time menu alignment

The shared editable time Combobox accepts an explicit content alignment. Start uses `start`; End uses `end`. The popup remains at least 176px wide, scrollable, portalled inside the dialog, and collision-aware.

## Backend Architecture

### Explicit public operations

Inbox keeps conversation-scoped operations:

- load Inbox booking options;
- check Inbox booking availability;
- create Inbox booking.

Calendar gains customer-scoped operations:

- load active services for the route agent;
- page or search workspace customers;
- check Calendar booking availability;
- create Calendar booking.

Calendar operations accept `agentId`, `customerId`, `serviceId`, and the exact interval. They derive authorization and team identity server-side.

### Shared booking-domain helpers

Small internal helpers share only true booking behavior:

- validate an exact interval;
- load and validate an active service for the agent;
- choose an available assignee using schedules, buffers, assignment strategy, and calendar conflicts;
- validate service-required customer fields;
- create the appointment event and participants;
- create the booking lifecycle record;
- update round-robin assignment state.

Conversation-specific behavior remains in the Inbox command. Calendar does not create a conversation, change a conversation status, or append a conversation log.

For the `conversation_owner` assignment strategy, Calendar uses an existing selected customer's agent-owned conversation only as optional assignment context when one exists. It does not create or mutate that conversation. With no owner context, the existing available-roster fallback selects the assignee.

### Booking persistence

A Calendar booking creates:

- a confirmed `calendarEvents` appointment with `agentId`, `appointmentServiceId`, `bookingSource: "manual"`, exact times, and collected fields;
- customer and assigned-user `calendarEventParticipants`;
- an `appointmentBookingSessions` lifecycle record associated with the customer and event.

The booking-session schema is widened so a lifecycle record may be customer-scoped without a conversation. Existing Inbox records remain valid. New Inbox records store both customer and conversation identity; new Calendar records store customer identity and no conversation identity.

Booking status transitions continue to operate through `calendarEventId`, so Calendar-created bookings support Booked, Completed, Cancelled, and No-show without a synthetic conversation.

### Generic event purity

`calendarEvents.create` continues to insert a generic event and its selected event participants. It does not create booking sessions, attach services, schedule booking reminders, change conversations, or log `event_booked`.

The current generic-event `event_booked` conversation log is removed because it violates the event-only command boundary.

### Reminders

Inbox booking creation keeps its existing eligible conversation-based reminder scheduling.

Calendar customer-direct booking has no conversation or channel and therefore does not schedule WhatsApp workflow reminders. No synthetic conversation or hidden channel lookup is introduced.

## Customer Search Data

Add a normalized searchable customer projection containing name, email, phone, and contact address, scoped by organization. Use a Convex search index for typed queries and the existing organization/recent ordering for the initial page.

Roll this out with widen-migrate-narrow discipline:

1. Add the optional projection and search index.
2. Backfill existing customer rows in bounded migration batches.
3. Update every customer create/update path to maintain the projection.
4. Verify coverage before making the projection required in a later narrowing change.

The booking feature does not use an unbounded `.collect()` fallback while migration is incomplete.

## Error Handling

- Missing or inactive service: show `Selected service is not available`.
- Missing customer: show `Select a customer`.
- Invalid interval: show the existing inline schedule validation.
- Conflict or unavailable assignee: show the existing red X conflict state.
- Failed search: preserve the current selection and show a retryable empty/error state.
- Submission revalidates availability transactionally before writing booking records.
- Partial booking records cannot be committed because creation occurs in one Convex mutation.

## Testing

### Frontend

- Calendar button copy and routing to the booking dialog.
- Right-click generic event flow remains connected to the generic sheet.
- Calendar customer Combobox searches and selects customers.
- Customer selection seeds fields and resets stale availability.
- Inbox hides customer selection and preserves its fixed customer.
- Both surfaces share Service and schedule controls.
- Start popup aligns left; End popup aligns right.
- Calendar submission calls only the Calendar booking mutation.

### Backend

- Customer search is workspace-scoped, bounded, paginated, and searches all projected identity fields.
- Calendar options expose only active services belonging to the route agent.
- Calendar availability honors shifts, buffers, conflicts, and assignment strategies without requiring a conversation.
- Calendar creation writes event, participants, and lifecycle session atomically.
- Calendar creation does not insert, patch, or log an Inbox conversation.
- Inbox creation retains conversation status, history, and reminder behavior.
- Generic event creation does not create booking records or `event_booked` logs.
- Calendar booking status transitions work without `conversationId`.

## Out of Scope

- Creating customers from the booking dialog.
- Creating Inbox conversations for Calendar bookings.
- Sending WhatsApp reminders without a real eligible conversation and connected channel.
- Removing the generic event creation/editing feature.
- Changing populated booking-history presentation.
