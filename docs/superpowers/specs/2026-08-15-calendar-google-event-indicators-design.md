# Calendar Google Event Indicators Design

## Goal

Use clear, compact visual indicators for Google Calendar integration: a solid green status marker for a connected account, and a Google Calendar icon for synced events.

## Connected Account Status

The connected-state `BadgeCheck` keeps its icon, size, position, green fill, accessibility label, and disconnect behavior. Its stroke changes from white to `green-600`, matching its fill and producing a solid green marker.

## Synced Event Icon

`GoogleCalendarSourceBadge` becomes the shared event-source presentation component. For a `google` origin it renders the existing Google Calendar brand icon inside the existing tooltip primitives. The icon appears before the event title and its tooltip text is exactly `Event synced with Google Calendar`.

For a `kilobot` origin it retains the existing Kilobot label. Events with no recognized origin render neither indicator.

The existing component is used in the month grid, selected-day event list, and event details header, so repositioning each call site before the title applies the icon consistently in every event view.

## Non-goals

- Changing Google Calendar connection access, synchronization, ownership, event fields, edit permissions, or booking behavior.
- Changing connection-card labels, icon, tooltip, or disconnect interaction.
- Adding a text Google provider tag to event titles.
- Replacing the connected status icon or the Kilobot label.

## Verification

The connection UI test will assert the solid green connected-status classes, render the Google source icon with the exact tooltip copy, retain the Kilobot label, and confirm a Google-origin event detail renders the icon before its title.
