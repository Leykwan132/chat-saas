# WhatsApp Username Recipient Support

## Goal

Support WhatsApp users who opt in with a username and therefore expose a provider `user_id` instead of a `wa_id`/phone number. Receive their messages, retain their profile identity, keep identity continuity when Meta replaces a user's BSUID, and address outbound WhatsApp messages through Meta's `recipient` property.

## Identity model

`customers.whatsappUserId` is an optional, stable WhatsApp provider identifier. `customers.whatsappUsername` is an optional opted-in username exactly as supplied by the provider. Existing `contactAddress`, `phone`, and phone-based WhatsApp customers remain unchanged.

For a username-only webhook message, `messages[].from_user_id` is the contact identity and must match `contacts[].user_id`. The inbound message and conversation use that identifier as their contact address. The customer stores it in `whatsappUserId`; `profile.name` remains the customer/conversation display name, and `profile.username` is stored in `whatsappUsername`.

The system must not interpret a WhatsApp user ID as a telephone number or populate the phone field with it.

`customers.whatsappUserId` is indexed within the organization and service so a Meta system event can find the record currently associated with a prior BSUID. The existing natural-key lookup by `contactAddress` remains as a compatibility fallback for username contacts created before that index was available.

## Inbound processing

The WhatsApp webhook parser accepts both existing phone-based fields (`wa_id`, `from`) and username-only fields (`user_id`, `from_user_id`). It builds one contact-profile lookup that resolves a profile by the identifier carried by the message. A malformed username-only message that lacks `from_user_id` is ignored without affecting existing phone traffic.

Customer upsert and conversation lookup continue to key on the inbound contact address. This makes repeat username-only events resolve to the same customer and conversation while leaving existing phone-number keys untouched.

### Provider user-ID changes

Meta may deliver a `messages[]` record with `type: "system"` and `system.type` equal to either `"user_changed_user_id"` or `"user_changed_number"`. These are identity-maintenance events, not customer chat messages. The webhook handles them only when `metadata.phone_number_id`, `system.user_id`, and `system.previous_user_id` are non-empty.

The handler resolves the WhatsApp channel from `phone_number_id`, finds a WhatsApp customer in that channel's organization by `previous_user_id`, and updates the matched customer's `whatsappUserId` and `contactAddress` to `user_id`. It also updates every linked WhatsApp conversation's `contactAddress`, preserving the existing thread, assignment, status, and customer relationship so the next message under the new BSUID remains in the same inbox conversation. Historical message rows retain their original `contactAddress` as an event snapshot.

If Meta shares a current phone in `system.wa_id` or message `from`, the handler refreshes `customers.phone` to that value. It does not infer or fabricate a phone number when those fields are absent, and it leaves the opted-in username unchanged because the system event does not provide one. The optional parent-BSUID fields are accepted by the payload parser but are not persisted or used for matching.

No system event is inserted into the inbox, passed to analytics, or used to trigger an AI response. A malformed event, an unchanged ID, an unknown previous BSUID, or an unknown channel is a safe no-op. The next valid customer message remains independently ingestible.

## Outbound processing

A shared WhatsApp recipient builder determines the Meta API address field from a customer identity:

- A customer with `whatsappUserId` uses `{ recipient: whatsappUserId }`.
- A phone-addressed customer uses `{ to: normalizedPhone }`.

The fields are mutually exclusive. The application must never send both, and must never pass a provider user ID through phone normalization.

The builder is used by all customer-addressed WhatsApp sends:

- inbox freeform replies;
- broadcast templates;
- workflow follow-up templates;
- workflow reminder templates.

Manual phone targets and legacy customer records continue to send with `to`.

## Error handling

Sending to a username-only contact without a non-empty `whatsappUserId` fails before making a Meta request. Sending to a phone-only contact without a usable phone target fails under the current phone validation rules. Meta errors continue to be recorded and surfaced by the existing send paths.

## Tests

Focused regressions cover:

1. the supplied username-only webhook shape, including `user_id`, `from_user_id`, display name, and `@username` persistence;
2. repeat username-only inbound messages resolving to the same customer and conversation;
3. phone webhook compatibility;
4. freeform and template payloads using `recipient` for username-only customers;
5. phone payloads retaining `to` and never containing `recipient`.
6. a `user_changed_user_id` system event transferring the current customer identity and linked conversation address to the new BSUID without creating an inbox message;
7. the `user_changed_number` variant applying the same transfer and refreshing the shared phone number when present;
8. malformed, unknown, and no-op system events leaving existing customers and conversations untouched.

## Constraints

- Node.js 22 is required for every script or test command.
- Convex schema and function guidelines in `convex/_generated/ai/guidelines.md` apply.
- Code files remain at or below 300 lines and use clear, comment-free implementation boundaries.
- This is an unshipped customer-facing capability; it must not enter the release changelog until production availability is confirmed.
