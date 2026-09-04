# Comment-to-Inbox Design

## Purpose

Comment-to-Inbox turns qualifying Instagram and Messenger comments into a private customer conversation. It is initially a controlled release: the sidebar entry is visible only when its PostHog flag is enabled and the signed-in email is `leykwan132@gmail.com`.

The customer-facing navigation label is **Comment-to-Inbox**. A configured automation is called a **Comment campaign**.

## Product behavior

The Comment-to-Inbox item appears in the dashboard sidebar directly above Tools. It opens a campaign list with a create action, status toggle, sent count, and responded count for every campaign.

A campaign creation flow collects:

1. A campaign name.
2. One or more connected Instagram or Messenger pages.
3. A trigger: any comment, or keywords.
4. Zero or more keyword or phrase values when keywords is selected. Matching is case-insensitive and any entered value matches.
5. A required private inbox message.
6. An optional public reply to the original comment.

The campaign is inactive until each selected page has a confirmed comment-event subscription. The user may activate or deactivate a campaign after creation. An inactive campaign never sends messages.

Free workspaces may store one campaign total, whether active or inactive. Paid workspaces may store an unlimited number. The server enforces this rule; the client presents the appropriate upgrade state before creation.

## Campaign pages and subscriptions

The page picker lists connected Instagram and Messenger channels available to the active workspace. A campaign stores the selected channel IDs instead of copied access tokens or page credentials.

Activating a campaign verifies and creates the required Meta comment subscriptions for each selected resource. Messenger page subscriptions are extended to include the relevant comment/feed event in addition to the existing messaging events. Instagram connections are extended to subscribe to the supported comment event for the selected Instagram business account.

If any selected resource cannot be subscribed, activation fails atomically and the campaign stays inactive. The campaign detail shows the exact failed page and Meta error, and the user can reconnect that page before retrying. Deactivation stops processing immediately; it does not remove the resource subscription, because another active campaign may still rely on it.

## Data model

New tables are isolated from generic inbox records:

- `commentCampaigns`: workspace ownership, name, status, trigger configuration, private message text, optional public reply text, and denormalized sent/responded counters.
- `commentCampaignPages`: one row per selected campaign channel, including the current subscription status and most recent subscription error.
- `commentCampaignDeliveries`: one immutable row per campaign/comment match, keyed by the source comment ID. It stores source channel, customer/conversation references, comment text and timestamp, private/public send outcomes, sent time, response time, and a failure reason where applicable.

Indexes cover workspace listing, campaign pages by campaign and channel, delivery lookup by source comment, campaign detail pagination, and the unresolved delivery lookup required to mark a response. Counter fields are updated transactionally with delivery state changes rather than counted from a growing delivery table.

## Webhook and delivery flow

The existing Instagram and Messenger webhook entry points are extended to normalize incoming comment events into one internal comment-ingestion service.

For each event, the ingestion service:

1. Validates the resource is a connected workspace channel.
2. Deduplicates against a delivery/source-event record before any side effect.
3. Locates matching active campaigns for that channel and evaluates the selected trigger.
4. Creates or updates the customer and inbox conversation before outbound delivery.
5. Inserts a delivery record in a pending state.
6. Sends the required private message using Meta's comment-to-private-message capability.
7. Sends the optional public reply, when configured.
8. Records each outcome and increments `sentCount` only when the private message succeeded.

An outbound private message failure leaves the delivery failed with its actionable error and does not increment sent. An optional public reply failure is retained separately so the successful private message remains attributable. Retriable transport failures are scheduled through a dedicated worker with bounded attempts; permanent Meta policy and permission errors remain visible for correction.

## Response attribution

An inbound Instagram or Messenger message is processed by the existing inbox webhook pipeline. After the normal customer/conversation ingestion succeeds, it checks for the oldest unresolved successful Comment-to-Inbox delivery for that customer, channel, and campaign. It marks that delivery as responded, records the response time, and increments the campaign's `respondedCount` once.

Only a customer-originated message after the private delivery counts as a response. Public comment activity does not count as a response.

## Screens

The list provides campaign name, active/inactive state, page count, trigger summary, sent, responded, and a creation action. A Free workspace at its limit sees an upgrade affordance rather than a second create flow.

The campaign detail provides the current configuration, subscription health per selected page, sent/responded totals, activation controls, and a paginated delivery activity list. Each activity row shows the source comment, customer, private/public outcome, sent time, response state, and any failure reason.

## Access and release safety

Client visibility requires both the dedicated PostHog flag and the allowed-email check. Every public Convex entry point independently verifies the authenticated user email and workspace authorization. No client-supplied user ID, plan, or channel ownership claim is trusted.

The feature is intentionally unavailable to all other users until the allowlist is expanded or removed. Existing channel messaging and inbox behavior remain unchanged for comments that do not match an active campaign.

## Testing

Focused coverage includes:

- flag and allowed-email route/sidebar gating;
- Free versus paid campaign limit enforcement;
- campaign creation, page selection, activation, and subscription failure behavior;
- any-comment and case-insensitive keyword matching;
- duplicate webhook idempotency;
- customer and conversation persistence before sends;
- private-only and private-plus-public delivery outcomes;
- sent and response counter correctness;
- response attribution and no double-counting;
- authorization, page ownership, and inactive-campaign guards.

No production deployment is included in this work. Meta permission and webhook configuration changes are validated through the app's configured integration and reported clearly if a selected connection needs reauthorization.
