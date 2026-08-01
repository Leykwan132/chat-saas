# Calendar and Inbox Sidebar Titles

## Goal

Replace the boxed top headers in the Calendar and Inbox left sidebars with plain dashboard-style titles.

## Design

Calendar and Inbox will use normal-weight KiloBot display-font headings without a fixed-height container, bottom border, or boxed-header treatment. Each title will align with the existing 16px sidebar content inset.

Calendar will place the title above New Booking and the month picker. Inbox will keep its collapse control aligned beside the title when expanded. Its collapsed rail will retain the expand control without showing a title. Loading skeletons will match the new unboxed expanded layout.

No filtering, calendar, conversation, permission, scrolling, or responsive behavior changes.

## Verification

Source-level regressions will confirm that both sidebars use unboxed title rows, KiloBot title typography, and unchanged Inbox collapse controls. Existing Calendar padding and Inbox page tests will remain green.
