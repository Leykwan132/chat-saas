# Editable Booking Status Design

## Goal

Show the latest booking status in the inbox and let Calendar Manage users change it from the existing full Edit Booking dialog. Completed bookings must use a dark green status tag.

## Status Model

Appointment bookings use one user-facing lifecycle across inbox and calendar surfaces:

- `booked` — Scheduled
- `completed` — Completed
- `cancelled` — Cancelled
- `no_show` — No-show

The appointment booking session is the source of truth for this lifecycle. Calendar event status remains synchronized where it has an equivalent: Scheduled maps to `confirmed`, Cancelled maps to `cancelled`, and Completed or No-show remain historical confirmed events rather than disappearing from the calendar.

Changing a terminal status back to Scheduled is supported. This restores the booking session to `booked` and the calendar event to `confirmed`.

## Inbox Interaction

The latest compact booking card shows a status tag beside its existing `Most recent` context. The tag is visible for every lifecycle state.

For users with Calendar Manage permission, clicking the status tag opens the existing full Edit Booking dialog. The surrounding compact card retains its existing details behavior and action buttons. For read-only users, the status remains display-only.

Customer booking history rows use the same labels and colors, including No-show.

## Edit Booking Dialog

The dialog adds a shadcn Select labeled `Status`. It is initialized from the appointment booking session status and offers Scheduled, Completed, Cancelled, and No-show.

Status saves with the rest of the form through the existing Save action. The standalone Mark as completed button keeps its confirmation dialog. Selecting Completed in the form does not open an additional confirmation because Save is already an explicit commit action.

The Select is shown for appointment bookings only. Ordinary calendar events keep their existing calendar-event behavior.

## Persistence

A dedicated backend status transition operation validates Calendar Manage permission, verifies that the event and session belong to the active team, and updates the matching appointment booking session and calendar event atomically in one mutation.

The edit save path invokes this transition when the selected status differs from the loaded status. Existing collected-field, participant, and schedule updates remain unchanged.

Conversation history records the resulting booking-status change. Invalid status values or bookings without a matching session fail visibly; there is no fallback status.

## Presentation

Status presentation is centralized so compact cards and history rows cannot drift:

- Scheduled: dark emerald with white text
- Completed: dark green with white text
- Cancelled: dark red with white text
- No-show: dark amber with white text

Completed must not use the previous zinc treatment.

## Modularity

Shared status values, display labels, and color classes live in a focused booking-status module. Backend transition logic remains separate from calendar event editing. UI components consume the shared presentation helpers instead of duplicating maps.

No code file may exceed 300 lines. Existing oversized editing UI should be split only where needed to add the status field without expanding the oversized entrypoint further.

## Testing

Test-first coverage will verify:

- all four statuses validate and serialize correctly;
- each status has the expected label and color, including dark green Completed;
- the latest booking status opens the full editor only for Calendar Manage users;
- the Select initializes from the current booking session status;
- Save synchronizes booking session and calendar event state;
- terminal statuses can return to Scheduled;
- No-show appears in customer booking history;
- ordinary calendar events do not show the appointment status Select;
- invalid or mismatched booking transitions fail without partial updates.

## Out of Scope

- Custom statuses
- Status reasons or notes
- Automated no-show detection
- Customer notifications caused by manual status changes
- Removing the existing Mark as completed shortcut
