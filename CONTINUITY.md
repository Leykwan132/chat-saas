# CONTINUITY.md

# Snapshot

- 2026-09-03 [CODE] Gemini Live Avatar connector remains implemented on `codex/gemini-live-connector`: managers save a provider context, LITE tokens use server-only `HEYGEN_GEMINI_SECRET_ID`, and browser turns bypass KiloBot. Focused tests and the Node 22 build passed before this merge; sandbox verification awaits a configured local Convex deployment.
- 2026-09-03 [CODE] Avatar End now records `session.stopped` for both active sessions and canceled in-flight starts; event persistence strips request-only fields so Convex can finalize the session and release its capacity slot. Unshipped.
- 2026-09-03 [CODE] Avatar context editing now presents the prompt field as “Instructions” without the extra bordered outer container. Unshipped.
- 2026-09-03 [CODE] Avatar calls now place controls vertically on the right edge and render LiveAvatar response transcription as centered white, black-stroked subtitles. Unshipped.
- 2026-09-03 [CODE] Avatar controls now show only a centered-right End button during calls, bottom-center Start Chat before calls, and heavier outlined subtitle text. Unshipped.
- 2026-09-01 [USER] Goal: test the white-label Partner Programme locally on `codex/white-label-partner-portal`.
- 2026-09-01 [TOOL] Now: merging current `origin/main` into the white-label branch; concurrent Overview-test and Workspace-page edits are being reconciled without removing partner access controls.
- 2026-08-31 [CODE] Now: `origin/main` adds WhatsApp username recipients and BSUID-change continuity; both remain unshipped.
- 2026-08-27 [CODE] Now: mobile inbox/workspace behaviour and Google Calendar What’s new copy are present on `origin/main`; those customer-facing changes remain unshipped.
- 2026-08-26 [CODE] Now: partner-customer provisioning, workspace access, retained credentials, deletion, role control, and permission-state work is committed locally as `734c0e9`; it remains unshipped.
- 2026-08-26 [CODE] Next: deploy the committed Convex changes only with explicit approval; Convex code generation requires explicit outbound-data approval.
- 2026-08-19 [ASSUMPTION] White-label work is unshipped; no release-changelog entry has been added.

# Decisions

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

# Done (recent)

- 2026-09-02 [CODE] Added LiveAvatar Gemini connector session tokens, manager-editable provider context, and direct connector-owned Avatar conversations; unshipped.
- 2026-09-03 [CODE] Hardened Avatar teardown so explicit End releases the backend session slot; unshipped.
- 2026-09-03 [CODE] Simplified the Avatar context editor presentation and renamed its prompt label to “Instructions”; unshipped.
- 2026-09-03 [CODE] Added right-edge call controls and centered AI response subtitles to the Avatar stage; unshipped.
- 2026-09-03 [CODE] Refined Avatar controls and subtitle weight for the requested call-stage layout; unshipped.
- 2026-09-03 [CODE] Moved the inactive Avatar Start Chat control to the bottom center of the video stage; unshipped.
- 2026-08-31 [CODE] Added WhatsApp username recipients and BSUID-change continuity; both customer-facing changes are unshipped.
- 2026-08-27 [CODE] Added responsive mobile inbox/workspace navigation, demo data, accessible customer details, and robust switcher search behaviour; unshipped.
- 2026-08-27 [CODE] Added Google Calendar Support to What’s new and removed the Model Support New badge; unshipped.
- 2026-08-26 [CODE] Prevented deleted Send Media nodes from crashing the Workflow editor; unshipped.
- 2026-08-26 [CODE] Completed partner provisioning, assigned-workspace-only access, credentials, deletion, role controls, and permissions work in local commit `734c0e9`; unshipped.
- 2026-09-03 [CODE] Added a regression guard confirming partner customers cannot create additional workspaces; unshipped.

# Working set

- 2026-09-01 [CODE] `convex/whiteLabel/`
- 2026-09-01 [CODE] `convex/{schema.ts,authUtils.ts,teamHelpers.ts}`
- 2026-09-01 [CODE] `src/{pages/PartnerPage.tsx,pages/WorkspacePage.tsx,components/partner/}`
- 2026-09-01 [CODE] `src/lib/whiteLabelApi.ts`
- 2026-09-01 [CODE] `convex/{agentOverview.test.ts,agentOverviewTestHelpers.ts,avatarConversationIdentity.test.ts}`
- 2026-09-01 [CODE] `docs/superpowers/specs/2026-08-19-partner-custom-hostnames-design.md`
- 2026-09-01 [CODE] `docs/superpowers/specs/2026-08-24-partner-active-customer-accounts-design.md`

# Receipts

- 2026-09-02 [TOOL] Gemini Avatar focused suite passed 27 tests and Node v22 production build passed. `bunx convex codegen` was blocked because the worktree lacked `CONVEX_DEPLOYMENT`.
- 2026-08-31 [TOOL] WhatsApp username-recipient focused suite passed 19 tests, Node v22 TypeScript, changed-backend lint, and diff validation; unrelated full-suite failures remain.
- 2026-08-27 [TOOL] Mobile inbox/workspace focused tests, targeted lint, diff validation, and Node v22 production build passed.
- 2026-08-26 [TOOL] Before `734c0e9`, 15 focused partner/workspace regressions and Node v22 TypeScript passed.
- 2026-08-25 [TOOL] Partner-created customer workspace regression, related auth/workspace suites, Node v22 production build, targeted lint, and diff validation passed.
- 2026-08-25 [TOOL] A bounded partner-customer workspace migration ran successfully against the configured Convex development deployment and its temporary entrypoint was removed.
- 2026-09-03 [TOOL] Focused customer-workspace regression passed for the explicit no-additional-workspace guard.
- 2026-09-03 [TOOL] Node v22 production build passed after resolving the WorkOS sign-out overload in the partner-auth provider.
- 2026-09-03 [TOOL] Avatar connector regression suite passed 44 tests, targeted ESLint passed, dependencies restored from the lockfile, and the Node v22 production build passed.
- 2026-09-03 [TOOL] Avatar-focused suite passed 45 tests and the Node v22 production build passed after the context-editor presentation update.
- 2026-09-03 [TOOL] Avatar stage and connector changes passed 48 focused tests, targeted ESLint, diff validation, and the Node v22 production build.
- 2026-09-03 [TOOL] Avatar control/subtitle iteration passed 48 focused tests, targeted ESLint, diff validation, and the Node v22 production build.
- 2026-09-03 [TOOL] Bottom-center Start Chat update passed 67 Avatar-focused tests, targeted ESLint, diff validation, and the Node v22 production build.
