# CONTINUITY.md

# Snapshot
- 2026-08-19 [USER] Goal: ship an isolated white-label partner reseller portal where approved partners manage customer organizations, shared plans, manual credits, branding, and a single hostname without pricing or Stripe controls.
- 2026-08-19 [CODE] Now: isolated partner schema, backend authorization/plan/credit/billing logic, the Admin Partners tab, and Partner workspace line-tab portal are implemented locally.
- 2026-08-19 [CODE] Next: configure Cloudflare Custom Hostnames and WorkOS custom-auth settings before activating a partner hostname.
- 2026-08-19 [ASSUMPTION] This work is unshipped; no release changelog entry has been added.

# Decisions
- 2026-08-19 [USER] D734 ACTIVE: white-label state is isolated in dedicated partner tables; existing user, team, Stripe, and admin-session records remain unchanged except for ID-based relationships.
- 2026-08-19 [USER] D735 ACTIVE: shared plan limits/features/models take effect immediately; only the new monthly allowance starts at the customer organization’s next credit cycle.
- 2026-08-19 [USER] D736 ACTIVE: partner-created workspaces consume an organization wallet monthly allowance first, then durable manual grants; Stripe payment/top-up paths are blocked.
- 2026-08-19 [USER] D737 ACTIVE: partner managers retain WorkOS owner membership in each customer organization; default WorkOS invitation/reset emails remain the intentional v1 non-branded exception.
- 2026-08-19 [USER] D738 ACTIVE: Admin reports tokens, estimated USD AI cost, requests, and assigned-agent count for each partner from its customer organizations.

# Done (recent)
- 2026-08-19 [CODE] Added isolated partners, access, organization mapping, append-only plan assignments, credit periods/grants/ledger/balances, and domain lifecycle tables.
- 2026-08-19 [CODE] Added internal Admin Partners whitelist flow and a Partner sidebar page with Overview, Organizations, Accounts, and Brand & Domain line tabs.
- 2026-08-19 [CODE] Partner plans bypass Stripe in central team-plan resolution; partner credit deductions and workspace plan/usage queries are isolated by organization.
- 2026-08-19 [CODE] Partner workspaces reject Stripe checkout and billing-portal requests; the pricing page displays the partner-managed billing state.
- 2026-08-19 [CODE] Partner AI usage now records isolated cumulative token, cost, and request totals for the Admin Partners table.
- 2026-08-19 [CODE] Split Node-only WorkOS actions from V8 authorization and persistence functions so Convex can deploy the partner provisioning flow.
- 2026-08-18 [CODE] Prior inbox escalation trace work remains unshipped in draft PR #68.

# Working set
- 2026-08-19 [CODE] `convex/schema.ts`
- 2026-08-19 [CODE] `convex/whiteLabel/`
- 2026-08-19 [CODE] `convex/credits.ts`
- 2026-08-19 [CODE] `convex/plans.ts`
- 2026-08-19 [CODE] `convex/teamStripePlanResolver.ts`
- 2026-08-19 [CODE] `convex/stripeBillingSessions.ts`
- 2026-08-19 [CODE] `src/pages/PartnerPage.tsx`
- 2026-08-19 [CODE] `src/components/admin/AdminPartnersTab.tsx`
- 2026-08-19 [CODE] `src/lib/whiteLabelApi.ts`
- 2026-08-19 [CODE] `convex/agentUsage.ts`

# Receipts
- 2026-08-19 [TOOL] Node v22.22.0 focused partner credit tests pass (2 tests); focused ESLint, `tsc --noEmit`, and `git diff --check` pass.
- 2026-08-19 [TOOL] `bunx convex codegen` cannot run in this checkout because `CONVEX_DEPLOYMENT` is not set; the frontend uses explicit function references pending deployment code generation.
- 2026-08-19 [TOOL] `bun run build` began successfully through `tsc -b`, but the local command runner did not return a Vite completion result before its execution window closed.
- 2026-08-19 [TOOL] Node v22.22.0 partner usage and credit tests pass (3 tests); TypeScript, focused ESLint, and `git diff --check` pass.
- 2026-08-19 [TOOL] `bunx convex dev --once --typecheck=disable` successfully deployed the corrected partner modules; unrelated pre-existing Convex TypeScript errors remain in analytics/media modules.
