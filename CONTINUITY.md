# CONTINUITY.md

# Snapshot

- 2026-08-19 [USER] Goal: ship an isolated white-label partner reseller portal where approved partners manage customer organizations, shared plans, manual credits, branding, and a single hostname without pricing or Stripe controls.
- 2026-08-24 [CODE] Now: `codex/white-label-partner-portal` includes current `origin/main`; Overview uses loading Skeletons, organization data is center-aligned, and pending customer invitations have a yellow status dot.
- 2026-08-24 [CODE] Now: direct active-customer provisioning, Profile reset access, three-dot deletion menus, and partner workspace cleanup are implemented locally; customer-removal helpers use explicit local unions because Convex validator inference does not narrow discriminants, while Convex code generation still requires explicit outbound-network approval before final verification.
- 2026-08-24 [CODE] Now: the Workers build's nullable custom-domain preview URL is safely narrowed before its copy handler; the pending PR still needs its local feature work committed and pushed.
- 2026-08-24 [CODE] Now: newly created customer credentials are returned once to the partner dashboard for secure copying; the customer can later use the existing Settings password-reset action.
- 2026-08-26 [CODE] Now: accumulated partner-customer provisioning, workspace access, credentials, deletion, role-control, and permission-state work is committed locally as `1300460`; it remains unshipped.
- 2026-08-25 [CODE] Now: partner-created customers are provisioned as onboarded and locked to their assigned organization; their personal workspace is omitted and existing webhook-created personal workspaces are reconciled away.
- 2026-08-26 [CODE] Next: deploy the committed Convex changes only with explicit approval; Convex code generation remains blocked pending explicit outbound-data approval.
- 2026-08-25 [CODE] Now: the bounded partner-customer workspace migration ran successfully against the configured Convex development deployment and its temporary entrypoint was removed afterward.
- 2026-08-25 [CODE] Now: the customer table no longer opens credentials from row clicks; the portaled action menu uses a click boundary and provides Show password only when retained credentials exist. This local UI fix remains uncommitted.
- 2026-08-26 [CODE] Now: customer-table password-reset status is available only in the credentials modal, avoiding duplicate reset state in the list; this committed UI change remains unshipped.
- 2026-08-26 [CODE] Now: Partner Programme customers are explicitly identified in `currentUser`, so the organization gate accepts their managed plan without requiring a Stripe subscription; their persisted onboarding and assigned-workspace restrictions remain server-side. This committed fix remains unshipped.
- 2026-08-26 [CODE] Now: completed customer removal maps Convex’s successful `null` action result to the dialog’s success signal, so the delete confirmation dismisses only after removal succeeds. This committed UI fix remains unshipped.
- 2026-08-26 [CODE] Now: active partner-customer roles can be changed from the Customers table; the WorkOS organization membership and local partner/workspace membership records update together. This committed change needs Convex deployment approval.
- 2026-08-26 [CODE] Now: members without agent-creation access see a clear workspace permission state instead of a blank agent grid. This committed UI change remains unshipped.
- 2026-08-26 [CODE] Now: the Get Free Credits sidebar entry is hidden in partner-managed workspaces while remaining available in standard workspaces. This committed UI change remains unshipped.
- 2026-08-19 [ASSUMPTION] This work is unshipped; no release changelog entry has been added.

# Decisions

