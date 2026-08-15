# Calendar source-indicator cleanup

## Goal

Show event provenance only when it communicates Google Calendar synchronization.

## Behavior

Google-synced events continue to show the existing Google Calendar icon and its tooltip. Kilobot-origin and originless events render no source badge. Calendar lists and event-detail headings keep their existing layout when no badge is present.

## Scope and verification

This is a presentation-only change to `GoogleCalendarSourceBadge`. Update the component rendering regression to confirm Google events retain the icon and local events render no source indicator.
