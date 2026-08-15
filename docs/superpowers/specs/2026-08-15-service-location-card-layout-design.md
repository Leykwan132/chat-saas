# Service Details and Location Design

## Goal

Make the core service setup easy to finish in one focused page while keeping advanced booking configuration separate. A service can be configured for Google Meet only after Google Calendar is connected.

## Service editor layout

The edit experience has three sections:

- Service details contains name, description, duration, and location in one scrolling page.
- Booking team remains separate.
- Booking form remains separate.

The Service details section replaces the separate Details and Appointment duration panels. The active label and switch in service cards align vertically in their shared row.

## Location selector

Location is a dropdown with exactly two options:

- Google Meet maps to the existing `remote` service location mode.
- In person maps to the existing `in_person` mode and reveals Address (optional).

Google Meet uses the official hosted Google Meet product image at `https://fonts.gstatic.com/s/i/productlogos/meet_2020q4/v6/web-48dp/logo_meet_2020q4_color_1x_web_48dp.png`, displayed at the same compact size as the existing Google Calendar image treatment. It replaces the generic camera icon in the selected dropdown trigger and Google Meet menu entry. In person retains its map-pin icon.

Google Meet appears as an available choice only when the current user has an active Google Calendar connection. It retains the current calendar early-access gate.

For an eligible user without a connection, the Google Meet entry appears unavailable. Hovering or focusing the entry opens a card that says Google Meet requires Google Calendar and provides a Connect Google Calendar button. The unavailable entry cannot be selected or saved. The card's action uses the existing authorization flow. If the connection flow is cancelled or fails, the service remains In person and unchanged.

For users outside the early-access gate, the unavailable entry explains that Google Meet is not available yet and does not expose a connection action.

## Existing behavior

Existing services with no explicit location remain In person with no address. The existing service fields, location persistence, booking routing, and Google Meet event creation behavior remain unchanged. This design changes only configuration UI and prevents a new Google Meet service from being saved before connection.

## Non-goals

- Moving booking team or booking-form configuration into Service details.
- Adding third-party meeting providers, custom links, or additional in-person variants.
- Changing calendar sync, booking assignment, or existing Google Meet creation behavior.

## Verification

Tests cover the merged Service details panel, separate advanced sections, two-option Location selector, unavailable Google Meet hover/focus guidance, connection action, and centered active control. Focused frontend tests, TypeScript, and diff checks run under Node v22.