- 2026-08-19 [USER] D734 ACTIVE: white-label state is isolated in dedicated partner tables; existing user, team, Stripe, and admin-session records remain unchanged except for ID-based relationships.
- 2026-08-19 [USER] D735 ACTIVE: shared plan limits/features/models take effect immediately; only the new monthly allowance starts at the customer organization’s next credit cycle.
- 2026-08-19 [USER] D736 ACTIVE: partner-created workspaces consume an organization wallet monthly allowance first, then durable manual grants; Stripe payment/top-up paths are blocked.
- 2026-08-19 [USER] D737–D740 ACTIVE: partner managers retain WorkOS ownership; standard customer workspace controls remain backend-gated, access is account-level, and partner reporting stays isolated.
- 2026-08-19 [USER] D742 ACTIVE: Partner Programme has Overview, Customers, and Branding in a vertical ghost navigation; it uses subtle bordered containers without shadows or excessive rounding.
- 2026-08-19 [USER] D743–D760 ACTIVE: custom hostnames use the configured Cloudflare SaaS zone, CNAME-only subdomains, hostname-specific DCV delegation, explicit DNS-completion controls, concise polling feedback, and expandable completed setup steps.
- 2026-08-24 [USER] D761 ACTIVE: Create Organization closes only after its server action succeeds and the portal presents its success toast; failures leave the dialog open for retry.
- 2026-08-24 [USER] D762 ACTIVE: selecting a different customer plan opens a confirmation modal that shows the exact monthly-credit renewal date; Cancel is a ghost action, and only confirmation schedules the plan change.
- 2026-08-24 [USER] D763 ACTIVE: Customers presents separate organization and customer tables. Organization customer counts include pending and accepted invitation records; each active status has a green dot, and suspension is a destructive confirmed action.
- 2026-08-24 [USER] D764 ACTIVE: On desktop, the Partner Programme header aligns with the tab-content column beside the side navigation; mobile retains the unshifted header.
- 2026-08-24 [USER] D765 ACTIVE: Overview shows Skeleton placeholders while partner metrics load and preserves real zero values after loading; organization-table headings and values are center-aligned.
- 2026-08-24 [USER] D766 ACTIVE: Pending customer invitations display a compact yellow status dot within their neutral Badge; accepted invitations retain their neutral Badge without a dot.
- 2026-08-24 [USER] D767 SUPERSEDED: Partner-created customers are WorkOS email-and-password accounts with immediate active membership; their generated passwords are never exposed or stored, and Profile password reset is limited to those accounts.
- 2026-08-24 [USER] D768 ACTIVE: Organization and customer rows use three-dot menus for destructive deletion; organization deletion removes its workspace and all related customer access but preserves underlying WorkOS user accounts.
- 2026-08-24 [USER] D769 SUPERSEDED: Partners receive a created customer's normalized email and generated plaintext initial password once in a copyable dialog; it is not persisted or logged, and customers can reset their password from Settings after signing in.
- 2026-08-24 [USER] D770 ACTIVE: Partner-provisioned initial passwords are retained only with authenticated encryption, are revealed only by a partner-authorized row action, and are marked historical after the signed WorkOS `password_reset.succeeded` event records a completed reset.
- 2026-08-25 [USER] D771 ACTIVE: A partner-created customer skips onboarding and may access only the specific organization assigned by the partner; personal and other workspace switching is server-blocked.
- 2026-08-25 [USER] D772 ACTIVE: Customer rows are informational; a partner opens retained credentials only through Show password in the three-dot menu.
- 2026-08-25 [USER] D773 ACTIVE: Partners can change an active customer’s Owner, Admin, or Member role from the Customers table; pending and accepted invitations remain read-only.
- 2026-08-25 [USER] D774 ACTIVE: When a member cannot create agents and the workspace has none, show a clear permission state that directs them to their workspace admin.
- 2026-08-25 [USER] D775 ACTIVE: Partner-managed workspaces do not show the Get Free Credits referral entry in the sidebar.
- 2026-08-25 [USER] D776 ACTIVE: Partner-created customers must authenticate through their assigned connected partner hostname; native Kilobot sign-in rejects them while retaining its existing AuthKit flow for native users.

# Done (recent)

- 2026-08-24 [CODE] Create Organization now closes on success and displays a success toast; plan changes require a next-renewal confirmation.
- 2026-08-24 [CODE] Customers now separates organizations and invitation-backed customer accounts; new invitations synchronize immediately into the customer table.
- 2026-08-24 [CODE] Added green active indicators, destructive suspension confirmation, and desktop header/content alignment.
- 2026-08-24 [CODE] Replaced Overview loading zeroes with Skeletons, centered every organization-table column, and added a yellow pending-invitation dot; this remains unshipped, so no release-changelog entry was added.
- 2026-08-24 [CODE] Committed the approved active customer account and password-reset design at `70e827d`; implementation has not begun.
- 2026-08-25 [CODE] Implemented unshipped direct customer provisioning, reset URL navigation, customer/organization deletion, and assigned-workspace-only customer access; final commit remains pending request.
- 2026-08-24 [CODE] Added an unshipped one-time customer-credentials dialog with copy actions; partner-created customers retain the Profile password-reset path.

# Working set

