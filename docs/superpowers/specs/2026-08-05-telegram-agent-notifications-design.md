# Telegram agent notifications design

## Goal

Allow each agent to send Telegram notifications to as many as five explicitly authorized phone numbers. A phone number identifies the recipient, a verified Telegram private-chat ID is the delivery address, and one recipient may authorize notifications from multiple agents.

## Scope

The first release sends Telegram notifications for:

- Human escalation raised
- Appointment booked
- Appointment updated
- Appointment cancelled

Every active recipient for the affected agent receives the same event types. Per-recipient event preferences, notification history, digesting, and a delivery dashboard are outside this release.

## Data model

The model separates Telegram identity from agent-specific permission.

### Telegram notification recipients

`telegramNotificationRecipients` contains one application-level record per canonical phone number:

- `phoneDigits`: digits-only international number, such as `60129499394`
- `status`: `pending`, `verified`, or `blocked`
- `telegramChatId`: optional private-chat ID stored as a string
- `telegramUserId`: optional Telegram user ID stored as a string
- `firstName`: optional Telegram first name
- `lastName`: optional Telegram last name
- `verifiedAt`: optional verification timestamp
- `createdAt`
- `updatedAt`

Indexes:

- `by_phoneDigits`
- `by_telegramChatId`
- `by_telegramUserId`

Application mutations enforce one recipient record per `phoneDigits` value.

### Agent Telegram notification subscriptions

`agentTelegramNotificationSubscriptions` contains one permission record per agent and recipient:

- `agentId`
- `recipientId`
- `status`: `pending`, `active`, or `disabled`
- `verificationTokenHash`: optional SHA-256 hash of the current one-time token
- `verificationChatId`: optional chat ID bridging the start command to the contact share
- `verifiedAt`: optional agent-specific consent timestamp
- `createdAt`
- `updatedAt`

Indexes:

- `by_agentId`
- `by_agentId_and_status`
- `by_agentId_and_recipientId`
- `by_recipientId`
- `by_verificationTokenHash`
- `by_verificationChatId_and_updatedAt`

Application mutations enforce one subscription per agent and recipient. Every saved row, including pending and disabled rows, occupies one of the agent's five slots. Removing a row frees the slot.

## Phone normalization

The canonical stored value is the international phone number without `+`, whitespace, or punctuation. Both dashboard input and Telegram `contact.phone_number` use the same normalizer.

Normalization removes non-digits, removes a leading international `00` prefix, and then requires 8 to 15 digits beginning with 1–9. It does not silently infer a missing country code. The dashboard uses a country-aware phone input to convert local entry to international format before submission.

Examples:

- `60129499394` becomes `60129499394`
- `+60 12-949 9394` becomes `60129499394`
- `0060129499394` becomes `60129499394`
- `0129499394` is rejected by the backend because it lacks an explicit country code

The UI may format the canonical value for display, but mutations and indexes always use `phoneDigits`.

## Recipient management

Agent Setup gains a Telegram Notifications section visible to users who can manage the agent. It shows the five-slot usage and each saved number's `Pending`, `Verified`, `Blocked`, or `Disabled` state.

The section supports:

- Adding an international phone number
- Generating and immediately copying a Telegram verification link
- Generating a replacement for an unused link
- Disabling or enabling an active subscription
- Removing a subscription

Adding a number authenticates the current user, confirms agent-management permission, normalizes the phone, gets or creates the recipient, rejects an existing agent-recipient subscription, enforces the five-row limit transactionally, and inserts a pending subscription.

Removing the final subscription for a recipient does not delete the recipient record automatically. That record preserves the verified Telegram identity if the same number is authorized for another agent or added again later.

## Verification links

Convex generates 32 random bytes with Web Crypto, encodes them as base64url, and returns the raw token only in the generated link. The subscription stores only the SHA-256 hash. The token does not expire, is single-use, and remains valid only while the subscription is pending. Successful verification, regeneration, disabling, or removal invalidates it.

Because the raw token is not stored, the UI can display and copy a link only from the mutation response that created it. After a reload, the user generates a replacement link instead of retrieving the previous one.

The configured username is `notifications_kilobot`, read from `NOTIFICATION_BOT_USERNAME`. A generated link has this form:

```text
https://t.me/notifications_kilobot?start=<raw_token>
```

The raw token remains within Telegram's 64-character start-parameter limit.

## Telegram verification flow

After the recipient opens the link and presses Start, Telegram sends `/start <raw_token>` to the notification bot. Because the bot is registered to `POST /webhook/telegram`, the update reaches the existing Convex HTTP action.

The handler authenticates the webhook secret, parses the start token, hashes it, and finds the pending subscription. It rejects missing, unknown, used, or non-pending tokens with a generic Telegram response that does not reveal subscription data.

For a valid token, the handler clears any other incomplete verification session associated with the same Telegram chat, stores that chat ID as `verificationChatId` on the selected subscription, and sends the contact-sharing keyboard using `NOTIFICATION_BOT_TOKEN`.

