# CONTINUITY.md

# Snapshot

- 2026-09-07 [USER] Goal: process Messenger Page `feed` comment webhooks through Comment-to-Inbox and send the configured private message plus optional public reply.
- 2026-09-07 [CODE] Now: Messenger comments resolve `entry.id` to `channels.pageId`, select an active subscribed automation, persist the customer/conversation and one deduplicated delivery, then send and record private/public outcomes; unshipped.
- 2026-09-07 [CODE] Next: review and merge the implementation PR, configure Embedded Signup with the added Page read/manage permissions, reconnect the Page if its existing token lacks them, then verify a live comment.
- 2026-09-07 [CODE] Milestone: booking confirmations and widget newlines shipped on `main` via #96.
- 2026-09-06 [CODE] Milestone: AI booking availability, live-session verification, and confirmation races are on `main` (#94–#96).
- 2026-09-06 [CODE] Milestone: Comment-to-Inbox list/edit/delete/activation and Meta page subscriptions are on `main` (#90–#93); comment webhook ingestion remains unshipped (D781).
- 2026-09-04 [USER] Goal: feature-flagged Comment-to-Inbox for `leykwan132@gmail.com`; design/plan at `docs/superpowers/{specs,plans}/2026-09-04-comment-to-inbox*`.
- 2026-09-04 [TOOL] PostHog flag `enable_comment_to_inbox` (ID 866490) is 100% rolled out; app email allowlist still limits access.
- 2026-09-03 [CODE] Milestone: Gemini Live Avatar connector, cover/background media, and setup editor shipped via #89.
- 2026-09-01 [USER] White-label Partner Programme remains unshipped on `codex/white-label-partner-portal`.

# Decisions

- 2026-09-06 [USER] D782 ACTIVE: availability checks precede session creation and customer-detail collection; an exact requested/selected available slot is confirmation, and complete details must proceed directly to booking and canonical confirmation without an extra confirmation turn.
- 2026-09-04 [TOOL] D781 OPEN: Live Meta comment subscriptions and sends are paused pending verification of the Instagram/Messenger endpoint and required scopes. Official Meta documentation requests returned rate-limit errors; do not infer a production endpoint from the user payload alone.
- 2026-09-04 [USER] D780 ACTIVE: The customer-facing navigation label is “Comment-to-Inbox”; Comment automations use the unshipped `commentAutomations` backend tables and APIs.
- 2026-09-07 [CODE] D783 ACTIVE: Meta allows one private reply per comment, so overlapping Messenger automations choose one deterministic winner: keyword matches before catch-all matches, then oldest first.
- 2026-09-03 [USER] D778 ACTIVE: Avatar cover images are stored in R2 under agent-scoped keys and served through the configured media CDN URL.
- 2026-09-03 [CODE] D779 ACTIVE: Avatar background media uses separate agent-scoped R2 keys and a stored image/video type; LiveAvatar background replacement is browser-side chroma-key compositing.
- 2026-09-02 [USER] D757 ACTIVE: Gemini credentials are externally registered with LiveAvatar. The app reads only opaque `HEYGEN_GEMINI_SECRET_ID` server-side and never persists or exposes the Gemini API key.
- 2026-08-19 [USER] D734 ACTIVE: white-label state is isolated in dedicated partner tables; existing user, team, Stripe, and admin-session records change only through ID relationships.
- 2026-08-19 [USER] D735 ACTIVE: shared plan limits take effect immediately; only the new monthly allowance starts at the organization’s next credit cycle.
- 2026-08-19 [USER] D736 ACTIVE: partner-created workspaces use their organization wallet and manual grants; Stripe payment and top-up paths are blocked.
- 2026-08-19 [USER] D742 ACTIVE: Partner Programme has Overview, Customers, and Branding in a subtle vertical ghost navigation.
- 2026-08-19 [USER] D743–D760 ACTIVE: custom hostnames use the configured Cloudflare SaaS zone, CNAME-only subdomains, DCV delegation, explicit DNS confirmations, concise polling, and expandable completed setup steps.
- 2026-08-24 [USER] D763 ACTIVE: Customers has separate organization and customer tables; organization counts include pending and accepted invitations, active has a green dot, and suspension requires confirmation.
- 2026-08-24 [USER] D770 ACTIVE: partner-provisioned passwords are encrypted at rest, revealed only by an authorized row action, and marked historical after WorkOS emits `password_reset.succeeded`.
- 2026-08-25 [USER] D771 ACTIVE: a partner-created customer skips onboarding and may access only their assigned organization; personal and other workspace switching is server-blocked.
- 2026-08-25 [USER] D773 ACTIVE: partners can change active customer roles and WorkOS/local membership records update together.
- 2026-08-25 [USER] D774–D775 ACTIVE: members without agent-create access see an explanatory empty state; partner-managed workspaces hide Get Free Credits.
- 2026-08-25 [USER] D776 ACTIVE: partner-created customers authenticate only through their assigned connected partner hostname; native Kilobot sign-in rejects them while native users retain AuthKit.
- 2026-09-03 [USER] D777 ACTIVE: each partner customer remains restricted to one assigned workspace and cannot create additional workspaces.
- 2026-08-31 [USER] D756 ACTIVE: valid WhatsApp BSUID-change system events move the customer recipient ID and linked WhatsApp conversation address without creating an inbox, analytics, or AI event.
- 2026-09-06 [CODE] I001 OPEN: Hallucinated booking/email-link copy is replaced after generation; unverified claims now receive a safe retry response rather than silence. Remaining gap: playground can briefly stream model text before the saved message is rewritten.

# Done (recent)

- 2026-09-07 [CODE] Implemented Messenger Comment-to-Inbox ingestion, deterministic matching, customer-first persistence, private/public sends, outcome counters, and response attribution; unshipped.
- 2026-09-07 [CODE] Milestone: widget newline preservation and canonical booking confirmation layout shipped on `main` (#96).
- 2026-09-06 [CODE] Milestone: sessionless availability, live booking-session checks, and confirmation-race fixes shipped on `main` (#94–#96).
- 2026-09-06 [CODE] Milestone: Comment-to-Inbox delete, activation, and subscription UX shipped on `main` (#90–#93).
- 2026-09-03 [CODE] Milestone: Gemini Live Avatar connector and editor shipped on `main` (#89).

# Working set

- 2026-09-07 [CODE] `convex/{commentAutomation{Event,Ingest,Delivery,Meta}.{ts,test.ts},messengerAuth.ts,messengerWebhook.ts,schema.ts,_generated/api.d.ts}`

# Receipts

- 2026-09-07 [TOOL] Messenger Comment-to-Inbox passed 10 focused tests, Node v22 targeted ESLint, TypeScript project checking, Convex code generation, file-size limits, and `git diff --check`.
- 2026-09-07 [TOOL] Booking-confirmation layout and widget newline preservation passed 31 focused tests, targeted ESLint, and `git diff --check`.
- 2026-09-06 [TOOL] Sessionless availability and direct post-collection booking passed 11 booking regression tests, targeted ESLint, TypeScript build checking, and `git diff --check`.
- 2026-09-05 [TOOL] Comment-to-Inbox single-form edit modal passed 12 focused UI tests, Node v22 ESLint, and `git diff --check`.
- 2026-09-05 [TOOL] Comment-to-Inbox edit page-selection hydration passed 12 focused UI tests, Node v22 ESLint, TypeScript no-emit, and `git diff --check`.
- 2026-09-05 [TOOL] Comment-to-Inbox sent-count tooltip passed 11 focused UI tests, Node v22 ESLint, TypeScript no-emit, and `git diff --check`.
- 2026-09-05 [TOOL] Comment-to-Inbox edit hydration passed 11 focused UI tests, Node v22 ESLint, TypeScript no-emit, and `git diff --check`.
- 2026-09-05 [TOOL] Comment-to-Inbox immediate edit modal loading passed 11 focused UI tests, Node v22 ESLint, TypeScript no-emit, and `git diff --check`.
- 2026-09-05 [TOOL] Comment-to-Inbox edit form and sent-count UI passed 10 focused UI tests, Node v22 ESLint, TypeScript no-emit, and `git diff --check`; Convex codegen was blocked by unavailable telemetry DNS.
- 2026-09-05 [TOOL] Comment-to-Inbox detail modal passed 9 focused UI tests, Node v22 targeted ESLint, and `git diff --check`.
- 2026-09-05 [TOOL] Comment-to-Inbox Save spinner passed 8 focused UI tests, Node v22 targeted ESLint, and `git diff --check`.
- 2026-09-05 [TOOL] Comment-to-Inbox empty-state action and neutral background passed 8 focused UI tests, Node v22 targeted ESLint, and `git diff --check`.
- 2026-09-05 [TOOL] Older Comment-to-Inbox, Avatar, partner, and booking receipts compressed; see #89–#96 and prior CONTINUITY history.
