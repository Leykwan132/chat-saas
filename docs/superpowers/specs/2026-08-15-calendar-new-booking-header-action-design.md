# Calendar New Booking header action design

## Goal

Place the labeled `+ New Booking` action on the right-side selected-day header, directly after the Today/date group.

## Layout

The right Calendar panel header contains one horizontal group. The current selected-day label remains first: `Today` with its red date badge when today is selected, or the formatted selected-day label otherwise. The existing shadcn Button follows that group with a 15px flex gap.

The button is compact enough for the existing header height, retains the plus icon and `New Booking` label, and is shown only to people who can manage the Calendar. The earlier sidebar bottom-right floating action and its reserved scroll space are removed.

## Behavior

Clicking the button opens the existing Calendar create-booking dialog. Its `initialDate` already derives from `selectedDate`, so the booking dialog opens on the same date shown in the header.

## Verification

Update focused sidebar and Calendar-page source-level tests to confirm the sidebar no longer renders New Booking, the right header renders it after the selected-day group with a 15px gap, and the dialog retains `initialDate={format(selectedDate, 'yyyy-MM-dd')}`. Run those tests under Node v22 and check the diff for whitespace errors.
