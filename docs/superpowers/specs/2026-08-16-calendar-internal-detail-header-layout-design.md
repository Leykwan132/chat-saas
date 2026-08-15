# Calendar Internal Detail Header Layout Design

## Goal

Make Internal notes and Summary easier to scan in Calendar event details.

## Layout

Each section uses a horizontal header row with its icon and label aligned together. Its neutral content surface appears full width directly below that row, rather than beginning beside the icon. Summary remains in the right desktop column and stacks below Internal details on smaller screens.

## Boundaries

This changes presentation only. Event details, actions, permissions, data order, and empty-state copy remain unchanged.

## Verification

Update the event-details rendering test to cover both icon-and-label headers and their full-width neutral surfaces.
