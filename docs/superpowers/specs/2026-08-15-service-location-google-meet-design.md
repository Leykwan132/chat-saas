# Service Location and Google Meet Design

## Goal

Let a service be configured as remote or in person. Remote bookings automatically receive a Google Meet link when their assigned staff member has an active Google Calendar connection.

## Service settings

Each appointment service stores a location mode of `remote` or `in_person`. In-person services optionally store a physical location. Remote services do not show or retain a physical-location value.

The service form presents the two modes explicitly. Choosing In person reveals an optional address field; choosing Remote hides it. Existing services remain compatible and behave as In person without an address until edited.

## Booking behavior

All appointment booking entrypoints use the service setting: AI bookings and staff-created bookings. In-person bookings place the configured address on the local and Google Calendar event. Remote bookings leave the physical event location empty.

For a remote booking whose assigned staff member has an active Google Calendar connection, the existing Google event create request includes a Google conference creation request. Google creates a unique Meet conference for that booking. Its returned meeting URL is stored as the event link, so it appears consistently in the calendar and booking details.

For a remote booking without a connected calendar, the booking succeeds locally without a meeting link. A connected booking continues to be fail-closed: if Google cannot create the event or conference, the pending local booking is rolled back.

Meet creation occurs only during initial Google event creation. Booking updates retain the existing conference instead of requesting a second meeting link.

## Provider boundary

The Google Calendar provider adds conference data only when the normalized booking write input requests it. It sends the Calendar API conference-data version query parameter and a deterministic conference request ID derived from the existing idempotent operation key. The Google event mapper reads the returned conference URL and the finalizer writes it into the existing local event link field.

## Non-goals

- Generating Meet links for standalone Calendar events or in-person bookings.
- Requiring staff to connect Google Calendar in order to create a remote booking.
- Creating additional Meet links when a booking is edited, rescheduled, or synchronized.
- Supporting third-party conferencing providers or custom meeting links in service settings.

## Verification

Service tests cover location-mode validation, defaults, form mapping, and persistence. Booking tests cover physical locations, connected remote Meet creation, no-connection remote creation, and rollback after a Google error. Provider tests assert conference-data request parameters and the returned Meet URL mapping. Focused frontend and Convex tests, generated API types, TypeScript checks, and diff checks validate the feature.
