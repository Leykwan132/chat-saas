# WhatsApp Webhook Billing Design

## Goal

Record Meta's authoritative WhatsApp delivery-pricing result on every matching outbound message and show its free or billable service state in the Inbox.

## Requirements

- The Meta `statuses[].pricing.billable` value is the sole authority for whether a message is billed.
- No local monthly allowance, counter, or billing inference exists.
- The complete provider pricing result is retained with the existing outbound receipt metadata for the matching ledger message.
- A billable service message snapshots the required `WHATSAPP_SERVICE_MESSAGE_PRICE_MYR` value as its MYR display rate when the webhook is processed.
- Inbox timestamps show `Free` for a non-billable priced outbound message and `Service (RM<rate>)` for a billable service message.
- Messages without a Meta pricing status retain their current timestamp presentation.

## Data Model

Extend `messages.receiptMetadata` with optional `pricing` data:

- `billable`: Meta's boolean result.
- `pricingModel`, `type`, and `category`: Meta's original strings.
- `servicePriceMyr`: the validated decimal environment value only for a billable service message.
- `recordedAt`: when the billing result was recorded.

The price is stored on the message rather than read at render time, so historical conversations remain auditable after a rate change. Subsequent receipt statuses without pricing preserve the first recorded pricing data. A later pricing webhook replaces it only when it contains a complete pricing result for the same outbound message.

## Webhook Flow

The WhatsApp webhook parser accepts the optional `statuses[].pricing` object and passes it to the existing `handleStatus` mutation. That mutation continues resolving the outbound message by WhatsApp external ID and channel, then calls the shared receipt updater. The updater changes delivery status and pricing metadata together in one message patch.

For `billable: true` and `category: "service"`, the updater reads and validates `WHATSAPP_SERVICE_MESSAGE_PRICE_MYR`. The application does not set a default rate. Other Meta categories are still recorded as billable but receive no service-rate snapshot.

## Inbox Presentation

The existing ledger-to-Inbox mapping exposes the persisted pricing metadata on `InboxUIMessage`. A small presentation helper supplies no label when pricing is absent, `Free` when Meta marks it non-billable, and `Service (RM<snapshot>)` when Meta marks a service message billable. The outgoing timestamp row renders the label after the time without changing delivery-receipt icons or message content.

## Errors and Idempotency

Invalid or absent pricing fields are treated as absent pricing data; the ordinary delivery status still applies. A billable service receipt without a valid MYR environment rate fails visibly, avoiding an unpriced billing record. Replayed webhook statuses are idempotent: they update the same message and do not create another record or accumulate a counter.

## Tests

- Webhook parsing forwards each Meta pricing field to status handling.
- Receipt persistence stores free pricing and preserves it across later delivery/read statuses.
- Billable service pricing snapshots the required MYR rate without changing Meta's billable decision.
- Ledger-to-Inbox mapping exposes persisted pricing metadata.
- Timestamp-label presentation covers absent, free, and billable-service pricing.
