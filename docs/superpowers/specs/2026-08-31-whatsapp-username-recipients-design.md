# WhatsApp Username Recipient Support

## Goal

Support WhatsApp users who opt in with a username and therefore expose a provider `user_id` instead of a `wa_id`/phone number. Receive their messages, retain their profile identity, and address outbound WhatsApp messages through Meta's `recipient` property.

## Identity model

`customers.whatsappUserId` is an optional, stable WhatsApp provider identifier. `customers.whatsappUsername` is an optional opted-in username exactly as supplied by the provider. Existing `contactAddress`, `phone`, and phone-based WhatsApp customers remain unchanged.

For a username-only webhook message, `messages[].from_user_id` is the contact identity and must match `contacts[].user_id`. The inbound message and conversation use that identifier as their contact address. The customer stores it in `whatsappUserId`; `profile.name` remains the customer/conversation display name, and `profile.username` is stored in `whatsappUsername`.

The system must not interpret a WhatsApp user ID as a telephone number or populate the phone field with it.

## Inbound processing

The WhatsApp webhook parser accepts both existing phone-based fields (`wa_id`, `from`) and username-only fields (`user_id`, `from_user_id`). It builds one contact-profile lookup that resolves a profile by the identifier carried by the message. A malformed username-only message that lacks `from_user_id` is ignored without affecting existing phone traffic.

Customer upsert and conversation lookup continue to key on the inbound contact address. This makes repeat username-only events resolve to the same customer and conversation while leaving existing phone-number keys untouched.

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

## Constraints

- Node.js 22 is required for every script or test command.
- Convex schema and function guidelines in `convex/_generated/ai/guidelines.md` apply.
- Code files remain at or below 300 lines and use clear, comment-free implementation boundaries.
- This is an unshipped customer-facing capability; it must not enter the release changelog until production availability is confirmed.
