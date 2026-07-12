# Inbox Customer Booking History Design

Date: 2026-07-12
Status: Approved

## Goal

Make the inbox the primary place to review and create bookings for the selected customer. A customer may have multiple bookings across conversations. The inbox must preserve the full booking history while keeping the prompt area focused on one recent booking.

## Scope

- Add a collapsible `Bookings` section directly below `Customer details` in the inbox details panel.
- List the selected customer's Booked, Completed, and Cancelled bookings.
- Add a visible `Create booking` button inside the section, including in the empty state.
- Open booking details when a history row is selected.
- Show the customer's most recent scheduled booking above the prompt.
- Label the prompt-area booking `Most recent`, make the whole card clickable, and remove its `Edit booking` button.
- Reuse existing booking detail, edit, completion, cancellation, service, availability, and calendar-event behavior where applicable.

## Customer Booking Identity

Booking history is customer-level, not conversation-level. The backend resolves the selected conversation to its authenticated organization, agent, and customer. It then returns bookings whose calendar-event participant identifies that customer. A booking created in another conversation for the same customer still appears.

The query is bounded and index-backed. It returns at most 50 bookings ordered by scheduled start time descending. It does not scan or filter an unbounded collection in memory.

## Booking History Data

Each returned item contains only the display and interaction data required by the inbox:

- booking session ID
- calendar event ID
- title or service name
- scheduled start and end
- service time zone
- assigned team member name when present
- status: Booked, Completed, or Cancelled
- booking reference for the detail view
- collected booking fields and notes already supported by booking details

In-progress collection and confirmation sessions are excluded from history because they are not completed bookings yet.

## Most Recent Definition

`Most recent` means the history item with the greatest scheduled start time, regardless of status. It is not based on database creation time. This keeps the prompt-area card consistent with the history ordering.

If no history exists, no booking card appears above the prompt.

## Details Panel Interaction

The `Bookings` section is a sibling immediately below `Customer details` and follows the same collapsible treatment as the other inbox detail sections.

Its header contains:

- a calendar icon
- `Bookings`
- the returned booking count
- the standard collapse chevron

When expanded, the section renders:

1. A full-width `Create booking` button for users with Calendar Manage permission.
2. Booking rows ordered by scheduled start time descending.
3. An empty state reading `No bookings yet` when the list is empty, while retaining the create button for permitted users.

Each row shows the title, localized date and time, assigned team member when available, and a clear Booked, Completed, or Cancelled status. The entire row is keyboard-accessible and opens the booking detail dialog.

Read-only users can view the section and booking details but do not see the create action or mutation controls.

## Create Booking Flow

`Create booking` opens an inbox booking dialog without navigating away from the conversation. The dialog is pre-linked to the selected customer and conversation and uses the existing appointment service and availability rules.

The user selects:

- service
- date
- available time
- assigned team member where the service permits selection
- any required customer or service fields

Known customer values such as name, phone, and email are prefilled. Saving creates the booking session, calendar event, and customer participant linkage through the existing booking domain logic. On success, the dialog closes, the reactive history updates, and the new booking becomes `Most recent` when it has the greatest scheduled start time.

Creation is disabled with a clear reason when the user lacks Calendar Manage permission, no bookable service exists, or no slot is selected. Backend authorization remains authoritative.

## Booking Detail Flow

Selecting a history row or the prompt-area card opens the same booking detail dialog. It displays the booking reference as read-only and preserves the existing detail fields.

Permitted actions remain inside the detail experience:

- edit or reschedule, including past bookings
- mark a Booked booking as completed
- cancel where currently supported

Completed and Cancelled items remain visible in history. Actions refresh automatically through Convex subscriptions.

## Prompt-Area Card

The compact card above the prompt contains one horizontal row:

- booked/status icon
- a flexible title and schedule block
- a small `Most recent` label

There is no `Edit booking` button. The card itself has button semantics, visible focus styling, and an accessible label such as `View most recent booking details`. Clicking or pressing Enter/Space opens the shared detail dialog.

## Component Boundaries

- `InboxCustomerBookingsSection`: owns the collapsible history presentation, count, empty state, and create action.
- `InboxCustomerBookingRow`: renders a single accessible history item and status treatment.
- `CreateCustomerBookingDialog`: owns the inbox manual-booking form and delegates validation and persistence to booking APIs.
- `InboxBookingDetailsCard`: renders the compact clickable `Most recent` card and the expanded detail content without embedding customer-history query logic.
- A shared booking-detail dialog controller is used by history rows and the prompt card so both paths behave identically.
- A dedicated Convex customer-booking query owns authorization, indexed lookup, bounded ordering, and response formatting.

These units remain separate from `ChatsPage.tsx` to keep the large page from accumulating more booking-specific presentation and state.

## Error and Loading States

- While history loads, the Bookings body shows compact row skeletons without blocking the conversation.
- Query failure uses the app's existing error boundary behavior; it must not silently show an empty history.
- Create and mutation errors appear through the existing toast pattern and leave the dialog open with entered values preserved.
- A missing or concurrently removed booking closes the detail dialog and reports that the booking is no longer available.
- Empty history and insufficient permission are distinct states.

## Testing

Backend tests cover:

- organization and permission isolation
- customer-level results across multiple conversations
- Booked, Completed, and Cancelled inclusion
- in-progress session exclusion
- scheduled-start descending order and 50-item bound
- customer participant linkage for manual creation

Frontend tests cover:

- Bookings placement below Customer details
- collapsible behavior, count, loading, and empty states
- Calendar Manage visibility for Create booking
- creation prefilled with the selected customer
- status rendering and row selection
- shared detail opening from history and prompt card
- `Most recent` selection by scheduled start
- absence of the compact Edit booking button
- keyboard and accessible-button behavior

Verification includes focused Vitest suites, Convex code generation, TypeScript, targeted ESLint, `git diff --check`, and touched-code file length checks.

## Out of Scope

- Pagination or a dedicated full-page customer booking history beyond the initial bounded 50 items
- Bulk booking actions
- Deleting booking history
- Changing Calendar-page booking behavior
- Restoring the inbox Message templates shortcut
