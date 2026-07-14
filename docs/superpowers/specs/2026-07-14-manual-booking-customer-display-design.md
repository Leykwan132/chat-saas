# Manual Booking Customer Display Design

## Goal

Make Calendar and Conversation Details manual booking use stored customer identity data instead of asking staff to re-enter it. The only editable booking inputs are Service, Date & time, and optional Remarks. Calendar customer search must filter correctly and identify each customer source visually.

## Scope

- Fix the Calendar customer Combobox so results filter immediately while retaining workspace-wide search.
- Add source icons for WhatsApp, Instagram, Messenger, Web, and Imported customers.
- Show stored customer identity as read-only context without separate identity inputs.
- Remove customer identity inputs and service-specific question inputs from manual booking.
- Rename the shared schedule section from `Schedule` to `Date & time`.
- Add an optional Remarks input and persist it on the calendar event.
- Preserve exact-slot availability checks, service-duration defaults, editable start/end times, and the separate generic event command.

## Customer Search

The current Combobox sets `filter={null}`. Base UI treats that as an always-true predicate, which disables local filtering. The corrected flow uses two layers:

1. The Combobox immediately filters currently loaded customers by normalized name, email, phone, and contact address.
2. The existing bounded Convex full-text query searches the complete workspace. While it loads, the Combobox filters the recent-customer list; when it resolves, its results replace that candidate list and receive the same client filter.

The customer query continues to enforce workspace authorization. Search remains bounded and does not load an unbounded customer collection.

## Customer Source Presentation

Customer options carry their stored `service` value through the existing Calendar customer queries and shared booking types. Each option renders a leading source icon:

- WhatsApp: WhatsApp brand icon.
- Instagram: Instagram brand icon.
- Messenger: Messenger brand icon.
- Web: globe icon.
- Manual/imported: import or contact icon.

The icon has an accessible source label. Customer name remains the primary line; the best available email, phone, or contact address remains the secondary line.

## Shared Dialog Layout

The shared Create booking dialog renders these sections in order:

1. Customer
   - Calendar: searchable Combobox used to select the customer.
   - Conversation Details: read-only customer summary.
2. Service
3. Date & time
4. Remarks, optional

Customer name, phone, email, and service-defined data-collection questions are not editable in either manual-booking entry point. Existing customer data is displayed rather than duplicated as form inputs.

## Booking Data

Both manual-booking commands resolve the authoritative customer document before validation and persistence. They build collected fields from stored customer identity plus the selected date and start time:

- `name` from customer name, with the best available stored contact identity as a display fallback.
- `phone` from the stored phone when present.
- `email` from the stored email when present.
- `date` and `time` from the selected schedule.

Manual booking does not reject creation because service-defined customer-information or custom question fields were not entered. Those fields remain part of automated/customer-led booking flows; this exception applies only to the two staff-operated manual-booking commands.

Remarks are optional, trimmed at the command boundary, and stored as `calendarEvents.remarks`. Empty remarks are stored as absent. Existing booking detail and edit surfaces continue to display and edit the persisted value.

## Error Handling

- Calendar creation remains disabled until a customer, service, valid interval, and successful availability check exist.
- Conversation Details creation remains disabled until a service, valid interval, and successful availability check exist.
- A customer that was removed or moved outside the workspace before submission returns `Customer not found`.
- Availability conflicts retain the existing inline red feedback and block creation.
- Remarks never affect availability or required-field validation.

## Testing

- A Combobox regression proves typing filters name, email, phone, and contact address instead of using an always-true filter.
- Customer option tests cover all five source-icon mappings.
- Shared-dialog tests prove only Customer, Service, Date & time, and Remarks render.
- Inbox and Calendar command tests prove stored customer identity is persisted without manual identity inputs.
- Command tests prove omitted service custom questions do not block staff-created manual bookings.
- Calendar event tests prove trimmed Remarks persist and empty Remarks are omitted.
- Existing availability, duration-default, custom-time, status, customer-history, generic-event purity, and Inbox side-effect tests remain green.

## Non-Goals

- Changing customer records from the booking dialog.
- Removing service questions from AI-led or customer-led appointment booking.
- Creating Inbox conversations for Calendar bookings.
- Changing the generic `Create event` workflow.
