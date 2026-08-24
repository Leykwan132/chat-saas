# CONTINUITY.md

# Snapshot

- 2026-08-19 [USER] Goal: ship an isolated white-label partner reseller portal where approved partners manage customer organizations, shared plans, manual credits, branding, and a single hostname without pricing or Stripe controls.
- 2026-08-24 [TOOL] Now: `codex/white-label-partner-portal` is merging current `origin/main`; application files merged automatically and only this ledger required reconciliation.
- 2026-08-24 [CODE] Next: complete merge validation, then review or commit the unshipped partner portal changes as directed.
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

# Done (recent)

- 2026-08-19 [CODE] Added isolated partner access, organization mappings, append-only plan assignments, credit periods/grants/ledger/balances, and domain lifecycle tables.
- 2026-08-19 [CODE] Partner-managed workspace menus, invitations, plans, AI usage, and Stripe blocking are gated in the portal and backend.
- 2026-08-20 [CODE] Completed the custom-domain setup modal, DNS record copy/completion flow, certificate polling, restart handling, and server-persisted email authorization.
- 2026-08-24 [CODE] Create Organization now closes on success and displays a success toast; plan changes require a next-renewal confirmation.
- 2026-08-24 [CODE] Customers now separates organizations and invitation-backed customer accounts; new invitations synchronize immediately into the customer table.
- 2026-08-24 [CODE] Added green active indicators, destructive suspension confirmation, and desktop header/content alignment.

# Working set

- 2026-08-19 [CODE] `convex/whiteLabel/`
- 2026-08-19 [CODE] `convex/schema.ts`
- 2026-08-19 [CODE] `src/pages/PartnerPage.tsx`
- 2026-08-19 [CODE] `src/components/partner/`
- 2026-08-19 [CODE] `src/lib/whiteLabelApi.ts`
- 2026-08-19 [CODE] `docs/superpowers/specs/2026-08-19-partner-custom-hostnames-design.md`
- 2026-08-19 [CODE] `docs/superpowers/plans/2026-08-19-partner-custom-hostnames.md`

# Receipts

- 2026-08-19 [TOOL] Partner access, customer invitation, portal UI, custom hostname, and status-discriminator regression suites passed with Node v22 TypeScript and diff validation.
- 2026-08-20 [TOOL] The last upstream merge at `5b551d8` had only a ledger conflict; the full suite then passed after intentional widget expectations were updated.
- 2026-08-24 [TOOL] The separate organization/customer-table change passed 18 focused tests, TypeScript, ESLint, and diff validation on Node v22.
- 2026-08-24 [TOOL] The header/content alignment change passed focused Partner Programme tests, ESLint, and diff validation on Node v22.
