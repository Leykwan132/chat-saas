# Calendar Solid Connected Status Design

## Goal

Make the connected Google Calendar account status marker a solid green badge without a white outline or check stroke.

## Scope

The connected-state `BadgeCheck` keeps its existing icon, size, position, green fill, accessibility label, and surrounding connection-control behavior. Its stroke color changes from white to the same green as the fill, producing a visually solid green marker.

## Non-goals

- Changing the connected account label, Google Calendar icon, tooltip, or disconnect interaction.
- Changing PostHog access control, Google Calendar synchronization, or event badges.
- Replacing the status icon with a new component.

## Verification

The existing connection-card test will assert that connected markup uses `fill-green-600` and `text-green-600`, and no longer contains `text-white`.
