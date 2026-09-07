# CONTINUITY.md

# Snapshot

- 2026-09-07 [CODE] Now: partner organization credit periods schedule an exact-time automatic renewal; no existing-organization backfill is needed. Unshipped on `codex/partner-plan-change-timing`.
- 2026-09-07 [CODE] Now: the Partner Programme Customers tab presents organizations and their users; account creation/removal UI now uses “user” terminology. Unshipped.
- 2026-09-07 [USER] Goal: replace Instagram redirect OAuth with Embedded Signup under the same Meta app, using IG-named frontend configuration variables.
- 2026-09-07 [CODE] Now: partner Branding brand name, logo preview tile, sign-in header, and sign-in preview link merged via #101–#103; a fix for the create-organization credit-period race (I003) is in PR. Partner Programme remains unshipped overall.
- 2026-09-07 [CODE] Next: deploy #100, test ordinary and allowlisted connects for both channels, then verify live message/comment delivery.
- 2026-09-07 [CODE] Milestone: booking confirmations and widget newlines shipped on `main` via #96.
- 2026-09-06 [CODE] Milestone: AI booking availability, live-session verification, and confirmation races are on `main` (#94–#96).
- 2026-09-06 [CODE] Milestone: Comment-to-Inbox list/edit/delete/activation and Meta page subscriptions are on `main` (#90–#93); comment webhook ingestion remains unshipped (D781).
- 2026-09-04 [USER] Goal: feature-flagged Comment-to-Inbox for `leykwan132@gmail.com`; design/plan at `docs/superpowers/{specs,plans}/2026-09-04-comment-to-inbox*`.
- 2026-09-04 [TOOL] PostHog flag `enable_comment_to_inbox` (ID 866490) is 100% rolled out; app email allowlist still limits access.
- 2026-09-03 [CODE] Milestone: Gemini Live Avatar connector, cover/background media, and setup editor shipped via #89.
- 2026-09-01 [USER] White-label Partner Programme remains unshipped on `codex/white-label-partner-portal`.

# Decisions

- 2026-09-06 [USER] D782 ACTIVE: availability checks precede session creation and customer-detail collection; an exact requested/selected available slot is confirmation, and complete details must proceed directly to booking and canonical confirmation without an extra confirmation turn.
- 2026-09-07 [TOOL] D781 RESOLVED: Official Meta docs confirm Messenger private replies use `POST /{page-id}/messages` with `recipient.comment_id`; public replies use the comment’s `/comments` edge. Page read/manage permissions are required for keyword fetches and public replies.
- 2026-09-04 [USER] D780 ACTIVE: The customer-facing navigation label is “Comment-to-Inbox”; Comment automations use the unshipped `commentAutomations` backend tables and APIs.
- 2026-09-07 [CODE] D783 ACTIVE: Meta allows one private reply per comment, so overlapping Messenger automations choose one deterministic winner: keyword matches before catch-all matches, then oldest first.
- 2026-09-07 [USER] D784 ACTIVE: Instagram Embedded Signup uses the existing Meta app, shared `VITE_MESSENGER_CODE_EXCHANGE_REDIRECT_URI`, and only one new env value (`VITE_IG_CONFIG_ID`); the configuration must authorize exactly one Page-linked Instagram professional account.
- 2026-09-07 [USER] D785 ACTIVE: keep one Instagram config ID; Page subscription fields are `messages` for ordinary accounts and `messages,feed` only when the Comment-to-Inbox PostHog flag and server-side email allowlist both pass.
- 2026-09-07 [USER] D786 ACTIVE: Messenger follows the same gate: ordinary connects subscribe to `messages,messaging_postbacks`; approved Comment-to-Inbox users also add `feed`, including after Page selection.
- 2026-09-03 [USER] D778 ACTIVE: Avatar cover images are stored in R2 under agent-scoped keys and served through the configured media CDN URL.
- 2026-09-03 [CODE] D779 ACTIVE: Avatar background media uses separate agent-scoped R2 keys and a stored image/video type; LiveAvatar background replacement is browser-side chroma-key compositing.
- 2026-09-02 [USER] D757 ACTIVE: Gemini credentials are externally registered with LiveAvatar. The app reads only opaque `HEYGEN_GEMINI_SECRET_ID` server-side and never persists or exposes the Gemini API key.
- 2026-08-19 [USER] D734 ACTIVE: white-label state is isolated in dedicated partner tables; existing user, team, Stripe, and admin-session records change only through ID relationships.
- 2026-08-19 [USER] D735 SUPERSEDED by D787: shared plan limits take effect immediately; only the new monthly allowance starts at the organization’s next credit cycle.
- 2026-09-07 [USER] D787 ACTIVE: partners choose plan-change timing per organization. Immediate rewrites the current credit period to the new catalog allowance (used credits kept, remaining floored at zero); end-of-period keeps current credits and schedules the switch for the period end. Plan limits still change immediately. Overview Monthly reflects the current period’s granted credits, and a scheduled change is shown under the plan.
- 2026-09-07 [USER] D788 ACTIVE: each new partner organization credit period durably schedules its next renewal for the exact period end; renewal is idempotent, applies pending credit plans, preserves manual grants, and keeps usage-time renewal as a delayed-job fallback.
- 2026-09-07 [USER] D789 ACTIVE: retain the Partner Programme “Customers” tab, but call organization members “users”; one customer organization may contain many users.
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
- 2026-09-07 [USER] I002 RESOLVED: Meta rejected `comments` on the Facebook Page `subscribed_apps` edge with error #100; use valid Page field `feed`, while configuring Instagram-specific fields on the app’s Instagram webhook object.
- 2026-09-07 [TOOL] I003 FIX IN PR: Symptoms: Partner page crashed with `getOverview` "Customer organization credit period not found." right after creating an org. Evidence: prod logs 22:05:34 and 22:06:37 fail at `Promise.all` index 0 then 1; prod data shows both orgs gained periods 144 ms and 49 ms after creation. Cause: `createOrganization` committed the org in one mutation and its credit period in a second, so the overview subscription re-ran in the gap. Mitigation: `persistCreatedOrganization` now creates the period in the same transaction via `createPartnerCreditPeriod`; `initializeFirstCreditPeriod` deleted. Side finding: the deleted mutation hardcoded growth 6000 / business 18000 while `PLAN_CATALOG` says 8000 / 20000; the existing prod business org `yh776ydm3q9srgqtpbjw1az3vd8dz69a` was granted 18000. Data correction UNCONFIRMED, pending user decision.

# Done (recent)

- 2026-09-07 [CODE] Partner `createOrganization` now provisions the org and its first credit period atomically, closing the `getOverview` crash window (I003); in PR.
- 2026-09-07 [CODE] Milestone: partner Branding brand name, green-check connected domain, logo preview tile, centered subtitle-free sign-in header, and sign-in preview link are on `main` (#101–#103).
- 2026-09-07 [CODE] Implemented Instagram Embedded Signup with Page-linked account persistence and dual routing that preserves existing Instagram Login connections; unshipped.
- 2026-09-07 [CODE] Messenger Comment-to-Inbox ingestion, deterministic matching, customer-first persistence, private/public sends, outcome counters, and response attribution merged via #98.
- 2026-09-07 [CODE] Milestone: widget newline preservation and canonical booking confirmation layout shipped on `main` (#96).
- 2026-09-06 [CODE] Milestone: sessionless availability, live booking-session checks, and confirmation-race fixes shipped on `main` (#94–#96).
- 2026-09-06 [CODE] Milestone: Comment-to-Inbox delete, activation, and subscription UX shipped on `main` (#90–#93).

# Working set

- 2026-09-07 [CODE] `convex/whiteLabel/{creditLedger,creditRenewal,portalProvisioning}*`, `convex/_generated/api.d.ts`
- 2026-09-07 [CODE] `src/components/partner/{PartnerCustomerForms,PartnerCustomerList,PartnerCustomerCredentialsDialog,PartnerOrganizationList}*`, `src/pages/PartnerPage*`
- 2026-09-07 [CODE] `shared/commentToInboxAccess.ts`, `src/components/Connect{Instagram,Messenger}Button*`, `convex/{instagramEmbeddedSignup,messengerConnect,messengerAuth,oauthSessions,commentAutomationMeta,schema}*`
- 2026-09-07 [CODE] `src/components/partner/PartnerBrandingTab*`, `src/pages/{PartnerPage,SignInPage}.tsx`, `convex/whiteLabel/{portal,portalActions,portalProvisioning,portalOverview,creditLedger}.ts`

# Receipts

- 2026-09-07 [TOOL] Automatic partner credit renewal passed 8 focused credit, plan-change, and workspace-access tests, targeted ESLint, Convex code generation/TypeScript validation, and `git diff --check`.
- 2026-09-07 [TOOL] Partner customer-to-user terminology passed 26 focused UI tests, targeted ESLint, and `git diff --check`.
- 2026-09-07 [TOOL] Atomic partner org provisioning: new `convex-test` regression fails on the old code (`expected null not to be null`) and passes on the fix; Node v22 targeted ESLint, `tsc --noEmit -p convex/tsconfig.json`, Convex codegen, and `git diff --check` pass. Prod verified read-only via `convex data --prod`.
- 2026-09-07 [TOOL] Partner Branding sign-in preview link passed 29 focused tests, Node v22 targeted ESLint, `tsc --noEmit -p tsconfig.app.json`, and `git diff --check`; browser verification stayed blocked by the unauthenticated local session.
- 2026-09-07 [TOOL] Feature-gated Instagram and Messenger Page subscriptions passed 31 focused tests, Node v22 targeted ESLint, TypeScript project checking, Convex code generation, and `git diff --check`.
- 2026-09-07 [TOOL] Messenger Comment-to-Inbox passed 53 focused tests, Node v22 targeted ESLint, TypeScript project checking, Convex code generation, file-size limits, and `git diff --check`.
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
