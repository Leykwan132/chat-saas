# Calendar source and status indicator cleanup

## Goal

Show event provenance only when it communicates Google Calendar synchronization.

## Behavior

Google-synced events continue to show the existing Google Calendar icon and its tooltip. Kilobot-origin and originless events render no source badge. Calendar lists and event-detail headings keep their existing layout when no badge is present.

## Connected status

The connected Google Calendar control uses one solid green circular background and one centered white check. It does not layer a badge icon and a separate check, so the visual has only one checkmark.

## Scope and verification

This is a presentation-only change to `GoogleCalendarSourceBadge` and `GoogleCalendarConnectionCard`. Update the component rendering regressions to confirm Google events retain the icon, local events render no source indicator, and the connected control uses one check icon.
