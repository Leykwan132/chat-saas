# Calendar Hide Google Event Badge

## Goal

Remove the visible Google source badge from Google-origin calendar events because the provider branding is distracting in the event UI.

## Scope

`GoogleCalendarSourceBadge` will render nothing for the `google` origin. Its existing `kilobot` label remains unchanged.

The shared component is already used by month event tiles, selected-day event rows, and event details, so this single presentation change hides the Google badge consistently in all three places.

## Non-goals

- Changing Google Calendar connection controls or the early-access flag.
- Changing calendar synchronization, ownership, event fields, or edit permissions.
- Removing the Kilobot source badge.

## Verification

The existing calendar connection UI test will assert that Google-origin badges render no visible markup while Kilobot-origin badges still render their label. The focused test run will cover the component and its event-detail behavior.