The subsequent contact update does not repeat the start token. The handler finds the most recently updated pending subscription for that chat and requires:

- A private `message` update
- `message.contact.user_id` equal to `message.from.id`
- The normalized contact phone equal to the linked recipient's `phoneDigits`
- A pending subscription still bound to the same verification chat

On success, one mutation updates the recipient to `verified`, saves the permanent Telegram chat and user IDs plus names, activates only the selected agent subscription, clears the token and verification chat, records both verification timestamps, and returns the `Your notifications are ready!` confirmation.

One recipient may repeat this flow for another agent. The recipient record is reused, but each agent subscription requires its own explicit link and successful contact share.

The existing exact `Hi` development trigger is removed when the token flow is enabled. Production logs do not emit raw phone numbers, tokens, webhook secrets, or full Telegram updates.

## Notification dispatch

Event producers call one internal notification entry point with the agent ID, event kind, and validated display payload. The entry point queries `agentTelegramNotificationSubscriptions` through `by_agentId_and_status`, takes at most five active rows, and schedules one asynchronous send per subscription. It never scans all recipients or subscriptions.

Each worker reloads the subscription and recipient immediately before sending. It skips removed, disabled, non-active, non-verified, blocked, or chatless records. Telegram requests use `NOTIFICATION_BOT_TOKEN`; the bot username is not used for API calls.

The first release uses a dedicated bounded Workpool and its component-level retry state without an application delivery-history table. Delivery is therefore at-least-once: a rare transient failure after Telegram accepted a message but before the response reached Convex may produce a duplicate. Failures are logged without phone numbers or tokens.

Telegram responses indicating that the bot is blocked or the private chat is unavailable mark the recipient `blocked`, which stops delivery for every agent subscription that uses that recipient. A successful new verification restores the recipient to `verified`.

## Event integration

Notification enqueueing occurs at the authoritative state-transition boundary, not by scanning conversation logs.

- Human escalation enqueueing follows the committed escalation state change and includes the agent, conversation, customer display name when available, and escalation question.
- Appointment booking enqueueing follows creation of an agent-owned appointment.
- Appointment update enqueueing follows a material change to an agent-owned appointment, including schedule, assigned teammate, customer details, status, or remarks.
- Appointment cancellation enqueueing follows the transition to cancelled from every supported dashboard and AI cancellation path.

Generic calendar events without an `agentId` do not send agent notifications. Shared helper functions keep manual, dashboard, and AI booking paths aligned.

A transition to cancelled emits only the cancellation event, not both update and cancellation. Repeated writes that leave an appointment cancelled do not enqueue another cancellation notification.

Telegram messages contain a concise event title, agent name, relevant customer or appointment summary, local date/time where applicable, and a dashboard link. They do not include customer phone numbers, full conversation transcripts, or hidden AI context.

## Authorization and privacy

Only authenticated users with agent-management permission may list, add, regenerate, disable, enable, or remove subscriptions. Every mutation loads the agent through the existing ownership and organization boundary rather than trusting a client-supplied organization or user ID.

The Telegram webhook is public but requires `TELEGRAM_WEBHOOK_SECRET`. Possession of a start token is not sufficient: activation also requires Telegram's self-contact share and an exact canonical phone match.

Phone numbers and Telegram identifiers are treated as personal data. Backend errors and production logs mask them. Removing temporary webhook diagnostics is part of this release.

## Environment and webhook configuration

The deployment requires:

- `NOTIFICATION_BOT_TOKEN`
- `NOTIFICATION_BOT_USERNAME=notifications_kilobot`
- `TELEGRAM_WEBHOOK_SECRET`

The notification bot token must register `https://outstanding-rabbit-215.convex.site/webhook/telegram` for the development deployment, with the same webhook secret configured in Convex. Production uses its own Convex site URL and environment values.

## Testing

Focused tests cover:

- Canonical phone normalization and rejection of local-only or malformed values
- Transactional five-subscription enforcement and duplicate prevention
- Recipient reuse across agents
- Token hashing, regeneration, single use, and invalid-token responses
- `/start <token>` parsing and contact-keyboard sending
- Self-contact ownership and phone matching
- Activation of only the selected agent subscription
- Multiple-agent subscriptions for one recipient
- Indexed active-recipient resolution capped at five
- Skipping disabled, pending, blocked, removed, and chatless records
- Notification payloads for escalation, booking, update, and cancellation events
- Use of `NOTIFICATION_BOT_TOKEN`
- Blocked-chat handling and safe log redaction
- Agent-management authorization and organization isolation

An end-to-end development check registers the notification bot webhook, opens a real generated link, shares the matching contact, observes the active subscription, triggers one test notification, and verifies receipt from `notifications_kilobot`.

## Non-goals

This release does not add per-recipient event preferences, notification digests, quiet hours, notification delivery history, a resend dashboard, SMS delivery, Telegram group delivery, or automatic activation of every pending agent subscription for a verified phone.
