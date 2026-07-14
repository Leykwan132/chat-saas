# Create Booking Spinner Design

## Goal

Make booking submission visibly active in both Calendar and Inbox without changing the button label.

## Behavior

- The shared submit button always keeps the label `Create booking`.
- While `controller.busy` is true, the existing `Spinner` renders before the label with `data-icon="inline-start"`.
- The button remains disabled while busy and whenever the current selection is unavailable.
- The spinner ends when the existing controller finishes the request, whether creation succeeds or fails.

## Scope

The change belongs in `CreateBookingDialog`, which is shared by Calendar and Inbox. The existing controller already owns the submit lifecycle and must remain the only source of busy state.

This does not change booking persistence, availability checks, success or error messages, dialog closing, or the button label. It does not add a dialog-level loading overlay.

## Verification

- Add a focused source contract that requires the shared dialog to conditionally render `Spinner` from `controller.busy` before the unchanged `Create booking` label.
- Run the focused booking dialog test and lint the changed files under Node 22.
