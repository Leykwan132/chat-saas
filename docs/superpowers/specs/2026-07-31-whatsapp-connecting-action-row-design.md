# WhatsApp Connecting Action Row Design

## Goal

Keep the available WhatsApp channel card in place while a connection attempt is active. Replace only its Connect action with a compact status row inspired by the supplied reference: a yellow spinner, “Connecting…” text, and a solid-red square stop control aligned at the end.

## Interaction

- The normal state continues to show Connect.
- Starting signup changes the card action area to the connecting row.
- The WhatsApp title, icon, and coexistence description remain unchanged while connecting.
- The card keeps the standard solid border and card background; connecting does not add a dashed border or tinted surface.
- The pending card does not repeat a secondary setup-phase label above the connecting row.
- Stop cancels the current open connection attempt through the existing Convex cancellation mutation.
- The stop control uses a filled square icon instead of text and has an accessible label.
- While cancellation is pending, the control is disabled, its icon becomes a spinner, and the status reads “Stopping…”.
- Successful cancellation restores Connect after the subscribed attempt disappears or becomes cancelled.
- Failed cancellation keeps the connecting row visible and shows the error in a toast so the user can retry.
- The action is labelled for assistive technology and the animated spinner is decorative beside visible status text.

## Components and Data Flow

`ChannelsPage` remains the owner of the subscribed open attempt and its existing cancellation mutation. The pending WhatsApp card will replace only its action area with a reusable compact connecting row. `ConnectWhatsAppButton` continues to own signup launch and error presentation.

The existing backend mutation remains unchanged: Stop passes only the owned attempt ID to `cancelConnectionAttempt`. Convex subscription updates then drive the UI back to its normal state.

## Scope

This change affects only the available WhatsApp card’s connection action. It does not alter Meta signup, OAuth handling, channel creation, synchronization progress, connected-channel cards, or the Instagram and Messenger actions.

## Error Modal

The WhatsApp connection error modal will use a compact, left-aligned title and message without the large decorative error icon. Its only footer action is `Contact support`, which routes to `/contact?intent=support`. The standard dialog close control remains available for dismissal. Retry is intentionally removed so a failed connection can be investigated before another attempt.

## Verification

- A component behavior test will prove that an active attempt renders Connecting and an accessible square stop control instead of Connect.
- A cancellation behavior test will prove Stop invokes the existing cancellation path and exposes the pending stopping state.
- An error-modal behavior test will prove the message and single Contact support action are present while retry and footer Close actions are absent.
- Existing WhatsApp connection-attempt tests, scoped lint, and TypeScript checks will remain green.
