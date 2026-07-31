# WhatsApp Connecting Action Row Design

## Goal

Keep the available WhatsApp channel card in place while a connection attempt is active. Replace only its Connect action with a compact status row inspired by the supplied reference: a yellow spinner, “Connecting…” text, and a red Stop button aligned at the end.

## Interaction

- The normal state continues to show Connect.
- Starting signup changes the card action area to the connecting row.
- Stop cancels the current open connection attempt through the existing Convex cancellation mutation.
- While cancellation is pending, Stop is disabled and reads “Stopping…”.
- Successful cancellation restores Connect after the subscribed attempt disappears or becomes cancelled.
- Failed cancellation keeps the connecting row visible and shows the error in a toast so the user can retry.
- The action is labelled for assistive technology and the animated spinner is decorative beside visible status text.

## Components and Data Flow

`useWhatsAppConnectionFlow` remains the owner of connection state. It will expose whether an attempt is active, whether cancellation is running, and a stop action. `ConnectWhatsAppButton` will render the compact action row in its non-tile presentation. `AvailableChannelCard` will keep rendering the WhatsApp card during an active attempt instead of replacing it with the separate pending card.

The existing backend mutation remains unchanged: the stop action passes only the owned attempt ID to `cancelConnectionAttempt`. Convex subscription updates then drive the UI back to its normal state.

## Scope

This change affects only the available WhatsApp card’s connection action. It does not alter Meta signup, OAuth handling, channel creation, synchronization progress, connected-channel cards, or the Instagram and Messenger actions.

## Verification

- A component behavior test will prove that an active attempt renders Connecting and Stop instead of Connect.
- A cancellation behavior test will prove Stop invokes the existing cancellation path and exposes the pending stopping state.
- Existing WhatsApp connection-attempt tests, scoped lint, and TypeScript checks will remain green.
