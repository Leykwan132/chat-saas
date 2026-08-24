# CONTINUITY.md

# Snapshot

- 2026-08-19 [USER] Goal: ship an isolated white-label partner reseller portal where approved partners manage customer organizations, shared plans, manual credits, branding, and a single hostname without pricing or Stripe controls.
- 2026-08-24 [CODE] Now: `codex/white-label-partner-portal` includes current `origin/main`; Overview uses loading Skeletons, organization data is center-aligned, and pending customer invitations have a yellow status dot.
- 2026-08-24 [CODE] Now: direct active-customer provisioning, Profile reset access, three-dot deletion menus, and partner workspace cleanup are implemented locally; customer-removal helpers use explicit local unions because Convex validator inference does not narrow discriminants, while Convex code generation still requires explicit outbound-network approval before final verification.
- 2026-08-24 [CODE] Now: the Workers build's nullable custom-domain preview URL is safely narrowed before its copy handler; the pending PR still needs its local feature work committed and pushed.
- 2026-08-24 [CODE] Now: newly created customer credentials are returned once to the partner dashboard for secure copying; the customer can later use the existing Settings password-reset action.
- 2026-08-24 [USER] Now: partners need a customer-row credential view and a password-reset-status column; the approved secure design needs written-spec review before planning and implementation.
- 2026-08-24 [CODE] Next: run Convex code generation with approval, re-run final checks, then commit the unshipped feature work.
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

# Done (recent)

- 2026-08-19 [CODE] Added isolated partner data, authorization, plans, credits, hostname lifecycle, and partner-managed workspace gates.
- 2026-08-20 [CODE] Completed the custom-domain setup modal, DNS record copy/completion flow, certificate polling, restart handling, and server-persisted email authorization.
- 2026-08-24 [CODE] Create Organization now closes on success and displays a success toast; plan changes require a next-renewal confirmation.
- 2026-08-24 [CODE] Customers now separates organizations and invitation-backed customer accounts; new invitations synchronize immediately into the customer table.
- 2026-08-24 [CODE] Added green active indicators, destructive suspension confirmation, and desktop header/content alignment.
- 2026-08-24 [CODE] Replaced Overview loading zeroes with Skeletons, centered every organization-table column, and added a yellow pending-invitation dot; this remains unshipped, so no release-changelog entry was added.
- 2026-08-24 [CODE] Committed the approved active customer account and password-reset design at `70e827d`; implementation has not begun.
- 2026-08-24 [CODE] Implemented unshipped direct customer provisioning, reset URL navigation, and customer/organization deletion; final Convex generation and commit are pending approval.
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

- 2026-08-19 [TOOL] Partner access, customer invitation, portal UI, custom hostname, and status-discriminator regression suites passed with Node v22 TypeScript and diff validation.
- 2026-08-20 [TOOL] The last upstream merge at `5b551d8` had only a ledger conflict; the full suite then passed after intentional widget expectations were updated.
- 2026-08-24 [TOOL] The separate organization/customer-table change passed 18 focused tests, TypeScript, ESLint, and diff validation on Node v22.
- 2026-08-24 [TOOL] The header/content alignment change passed focused Partner Programme tests, ESLint, and diff validation on Node v22.
- 2026-08-24 [TOOL] The `origin/main` merge passed 18 focused partner tests, Node v22 TypeScript, and diff validation; the unrelated booking API edit is preserved in `stash@{0}`.
- 2026-08-24 [TOOL] Overview Skeleton and organization-table alignment contracts pass with Node v22 TypeScript, ESLint, and diff validation.
- 2026-08-24 [TOOL] Pending-invitation badge contract passes with Node v22 TypeScript, ESLint, and diff validation.
- 2026-08-24 [TOOL] Active customer account design passed its placeholder and diff review and was committed as `70e827d`.
- 2026-08-24 [TOOL] Focused partner, profile, password, and workspace-cleanup suites passed (28 tests); Node v22 TypeScript and targeted ESLint passed. Convex codegen was sandbox-blocked on outbound telemetry/network access.
- 2026-08-24 [TOOL] Customer-removal helper typecheck passed with Node v22 using `convex/tsconfig.json`; focused customer-account tests pass (2 tests).
- 2026-08-24 [TOOL] Node v22 `tsc -b` and Vite production build pass after the custom-domain preview-link fix.
- 2026-08-24 [TOOL] One-time customer credential and Settings password-reset contracts pass focused tests, Convex and app TypeScript, ESLint, and a Vite production build on Node v22.
