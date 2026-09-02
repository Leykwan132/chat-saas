# CONTINUITY.md

# Snapshot

- 2026-09-01 [USER] Goal: test the white-label Partner Programme locally on `codex/white-label-partner-portal`.
- 2026-09-02 [CODE] Now: partner-host direct Convex sign-in, in-memory scoped auth, and surface-aware team filtering are implemented locally; existing Branding UI changes remain uncommitted and unshipped.
- 2026-08-31 [CODE] Now: `origin/main` adds WhatsApp username recipients and BSUID-change continuity; both remain unshipped.
- 2026-08-27 [CODE] Now: mobile inbox/workspace behaviour and Google Calendar What’s new copy are present on `origin/main`; those customer-facing changes remain unshipped.
- 2026-08-26 [CODE] Now: partner-customer provisioning, workspace access, retained credentials, deletion, role control, and permission-state work is committed locally as `734c0e9`; it remains unshipped.
- 2026-08-26 [CODE] Next: deploy the committed Convex changes only with explicit approval; Convex code generation requires explicit outbound-data approval.
- 2026-08-19 [ASSUMPTION] White-label work is unshipped; no release-changelog entry has been added.

# Decisions

- 2026-08-19 [USER] D734 ACTIVE: white-label state is isolated in dedicated partner tables; existing user, team, Stripe, and admin-session records change only through ID relationships.
- 2026-08-19 [USER] D735 ACTIVE: shared plan limits take effect immediately; only the new monthly allowance starts at the organization’s next credit cycle.
- 2026-08-19 [USER] D736 ACTIVE: partner-created workspaces use their organization wallet and manual grants; Stripe payment and top-up paths are blocked.
- 2026-08-19 [USER] D742 ACTIVE: Partner Programme has Overview, Customers, and Branding in a subtle vertical ghost navigation.
- 2026-08-19 [USER] D743–D760 ACTIVE: custom hostnames use the configured Cloudflare SaaS zone, CNAME-only subdomains, DCV delegation, explicit DNS confirmations, concise polling, and expandable completed setup steps.
- 2026-08-24 [USER] D763 ACTIVE: Customers has separate organization and customer tables; organization counts include pending and accepted invitations, active has a green dot, and suspension requires confirmation.
- 2026-08-24 [USER] D770 ACTIVE: partner-provisioned passwords are encrypted at rest, revealed only by an authorized row action, and marked historical after WorkOS emits `password_reset.succeeded`.
- 2026-08-25 [USER] D771 SUPERSEDED: a partner-created customer skips onboarding and may access only their assigned organization; personal and other workspace switching is server-blocked.
- 2026-08-25 [USER] D773 ACTIVE: partners can change active customer roles and WorkOS/local membership records update together.
- 2026-08-25 [USER] D774–D775 ACTIVE: members without agent-create access see an explanatory empty state; partner-managed workspaces hide Get Free Credits.
- 2026-08-25 [USER] D776 SUPERSEDED: partner-created customers authenticate only through their assigned connected partner hostname; native Kilobot sign-in rejects them while native users retain AuthKit.
- 2026-09-02 [USER] D778 SUPERSEDED: partner-created customers may sign in from Kilobot or their assigned connected partner hostname; a Kilobot login silently hands them off to their assigned partner hostname with a full-page spinner before opening the assigned workspace.
- 2026-09-02 [USER] D779 ACTIVE: Kilobot exposes every native personal and organizational team, but no partner root organization or team created from a partner hostname. A partner hostname exposes only the customer's assigned partner organization and teams created within that partner context; those teams are partner-managed, use the partner plan and wallet, and never cross into Kilobot.
- 2026-09-01 [USER] D777 SUPERSEDED: partner-host sign-in is an embedded email-and-password-only experience with password reset; it shows no sign-up, SSO, social, magic-link, or other authentication methods.
- 2026-09-02 [USER] D780 ACTIVE: initial partner-host sign-in is embedded email-and-password only with no sign-up, SSO, social, magic-link, or password-reset UI. Transactional reset-email delivery is deferred.
- 2026-09-02 [CODE] D781 SUPERSEDED: Kilobot direct AuthKit plus Worker-issued partner tokens and sealed cookies.
- 2026-09-02 [USER] D782 ACTIVE: partner hostname login calls Convex directly and retains its signed token in browser memory only; refresh, tab close, expiry, and sign-out require another password login. No custom application Worker is maintained.
- 2026-09-02 [USER] D783 ACTIVE: direct Convex partner tokens last seven days and persist in local storage only on partner custom hostnames; Kilobot continues using AuthKit and does not use this storage.
- 2026-09-02 [USER] D784 ACTIVE: partner-host authentication adds only one new Convex secret, `PARTNER_AUTH_JWT_PRIVATE_JWK`; the fixed issuer and JWKS endpoint derive from code and existing `CONVEX_SITE_URL`.
- 2026-08-31 [USER] D756 ACTIVE: valid WhatsApp BSUID-change system events move the customer recipient ID and linked WhatsApp conversation address without creating an inbox, analytics, or AI event.

