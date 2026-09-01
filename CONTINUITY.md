# CONTINUITY.md

# Snapshot

- 2026-09-01 [USER] Goal: test the white-label Partner Programme locally on `codex/white-label-partner-portal`.
- 2026-09-01 [TOOL] Now: merging current `origin/main` into the white-label branch; concurrent Overview-test and Workspace-page edits are being reconciled without removing partner access controls.
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
- 2026-08-25 [USER] D771 ACTIVE: a partner-created customer skips onboarding and may access only their assigned organization; personal and other workspace switching is server-blocked.
- 2026-08-25 [USER] D773 ACTIVE: partners can change active customer roles and WorkOS/local membership records update together.
- 2026-08-25 [USER] D774–D775 ACTIVE: members without agent-create access see an explanatory empty state; partner-managed workspaces hide Get Free Credits.
- 2026-08-25 [USER] D776 ACTIVE: partner-created customers authenticate only through their assigned connected partner hostname; native Kilobot sign-in rejects them while native users retain AuthKit.
- 2026-08-31 [USER] D756 ACTIVE: valid WhatsApp BSUID-change system events move the customer recipient ID and linked WhatsApp conversation address without creating an inbox, analytics, or AI event.

# Done (recent)

- 2026-08-31 [CODE] Added WhatsApp username recipients and BSUID-change continuity; both customer-facing changes are unshipped.
- 2026-08-27 [CODE] Added responsive mobile inbox/workspace navigation, demo data, accessible customer details, and robust switcher search behaviour; unshipped.
- 2026-08-27 [CODE] Added Google Calendar Support to What’s new and removed the Model Support New badge; unshipped.
- 2026-08-26 [CODE] Prevented deleted Send Media nodes from crashing the Workflow editor; unshipped.
- 2026-08-26 [CODE] Completed partner provisioning, assigned-workspace-only access, credentials, deletion, role controls, and permissions work in local commit `734c0e9`; unshipped.

# Working set

- 2026-09-01 [CODE] `convex/whiteLabel/`
- 2026-09-01 [CODE] `convex/{schema.ts,authUtils.ts,teamHelpers.ts}`
- 2026-09-01 [CODE] `src/{pages/PartnerPage.tsx,pages/WorkspacePage.tsx,components/partner/}`
- 2026-09-01 [CODE] `src/lib/whiteLabelApi.ts`
- 2026-09-01 [CODE] `convex/{agentOverview.test.ts,agentOverviewTestHelpers.ts,avatarConversationIdentity.test.ts}`
- 2026-09-01 [CODE] `docs/superpowers/specs/2026-08-19-partner-custom-hostnames-design.md`
- 2026-09-01 [CODE] `docs/superpowers/specs/2026-08-24-partner-active-customer-accounts-design.md`

# Receipts

- 2026-08-31 [TOOL] WhatsApp username-recipient focused suite passed 19 tests, Node v22 TypeScript, changed-backend lint, and diff validation; unrelated full-suite failures remain.
- 2026-08-27 [TOOL] Mobile inbox/workspace focused tests, targeted lint, diff validation, and Node v22 production build passed.
- 2026-08-26 [TOOL] Before `734c0e9`, 15 focused partner/workspace regressions and Node v22 TypeScript passed.
- 2026-08-25 [TOOL] Partner-created customer workspace regression, related auth/workspace suites, Node v22 production build, targeted lint, and diff validation passed.
- 2026-08-25 [TOOL] A bounded partner-customer workspace migration ran successfully against the configured Convex development deployment and its temporary entrypoint was removed.
