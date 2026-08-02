# Calendar and Inbox Sidebar Titles

## Goal

Replace the boxed top headers in the Calendar and Inbox left sidebars with plain dashboard-style titles.

## Design

Calendar and Inbox will use normal-weight KiloBot display-font headings at the standard dashboard `text-3xl` size without a fixed-height container, bottom border, or boxed-header treatment. The title size will not be reduced. Each title will align with the existing sidebar content inset.

Calendar will place the title above New Booking and the month picker with one compact gap. The title row's bottom padding, the scroll area's top padding, and the New Booking button's top margin must not compound into a large blank area. Inbox will use the same compact title-to-content rhythm, keep its collapse control aligned beside the title when expanded, and retain the expand control without a title in its collapsed rail. Loading skeletons will match the unboxed expanded layout.

The main application sidebar will use Lucide's `MessagesSquare` icon for Inbox and `ShoppingCart` for Services. Conversation, filter, booking, and Services-content icons remain unchanged.

No filtering, calendar, conversation, permission, scrolling, or responsive behavior changes.

## Verification

Rendered regressions will confirm that both sidebars use unboxed standard-size KiloBot title rows with compact following space and unchanged Inbox collapse controls. Navigation tests will confirm the `MessagesSquare` Inbox icon and `ShoppingCart` Services icon. Existing Calendar padding and Inbox page tests will remain green.