# Done (recent)

- 2026-08-31 [CODE] Added WhatsApp username recipients and BSUID-change continuity; both customer-facing changes are unshipped.
- 2026-08-27 [CODE] Added responsive mobile inbox/workspace navigation, demo data, accessible customer details, and robust switcher search behaviour; unshipped.
- 2026-08-27 [CODE] Added Google Calendar Support to What’s new and removed the Model Support New badge; unshipped.
- 2026-08-26 [CODE] Prevented deleted Send Media nodes from crashing the Workflow editor; unshipped.
- 2026-08-26 [CODE] Completed partner provisioning, assigned-workspace-only access, credentials, deletion, role controls, and permissions work in local commit `734c0e9`; unshipped.
- 2026-09-02 [CODE] Added local partner-host email/password sign-in, in-memory Convex-issued partner tokens, partner team isolation, and native-personal workspace preservation; unshipped.

# Working set

- 2026-09-01 [CODE] `convex/whiteLabel/`
- 2026-09-01 [CODE] `convex/{schema.ts,authUtils.ts,teamHelpers.ts}`
- 2026-09-01 [CODE] `src/{pages/PartnerPage.tsx,pages/WorkspacePage.tsx,components/partner/}`
- 2026-09-01 [CODE] `src/lib/whiteLabelApi.ts`
- 2026-09-01 [CODE] `convex/{agentOverview.test.ts,agentOverviewTestHelpers.ts,avatarConversationIdentity.test.ts}`
- 2026-09-01 [CODE] `docs/superpowers/specs/2026-08-19-partner-custom-hostnames-design.md`
- 2026-09-01 [CODE] `docs/superpowers/specs/2026-08-24-partner-active-customer-accounts-design.md`
- 2026-09-02 [CODE] `docs/superpowers/specs/2026-09-02-partner-host-authentication-design.md`
- 2026-09-02 [CODE] `docs/superpowers/plans/2026-09-02-partner-host-authentication.md`

# Receipts

- 2026-09-02 [TOOL] Wrote and self-reviewed the seven-task partner-host authentication implementation plan; no implementation code has started.
- 2026-09-02 [TOOL] Convex code generation bundled the new Node-only partner token actions without the prior `node:crypto` resolution error. Deployment validation then rejected the pre-existing non-URL custom-JWT issuer `kilobot-partner-auth`; correcting that auth-boundary configuration requires explicit user direction. Focused partner auth configuration and gateway tests pass (4 tests).
- 2026-09-02 [CODE] Partner custom-JWT issuer now derives as `<CONVEX_SITE_URL>/partner-auth` in the provider, signed token, and surface check; this matches Convex’s required URL issuer contract without a new secret. Focused partner auth/workspace suite passes (7 tests). Deployment-backed codegen remains pending explicit code-egress approval.
- 2026-09-02 [CODE] Partner auth’s V8-to-Node action/query cycle now has explicit return validators and TypeScript result types; the five reported partner-auth inference errors are resolved. Focused suite remains green.
- 2026-09-02 [TOOL] Review PR #88 is open from `codex/partner-host-authentication` into `main` at `https://github.com/Leykwan132/chat-saas/pull/88`.
- 2026-09-02 [TOOL] The configured Node v22 test suite completed with 1,861 passing tests and 4 unrelated UI regressions (including a stale referral-route source assertion); partner-host auth regressions are green.
- 2026-09-02 [TOOL] Committed the reviewed partner-host authentication design as `3dafefd`; no implementation files were included.
- 2026-09-02 [TOOL] Focused Worker and partner workspace suites passed (12 tests); Wrangler regenerated typed Worker bindings for the required auth configuration.
- 2026-09-02 [USER] Replaced the Worker session design with direct Convex sign-in; focused partner workspace suites passed after the change.
- 2026-09-01 [TOOL] Merged `origin/main` at `95490c0` into `codex/white-label-partner-portal`; the source merge had one documentation-only ledger conflict and retained the white-label ledger.
- 2026-08-31 [TOOL] WhatsApp username-recipient focused suite passed 19 tests, Node v22 TypeScript, changed-backend lint, and diff validation; unrelated full-suite failures remain.
- 2026-08-27 [TOOL] Mobile inbox/workspace focused tests, targeted lint, diff validation, and Node v22 production build passed.
- 2026-08-26 [TOOL] Before `734c0e9`, 15 focused partner/workspace regressions and Node v22 TypeScript passed.
- 2026-08-25 [TOOL] Partner-created customer workspace regression, related auth/workspace suites, Node v22 production build, targeted lint, and diff validation passed.
- 2026-08-25 [TOOL] A bounded partner-customer workspace migration ran successfully against the configured Convex development deployment and its temporary entrypoint was removed.