- 2026-08-19 [CODE] `convex/whiteLabel/`
- 2026-08-19 [CODE] `convex/schema.ts`
- 2026-08-19 [CODE] `src/pages/PartnerPage.tsx`
- 2026-08-19 [CODE] `src/components/partner/`
- 2026-08-19 [CODE] `src/lib/whiteLabelApi.ts`
- 2026-08-19 [CODE] `docs/superpowers/specs/2026-08-19-partner-custom-hostnames-design.md`
- 2026-08-19 [CODE] `docs/superpowers/plans/2026-08-19-partner-custom-hostnames.md`
- 2026-08-24 [CODE] `docs/superpowers/specs/2026-08-24-partner-active-customer-accounts-design.md`
- 2026-08-24 [CODE] `docs/superpowers/plans/2026-08-24-partner-active-customer-accounts.md`

# Receipts

- 2026-08-24 [TOOL] Customer-removal helper typecheck passed with Node v22 using `convex/tsconfig.json`; focused customer-account tests pass (2 tests).
- 2026-08-24 [TOOL] Node v22 `tsc -b` and Vite production build pass after the custom-domain preview-link fix.
- 2026-08-24 [TOOL] One-time customer credential and Settings password-reset contracts pass focused tests, Convex and app TypeScript, ESLint, and a Vite production build on Node v22.
- 2026-08-25 [TOOL] Retained-credential implementation plan passed placeholder and diff review; implementation awaits execution-mode selection.
- 2026-08-25 [TOOL] Focused encryption and Partner Programme tests pass (26 tests); Convex code generation was rejected because it may transmit repository metadata/source to Convex.
- 2026-08-25 [TOOL] Focused suite passed 27 tests, app TypeScript and diff validation passed, commit `6b3f00d` was created, and `git fetch origin && git merge origin/main` reported already up to date.
- 2026-08-25 [TOOL] Convex strict typecheck now passes after explicit result types were added at analytics/media action boundaries; 26 focused analytics, media, WorkOS, partner, and dialog tests pass.
- 2026-08-25 [TOOL] Customer-table rendered-cell contract, partner UI contracts, app TypeScript, and diff validation pass after correcting the shifted column order.
- 2026-08-25 [TOOL] Credentials loading Skeleton contract, partner UI contracts, app TypeScript, and diff validation pass after making the credentials dialog open immediately.
- 2026-08-25 [TOOL] Partner customer workspace regression, related auth/workspace suites, Node v22 production build, targeted lint, and diff validation pass; the broader lint command still reports pre-existing WorkOS `any` annotations and an unrelated unused parameter.
- 2026-08-25 [TOOL] Convex code generation for the requested backfill was blocked pending explicit approval for outbound source/metadata transmission; no migration data has been changed.
- 2026-08-25 [TOOL] After [USER] approval, Convex generated and deployed the temporary migration; dry-run completed safely, the real migration processed 1 account with `state: success`, and a final deployment removed the entrypoint.
- 2026-08-25 [TOOL] Customer deletion propagation regression test, focused partner UI tests, Node v22 TypeScript, and diff validation pass.
- 2026-08-25 [TOOL] Customer-table column regression and focused partner UI tests pass after moving reset status out of the table; diff validation passes.
- 2026-08-25 [TOOL] The portaled customer-menu click propagation regression passed after replacing the ineffective select-event boundary with a dropdown-content click boundary; 5 focused partner UI tests and diff validation pass.
- 2026-08-25 [TOOL] Customer-row interaction regression and focused partner UI tests pass after moving credential access to the explicit Show password menu action; diff validation passes.
- 2026-08-25 [TOOL] Partner-managed Starter onboarding regression, route-access decision tests, auth tests, and account-provisioning contract tests pass (7 tests); diff validation passes.
- 2026-08-25 [TOOL] Customer-removal success/failure mapping and 26 related Partner Programme tests pass (28 tests total); diff validation passes.
- 2026-08-25 [TOOL] Active-customer role control and local role-record synchronization regressions pass with 28 focused tests; targeted ESLint and TypeScript build checks complete without diagnostics, and diff validation passes.
- 2026-08-25 [TOOL] Agent-creation permission empty-state regression passes; targeted ESLint and diff validation pass.
- 2026-08-25 [TOOL] Partner-managed referral entry regression and the agent permission-state regression pass (4 focused tests); targeted ESLint and diff validation pass.
- 2026-08-26 [TOOL] Before commit `1300460`, 15 focused partner/workspace regressions passed, `bunx tsc -b --pretty false` passed after a nullable role-action narrowing correction, and staged diff validation passed.
