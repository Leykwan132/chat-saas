# Dashboard Sidebar and Workflow Layout Refinement

## Goal

Improve the authenticated dashboard hierarchy by moving the Calendar booking action below the month calendar, showing the Workflow page title above its canvas tools, and tightening the main sidebar brand lockup.

## Calendar Sidebar

The expanded Calendar sidebar will use this order:

1. The existing `Calendar` page title.
2. The existing month calendar.
3. The existing `New Booking` button.
4. The existing `View` filters.

The button remains directly below the calendar and keeps its current width, horizontal inset, styling, permission gate, and booking-dialog behavior. The calendar and filter behavior remain unchanged.

## Workflow Canvas

The canvas's top-left floating controls will form one vertical stack:

1. A plain `Workflow` page title using the authenticated dashboard's normal-weight KiloBot display typography at `text-3xl`.
2. The existing tool row.
3. The existing Direct Message, Reminders, and Followups navigation card.

The title has no border or background. The duplicate `Workflow` heading inside the Direct Message navigation card is removed, leaving one visible page title. Existing tool actions, navigation behavior, canvas dimensions, and pointer and keyboard interactions remain unchanged. The loading skeleton mirrors the same title-above-tools hierarchy.

## Main Sidebar Brand

The expanded main sidebar keeps its current 1.35rem logo size. The `Kilobot` wordmark increases from 14.5px to 16px, while the horizontal gap between the icon and wordmark decreases from 0.675rem to 0.45rem. The collapsed sidebar and its logo-to-toggle hover behavior remain unchanged.

## Verification

Regression coverage will verify:

- Calendar source and rendered order is month calendar, `New Booking`, then `View`.
- The booking button retains its existing action and permission behavior.
- Workflow renders one `Workflow` title above the tool row and outside the navigation card.
- The Workflow loading skeleton follows the same hierarchy.
- The expanded sidebar brand uses a 16px wordmark and the tighter gap without changing the icon size.

Focused Calendar, Workflow, and sidebar tests, scoped lint, and whitespace checks will run under Node.js 22. Repository-wide verification will report any established unrelated failures separately.
