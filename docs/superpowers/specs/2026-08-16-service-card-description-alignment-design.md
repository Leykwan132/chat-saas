# Service Card Description Alignment Design

## Goal

Place each service card description directly below its title without changing the card footer layout.

## Scope

- Remove the title's `flex-1` class in `ServiceCard`.
- Keep the fixed card size, card padding, description spacing, and bottom booking/status row unchanged.

## Verification

- Add a regression check that prevents the title from expanding into the description space.
- Run the focused Services page test under Node 22.
