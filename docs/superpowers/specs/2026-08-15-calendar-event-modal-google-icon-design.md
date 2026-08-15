# Calendar Event Modal Google Icon Design

## Goal

Make the Google Calendar icon in an event-details modal visually proportionate to the title while keeping compact icons in calendar lists.

## Scope

`GoogleCalendarSourceBadge` gains an optional `size` variant. Its default compact variant remains `size-3.5` for calendar grid and selected-day titles. The new `heading` variant renders the Google icon at `size-5` for the event-details modal.

`CalendarEventDetailsBody` uses the `heading` variant and changes its title row to vertically center the icon against the modal heading. The tooltip text, Google-only behavior, Kilobot badge, title ordering, and all non-modal list layouts remain unchanged.

## Non-goals

- Changing the Google Calendar icon asset, tooltip copy, connection control, synchronization, event data, permissions, or booking behavior.
- Enlarging icons in the calendar grid or selected-day event list.
- Changing the Kilobot badge.

## Verification

The calendar connection UI test will render the heading variant and assert its `size-5` icon markup. It will also assert the event-details source passes `size="heading"` and retains icon-before-title ordering.
