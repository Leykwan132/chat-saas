# CONTINUITY.md

# Snapshot

- 2026-09-08 [CODE] Now: partner Settings → Usage crash (I007) plus leftover Settings/admin follow-ups are in #113. Next: review/merge, deploy, verify Usage on the partner host.
- 2026-09-08 [CODE] Milestone: partner-host `/workspace` infinite loading spinner (I005) merged via #111. Post-deploy verification on `chat.morphswiftstudio.com` UNCONFIRMED.
- 2026-09-08 [CODE] Now: signed-in sidebars (`/workspace`, `/dashboard/*`) show the partner logo and name on custom hostnames; in #110 (merged with `main` at #109).
- 2026-09-08 [CODE] Milestone: partner-host `/workspace` crash (I004) fix, partner favicon, and customizable browser tab title shipped on `main` (#107–#109).
- 2026-09-07 [CODE] Now: partner organization credit periods schedule an exact-time automatic renewal; no existing-organization backfill is needed. Unshipped on `codex/partner-plan-change-timing`.
- 2026-09-07 [CODE] Now: the Partner Programme Customers tab presents organizations and their users; account UI uses “user” terminology and Overview separates organization and user totals. Unshipped.
- 2026-09-07 [USER] Goal: replace Instagram redirect OAuth with Embedded Signup under the same Meta app, using IG-named frontend configuration variables.
- 2026-09-07 [CODE] Now: partner Branding brand name, logo preview tile, sign-in header, sign-in preview link, and atomic organization credit provisioning merged via #101–#104. Partner Programme remains unshipped overall.
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
- 2026-09-07 [USER] D789 ACTIVE: retain the Partner Programme “Customers” tab, but call organization members “users”; one customer organization may contain many users, and Overview shows separate Organizations and Users metrics.
- 2026-08-19 [USER] D736 ACTIVE: partner-created workspaces use their organization wallet and manual grants; Stripe payment and top-up paths are blocked.
- 2026-08-19 [USER] D742 ACTIVE: Partner Programme has Overview, Customers, and Branding in a subtle vertical ghost navigation.
- 2026-08-19 [USER] D743–D760 ACTIVE: custom hostnames use the configured Cloudflare SaaS zone, CNAME-only subdomains, DCV delegation, explicit DNS confirmations, concise polling, and expandable completed setup steps.
- 2026-08-24 [USER] D763 ACTIVE: Customers has separate organization and customer tables; organization counts include pending and accepted invitations, active has a green dot, and suspension requires confirmation.
- 2026-08-24 [USER] D770 ACTIVE: partner-provisioned passwords are encrypted at rest, revealed only by an authorized row action, and marked historical after WorkOS emits `password_reset.succeeded`.
- 2026-08-25 [USER] D771 ACTIVE: a partner-created customer skips onboarding and may access only their assigned organization; personal and other workspace switching is server-blocked.
- 2026-08-25 [USER] D773 ACTIVE: partners can change active customer roles and WorkOS/local membership records update together.
- 2026-08-25 [USER] D774–D775 ACTIVE: members without agent-create access see an explanatory empty state; partner-managed workspaces hide Get Free Credits.
- 2026-08-25 [USER] D776 ACTIVE: partner-created customers authenticate only through their assigned connected partner hostname; native Kilobot sign-in rejects them while native users retain AuthKit.
- 2026-09-08 [USER] D790 ACTIVE: billing is session-surface scoped, allowing one WorkOS identity to use native Kilobot and one or more Partner Programme organizations. Native AuthKit sessions use Stripe; custom-domain partner JWTs use their exact signed `partnerOrganizationId` plan/credits. `activeTeamId` and mere account existence cannot select billing context. Multiple valid organizations on one partner domain are selected after password verification and revalidated before issuing the scoped JWT.
- 2026-09-08 [USER] D791 ACTIVE: Partner Programme admins can create agents; plan-change dialog actions keep Cancel immediately beside Confirm.
- 2026-09-03 [USER] D777 ACTIVE: each partner customer remains restricted to one assigned workspace and cannot create additional workspaces.
- 2026-08-31 [USER] D756 ACTIVE: valid WhatsApp BSUID-change system events move the customer recipient ID and linked WhatsApp conversation address without creating an inbox, analytics, or AI event.
- 2026-09-06 [CODE] I001 OPEN: Hallucinated booking/email-link copy is replaced after generation; unverified claims now receive a safe retry response rather than silence. Remaining gap: playground can briefly stream model text before the saved message is rewritten.
- 2026-09-07 [USER] I002 RESOLVED: Meta rejected `comments` on the Facebook Page `subscribed_apps` edge with error #100; use valid Page field `feed`, while configuring Instagram-specific fields on the app’s Instagram webhook object.
- 2026-09-08 [USER] I007 FIX IN #113: Symptoms: partner user on Settings → Usage got Convex `getAccountCreditUsage` Server Error. Cause: that query (and sibling spend/workspace usage queries) still called `getActiveTeamForUser` + Stripe, which skips the signed white-label team and can throw `Personal team not found` or resolve the wrong wallet. Mitigation: `resolveCreditUsageSession` uses the signed partner org plan/period/timezone; native path unchanged. Deploy/verify on `chat.morphswiftstudio.com` UNCONFIRMED.
- 2026-09-08 [USER] I006 FIX REVISED IN DRAFT #112: `kilobot.app` bounced `leykwan132@gmail.com` to onboarding because plan resolution followed a persisted customer-workspace `activeTeamId` and masked the active Stripe subscription. Mitigation: signed auth surface selects entitlement scope; native sessions ignore customer teams and use Stripe, while partner sessions validate exact domain/partner/org/account/team claims and use that organization wallet. Side finding: the user may have started a real personal Stripe subscription during the loop; refund/cancel decision UNCONFIRMED.
- 2026-09-08 [USER] I005 RESOLVED (#111): Symptoms: `chat.morphswiftstudio.com/workspace` spins forever after partner sign-in; Kilobot host unaffected. Cause: `usePartnerConvexAuth` returned a new `fetchAccessToken` arrow every render; `ConvexProviderWithAuth` keys its `setAuth` effect on that function, so each successful auth re-render cleared auth and re-ran it (loading never settled). Mitigation: hook moved to `src/partnerAuth/usePartnerConvexAuth.ts` with `useCallback`; `usePartnerConvexAuth.test.tsx` fails if the callback identity changes across renders. Side finding: pre-existing `react-refresh/only-export-components` lint error in `AppAuthProvider.tsx` (line 26) untouched.
- 2026-09-08 [USER] I004 RESOLVED (#109): Symptoms: `chat.morphswiftstudio.com/workspace` threw “useAuth must be used within an AuthKitProvider” after partner sign-in. Cause: `RequireOrganization`, `SettingsPage`, and `PricingPage` imported `useAuth` from `@workos-inc/authkit-react`, which has no provider on partner hosts. Mitigation: all three use the host-aware `useAuth` from `@/partnerAuth/AppAuthProvider`; `src/partnerAuth/appAuthUsage.test.ts` fails if any file outside the two auth providers imports the WorkOS hook again.
- 2026-09-07 [TOOL] I003 FIX IN PR: Symptoms: Partner page crashed with `getOverview` "Customer organization credit period not found." right after creating an org. Evidence: prod logs 22:05:34 and 22:06:37 fail at `Promise.all` index 0 then 1; prod data shows both orgs gained periods 144 ms and 49 ms after creation. Cause: `createOrganization` committed the org in one mutation and its credit period in a second, so the overview subscription re-ran in the gap. Mitigation: `persistCreatedOrganization` now creates the period in the same transaction via `createPartnerCreditPeriod`; `initializeFirstCreditPeriod` deleted. Side finding: the deleted mutation hardcoded growth 6000 / business 18000 while `PLAN_CATALOG` says 8000 / 20000; the existing prod business org `yh776ydm3q9srgqtpbjw1az3vd8dz69a` was granted 18000. Data correction UNCONFIRMED, pending user decision.

# Done (recent)

- 2026-09-08 [CODE] Partner Usage tab reads the signed org wallet instead of Stripe/personal team (I007).
- 2026-09-08 [CODE] Admin role can create agents; Confirm plan change keeps Cancel beside Confirm; dual-role sessions stay surface-scoped (I006, #112).
- 2026-09-08 [CODE] Partner-host Convex auth no longer loops: stable `fetchAccessToken` via `useCallback` in `src/partnerAuth/usePartnerConvexAuth.ts` (I005, #111).
- 2026-09-08 [CODE] Sidebar brand mark follows the hostname: partner logo + name (initial if no logo) on custom domains, Kilobot on native hosts; branding lookup shared via `useHostBranding` (#110).
- 2026-09-08 [CODE] Partner customers can enter `/workspace`, Settings, and Pricing on their domain; direct WorkOS `useAuth` imports replaced with the host-aware hook (I004, #109 on `main`).
- 2026-09-08 [CODE] Milestone: partner favicon, custom tab title, and Branding sign-in polish on `main` (#101–#108).
- 2026-09-07 [CODE] Partner `createOrganization` now provisions the org and its first credit period atomically, closing the `getOverview` crash window (I003); in PR.

# Working set

- 2026-09-07 [CODE] `convex/whiteLabel/{creditLedger,creditRenewal,portalProvisioning}*`, `convex/_generated/api.d.ts`
- 2026-09-07 [CODE] `src/components/partner/{PartnerCustomerForms,PartnerCustomerList,PartnerCustomerCredentialsDialog,PartnerOrganizationList}*`, `src/pages/PartnerPage*`
- 2026-09-07 [CODE] `shared/commentToInboxAccess.ts`, `src/components/Connect{Instagram,Messenger}Button*`, `convex/{instagramEmbeddedSignup,messengerConnect,messengerAuth,oauthSessions,commentAutomationMeta,schema}*`
- 2026-09-08 [CODE] `src/lib/host{Branding,Favicon,DocumentTitle}*`, `src/hooks/useHostBranding.ts`, `src/components/{HostBrandMark,ExpandedAppSidebarHeader,app-sidebar,AppRuntimeEffects}*`, `src/components/workspace/AgentsSidebar*`
- 2026-09-08 [CODE] `convex/users.ts`, `convex/whiteLabel/{planResolver.ts,managedWorkspace.test.ts}`, `convex/plans.ts`, `src/lib/organizationAccess.ts`
- 2026-09-08 [CODE] `convex/{entitlementScope,authUtils,plans,credits,creditUsageAnalytics,creditUsageSession,teams,teamHelpers}*`, `convex/whiteLabel/{partnerAuth*,customerWorkspace*,sessionEntitlementScope.test.ts}`, `src/pages/SignInPage.tsx`
- 2026-09-08 [CODE] `src/partnerAuth/{AppAuthProvider.tsx,appAuthUsage.test.ts,usePartnerConvexAuth.ts,usePartnerConvexAuth.test.tsx}`, `src/components/RequireOrganization.tsx`, `src/pages/{SettingsPage,PricingPage}.tsx`, `src/router/AppRouteComponents.tsx`
- 2026-09-07 [CODE] `src/components/partner/PartnerBrandingTab*`, `src/pages/{PartnerPage,SignInPage}.tsx`, `convex/whiteLabel/{portal,portalActions,portalProvisioning,portalOverview,creditLedger}.ts`

# Receipts

- 2026-09-08 [TOOL] #113 opened from `cursor/partner-usage-and-settings` onto `main` with the I007 Usage fix plus leftover post-#112 Settings/admin follow-ups. 15 focused tests pass under Node 22.
- 2026-09-08 [TOOL] #112 admin-create + plan-dialog follow-up: 32 focused tests pass; targeted ESLint and app TypeScript check pass under Node 22. Pre-existing `TeamRolesAndPermissionsPanel` `set-state-in-effect` lint remains.
- 2026-09-08 [TOOL] Dual-role revision committed as `d6fda7e`, pushed, and #112 updated and marked ready for review.
- 2026-09-08 [TOOL] Dual-role entitlement revision: 25 focused plan/credit/auth/workspace tests pass; Convex codegen, app/Convex TypeScript checks, targeted ESLint, full TypeScript/Vite production build, and `git diff --check` pass under Node 22. Full Vitest exposes only `convex/backfillEvents.test.ts`, independently reproduced without the changed analytics file; its fixed July/August 2026 billing period is stale against the current September clock.
- 2026-09-08 [TOOL] Revised I006 fix: 20 plan, credit, provisioning, and workspace tests pass; three new assertions fail on old active-team logic (wrong org plan and owner marked managed twice). Node v22 targeted ESLint, Convex TypeScript check, and `git diff --check` pass.
- 2026-09-08 [TOOL] Partner-owner workspace access: new `currentUser` test fails on old code (`expected false to be true`) and passes on the fix; Node v22 targeted ESLint, `tsc --noEmit -p convex/tsconfig.json`, and `git diff --check` pass. Prod inspected read-only via `convex data --prod`.
- 2026-09-08 [TOOL] Partner-host auth loop fix: new identity test fails on the old inline arrow (`expected 3 to be 1`) and passes on the fix; Node v22 targeted ESLint, `tsc --noEmit -p tsconfig.app.json`, and `git diff --check` pass.
- 2026-09-08 [TOOL] Hostname sidebar brand passed 23 focused tests (header lockup, loading, no-logo initial, both sidebars, favicon/title), Node v22 targeted ESLint, `tsc --noEmit -p tsconfig.app.json`, and `git diff --check`.
- 2026-09-08 [TOOL] Partner-host `useAuth` fix: new guard test fails on the old `RequireOrganization` import and passes on the fix; Node v22 targeted ESLint, `tsc --noEmit -p tsconfig.app.json`, and `git diff --check` pass.
- 2026-09-08 [TOOL] Partner browser tab title passed 39 focused tests, targeted ESLint, and `git diff --check`.
- 2026-09-07 [TOOL] Partner PNG favicon link no longer keeps `image/svg+xml`; 4 focused tests, targeted ESLint, and `git diff --check` passed.
- 2026-09-07 [TOOL] Hostname favicon from partner logo passed 10 focused tests, targeted ESLint, and `git diff --check`.
- 2026-09-07 [TOOL] Separate Partner Overview Organizations and Users metrics passed 22 focused UI tests, targeted ESLint, and `git diff --check`.
- 2026-09-07 [TOOL] `origin/main` merged into `codex/partner-plan-change-timing` at `f14bdd4`; atomic provisioning, scheduled renewal, and plan-change integration passed 7 focused tests.
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
