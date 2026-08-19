# CONTINUITY.md

# Snapshot
- 2026-08-19 [USER] Goal: ship an isolated white-label partner reseller portal where approved partners manage customer organizations, shared plans, manual credits, branding, and a single hostname without pricing or Stripe controls.
- 2026-08-19 [CODE] Now: isolated partner schema, backend authorization/plan/credit/billing logic, the Admin Partners tab, and Partner workspace line-tab portal are implemented in the normal Desktop checkout on `codex/white-label-partner-portal`.
- 2026-08-19 [CODE] Next: configure Cloudflare Custom Hostnames and WorkOS custom-auth settings before activating a partner hostname.
- 2026-08-19 [ASSUMPTION] This work is unshipped; no release changelog entry has been added.

# Decisions
- 2026-08-19 [USER] D734 ACTIVE: white-label state is isolated in dedicated partner tables; existing user, team, Stripe, and admin-session records remain unchanged except for ID-based relationships.
- 2026-08-19 [USER] D735 ACTIVE: shared plan limits/features/models take effect immediately; only the new monthly allowance starts at the customer organization’s next credit cycle.
- 2026-08-19 [USER] D736 ACTIVE: partner-created workspaces consume an organization wallet monthly allowance first, then durable manual grants; Stripe payment/top-up paths are blocked.
- 2026-08-19 [USER] D737 ACTIVE: partner managers retain WorkOS owner membership in each customer organization; default WorkOS invitation/reset emails remain the intentional v1 non-branded exception.
- 2026-08-19 [USER] D738 ACTIVE: Admin reports tokens, estimated USD AI cost, requests, and assigned-agent count for each partner from its customer organizations.
- 2026-08-19 [USER] D739 ACTIVE: partner authorization is account-level by normalized email, independent of the active workspace; PostHog controls portal visibility and direct-route rollout.
- 2026-08-19 [USER] D740 ACTIVE: partner-created customer workspaces are partner-managed; customer users cannot create teams, invite or remove members, or assign workspace roles through standard workspace controls.

# Done (recent)
- 2026-08-19 [CODE] Added isolated partners, access, organization mapping, append-only plan assignments, credit periods/grants/ledger/balances, and domain lifecycle tables.
- 2026-08-19 [CODE] Added internal Admin Partners whitelist flow and a Partner sidebar page with Overview, Organizations, Accounts, and Brand & Domain line tabs.
- 2026-08-19 [CODE] Partner plans bypass Stripe in central team-plan resolution; partner credit deductions and workspace plan/usage queries are isolated by organization.
- 2026-08-19 [CODE] Partner workspaces reject Stripe checkout and billing-portal requests; the pricing page displays the partner-managed billing state.
- 2026-08-19 [CODE] Partner AI usage now records isolated cumulative token, cost, and request totals for the Admin Partners table.
- 2026-08-19 [CODE] Simplified partner whitelisting to an email-only Admin action and applied the `enable_partner_portal` PostHog guard to the sidebar and direct route.
- 2026-08-19 [CODE] Split Node-only WorkOS actions from V8 authorization and persistence functions so Convex can deploy the partner provisioning flow.
- 2026-08-19 [CODE] Admin partner-owner lookup now handles duplicate user rows for the same email and returns each matching owner workspace.
- 2026-08-19 [CODE] Customer workspace menus, team settings, and invitations hide team/account-management controls; backend gates preserve Partner portal as the only staffing path.
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
- 2026-08-19 [TOOL] Account-level partner access and PostHog route-guard tests pass; app TypeScript, focused ESLint, and `git diff --check` pass; Convex dev deployment `outstanding-rabbit-215` reports functions ready.
- 2026-08-19 [TOOL] PostHog project 500079 flag `enable_partner_portal` (ID 830764) is active with exact-email access for the two approved partner accounts.
- 2026-08-19 [TOOL] `bunx convex dev --once --typecheck=disable` successfully deployed the corrected partner modules; unrelated pre-existing Convex TypeScript errors remain in analytics/media modules.
- 2026-08-19 [TOOL] Duplicate-email owner-workspace regression test and deployment pass; deployment continues to bypass unrelated pre-existing Convex TypeScript errors.
- 2026-08-19 [TOOL] Managed-workspace detection and customer invitation-block tests pass; app TypeScript, focused ESLint, and `git diff --check` pass; Convex dev deployment `outstanding-rabbit-215` reports functions ready.
- 2026-08-19 [TOOL] Live access check: `kwanrealtyofficial@gmail.com` has active partner access and passes the active PostHog rollout for both linked WorkOS identities; `leykwan132@gmail.com` has the rollout flag but no active partner access.
- 2026-08-19 [TOOL] Normal Desktop checkout merge artifacts were reconciled; local TypeScript and focused partner tests pass, and Convex dev deployment `outstanding-rabbit-215` reports functions ready.
- 2026-08-19 [TOOL] Local handoff is clean: `codex/white-label-partner-portal` is assigned only to `/Users/leykwanchoo/Desktop/Projects/chat-saas`; incoming worktree-only formatting/logging changes were reconciled without feature loss, and Convex deployment reports functions ready.
