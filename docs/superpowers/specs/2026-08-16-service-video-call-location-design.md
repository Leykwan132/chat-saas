# Service Video Call Location Design

## Goal

Offer a manual Video call service location alongside Google Meet and In person without changing the behavior of existing Google Meet services.

## Location options

- Video call: available to every workspace. It does not create or store a meeting link. The service UI states that the user must create and share a meeting link with the customer.
- Google Meet: remains feature-flagged and requires an eligible Google Calendar connection. Booking creation creates the Meet link and includes it in the customer confirmation when available.
- In person: preserves the existing optional address behavior.

## Data model and compatibility

The existing `remote` location mode remains the Google Meet mode to preserve all existing services, bookings, calendar health rules, and generated links. A new `video_call` location mode represents the manual Video call option. No data migration is required.

## Behavior

- Google Calendar health and conference creation apply only to the existing `remote` Google Meet mode.
- Video call does not require Google Calendar and does not create a conference request.
- Google Meet links continue to appear in customer confirmations only when a generated booking link exists.
- Service location controls show Video call, Google Meet when feature-eligible, and In person.

## Verification

- Add UI and form-mapping coverage for Video call.
- Add backend coverage proving Video call does not require Google Calendar health or create a Meet conference.
- Run focused tests, Convex and workspace TypeScript checks, and deploy to the development environment.
