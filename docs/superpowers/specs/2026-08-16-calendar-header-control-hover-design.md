# Calendar Header Control Hover Design

## Goal

Make the connected Calendar account and timezone controls clearly interactive without adding visual noise.

## Interaction

Both controls keep their current `bg-input/50` resting surface. On hover, each transitions subtly to `bg-muted`. Existing focus, open, disabled, click, and tooltip behaviour remains unchanged.

## Boundaries

This applies only to the Google Calendar account control and timezone control in the Calendar header. It does not change their content, dimensions, ordering, or any other Calendar header action.

## Verification

Update the existing Calendar connection and header tests to assert both controls include the shared hover surface class.
