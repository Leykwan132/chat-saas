# Calendar floating New Booking action design

## Goal

Place the labeled `+ New Booking` action at the bottom-right of the entire Calendar sidebar.

## Layout

The Calendar sidebar is the positioning anchor. Its scrollable content continues to contain the month calendar and View filters, with sufficient bottom padding to remain reachable above the floating action. The existing inline full-width booking action is removed.

The existing shadcn Button is rendered as a labeled primary action at `absolute bottom-4 right-4`. It retains the plus icon, `New Booking` label, size, and existing booking callback.

## Permissions and behavior

The floating action is rendered only for people who can manage the Calendar. Its click behavior is unchanged: it opens the existing create-booking flow.

## Verification

Update the focused Calendar sidebar test to assert the action is rendered after the scrollable content with its bottom-right positioning classes, and that it remains absent without management permission. Run that test under Node v22 and check the diff for whitespace errors.
