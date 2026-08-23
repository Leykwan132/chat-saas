# CONTINUITY.md

# Snapshot
- 2026-08-19 [USER] Goal: ship an isolated white-label partner reseller portal where approved partners manage customer organizations, shared plans, manual credits, branding, and a single hostname without pricing or Stripe controls.
- 2026-08-23 [CODE] Now: `origin/main` at `5b551d8` is merged locally into the partner branch; its iframe-widget redesign and Messenger diagnostics are present.
- 2026-08-23 [CODE] Next: update the upstream stale widget and avatar test expectations before relying on a green full-suite baseline.
- 2026-08-19 [ASSUMPTION] This work is unshipped; no release changelog entry has been added.

# Decisions
- 2026-08-19 [USER] D734 ACTIVE: white-label state is isolated in dedicated partner tables; existing user, team, Stripe, and admin-session records remain unchanged except for ID-based relationships.
- 2026-08-19 [USER] D735 ACTIVE: shared plan limits/features/models take effect immediately; only the new monthly allowance starts at the customer organization’s next credit cycle.
- 2026-08-19 [USER] D736 ACTIVE: partner-created workspaces consume an organization wallet monthly allowance first, then durable manual grants; Stripe payment/top-up paths are blocked.
- 2026-08-19 [USER] D737 ACTIVE: partner managers retain WorkOS owner membership in each customer organization; default WorkOS invitation/reset emails remain the intentional v1 non-branded exception.
- 2026-08-19 [USER] D738 ACTIVE: Admin reports tokens, estimated USD AI cost, requests, and assigned-agent count for each partner from its customer organizations.
- 2026-08-19 [USER] D739 ACTIVE: partner authorization is account-level by normalized email, independent of the active workspace; PostHog controls portal visibility and direct-route rollout.
- 2026-08-19 [USER] D740 ACTIVE: partner-created customer workspaces are partner-managed; customer users cannot create teams, invite or remove members, or assign workspace roles through standard workspace controls.
- 2026-08-19 [TOOL] D741 ACTIVE: `stash@{0}` is an obsolete duplicate of the original worktree changes; do not apply it to the normal local partner branch because its contents are already superseded by committed local work.
- 2026-08-19 [USER] D742 ACTIVE: the portal is titled `Partner Programme` and has only Overview, Customers, and Branding in a vertical ghost-style navigation with icons and no divider or active line; every tab uses matching subtle `rounded-lg` bordered containers without shadows or rings, and its customer-control Select triggers/options use normal `text-sm` labels. Overview is aggregated/read-only with six bento metrics: Customers, Credits spent, Credits top-up, Starter plan, Growth plan, and Business plan; it has no table. Customers has three compact, icon-first actions with symmetric 24px horizontal padding and a bottom-right arrow for Create organization, Create customer, and Add credits; each opens a modal above the sole shadcn customer table and Empty state. The organization modal lists the selected plan's catalog inclusions below its selector. Branding owns logo/domain configuration.
- 2026-08-19 [USER] D743 ACTIVE: partner custom hostnames use the supplied Cloudflare SaaS zone, `kilobot.app` as the final CNAME target, and the supplied Cloudflare DCV delegation hostname; values will be stored only in Convex deployment environment variables.
- 2026-08-19 [USER] D744 ACTIVE: partner custom hostname setup supports CNAME-compatible subdomains only; apex domains are out of scope.
- 2026-08-19 [USER] D745 ACTIVE: customer-managed DNS stages require an explicit Done confirmation; only then may server-side polling begin for the relevant Cloudflare or DNS readiness check, and cutover remains blocked until hostname and certificate readiness are confirmed.
- 2026-08-19 [USER] D746 ACTIVE: the delegated DCV target is hostname-specific: `<custom-hostname>.a6627bf9414e7423.dcv.cloudflare.com`.
- 2026-08-19 [USER] D747 ACTIVE: custom-domain setup controls show an inline loading spinner while requests are in flight; partners may explicitly start over to remove the prior Cloudflare hostname/certificate and choose a replacement domain without changing their DNS records.
- 2026-08-19 [USER] D748 ACTIVE: custom-domain records expose labeled Type, Name, and Value fields without decorative icons; completion uses a solid Done action and persistent green check indicators, and the completed domain is shown in the setup modal.
- 2026-08-19 [USER] D749 ACTIVE: custom-domain record Type and Name fields share a row, Value sits below with an icon-only copy control, each field value has an individual neutral surface without an outer record container, checks are fully round, and Start over sits beside the hostname with its reset icon.
- 2026-08-19 [USER] D750 ACTIVE: DNS record fields use one responsive row with a narrow Type column and larger Name/Value columns; every field has an icon-only copy control and each DNS step instructs the partner to add the record at its DNS provider. The hostname is surfaced on a neutral pill beside an outlined Start over button.
- 2026-08-19 [USER] D751 ACTIVE: the DNS Type column is content-sized rather than fixed-width so its record value and copy control never wrap; Name and Value receive the remaining row width.
- 2026-08-19 [USER] D752 ACTIVE: after the content-sized Type column, Name and Value share equal-width grid tracks so long DNS record names receive the same space as their values.
- 2026-08-19 [USER] D753 ACTIVE: ownership DNS polling shows an inline spinner beside its checking message.
- 2026-08-20 [USER] D754 ACTIVE: the completed ownership message uses a compact 16px plain Lucide check beside its text, without a colored circular treatment.
- 2026-08-20 [USER] D755 ACTIVE: each visible Cloudflare certificate-checking message shows an inline spinner while issuance/readiness is pending.
- 2026-08-20 [USER] D756 ACTIVE: active domain-verification messages show the expectation “Usually takes a few minutes. DNS propagation can take longer.”
- 2026-08-20 [USER] D757 ACTIVE: customer organization, invitation, and credit submissions each show an inline spinner and prevent duplicate submission while pending; protected partner actions must use the normalized email persisted on the server when WorkOS JWTs omit an email claim.
- 2026-08-20 [USER] D758 ACTIVE: certificate checking may be explicitly resumed with a Check again control that starts an immediate fresh poll without changing the hostname or DNS records.
- 2026-08-20 [USER] D759 ACTIVE: Step 3 certificate issuance uses one concise inline spinner row, “Waiting for certificate…”, without duration guidance; the other verification states retain their existing guidance.
- 2026-08-20 [USER] D760 ACTIVE: completed custom-domain setup steps are collapsed, borderless accordions with a green check and expandable title, so the next required step remains the primary focus.

# Done (recent)
- 2026-08-19 [CODE] Reorganized the Partner Programme into icon-led ghost side navigation, rendered its Overview as six core metrics, placed the sole shadcn customer Table/Empty state in Customers beneath three compact icon-first modal actions with balanced horizontal insets, added selected-plan catalog inclusions to organization creation, standardized every tab on subtle bordered containers and readable dropdown labels, and added authenticated logo upload and persistence in Branding.
- 2026-08-19 [CODE] Resolved the interrupted stash merge: removed conflict markers from the Convex partner admin and portal modules, removed the duplicate membership index, and restored the feature-flag module without temporary logging.
- 2026-08-19 [CODE] Added isolated partners, access, organization mapping, append-only plan assignments, credit periods/grants/ledger/balances, and domain lifecycle tables.
- 2026-08-19 [CODE] Admin partner-owner lookup now handles duplicate user rows for the same email and returns each matching owner workspace.
- 2026-08-19 [CODE] Customer workspace menus, team settings, and invitations hide team/account-management controls; backend gates preserve Partner portal as the only staffing path.
- 2026-08-19 [CODE] Partner plans, AI usage, Stripe blocking, and portal access guard are isolated for partner-managed workspaces.
- 2026-08-20 [CODE] Refined custom-domain setup: completed steps are expandable collapsed accordions, checks and pending states are compact, certificate polling can be manually resumed, and partner submissions use persisted-email authorization with duplicate-submit prevention; this remains unshipped, so no release-changelog entry was added.

# Working set
- 2026-08-19 [CODE] `convex/schema.ts`
- 2026-08-19 [CODE] `convex/whiteLabel/`
- 2026-08-19 [CODE] `convex/credits.ts`
- 2026-08-19 [CODE] `convex/plans.ts`
- 2026-08-19 [CODE] `convex/teamStripePlanResolver.ts`
- 2026-08-19 [CODE] `convex/stripeBillingSessions.ts`
- 2026-08-19 [CODE] `src/pages/PartnerPage.tsx`
- 2026-08-19 [CODE] `src/components/partner/`
- 2026-08-19 [CODE] `src/components/admin/AdminPartnersTab.tsx`
- 2026-08-19 [CODE] `src/lib/whiteLabelApi.ts`
- 2026-08-19 [CODE] `docs/superpowers/specs/2026-08-19-partner-custom-hostnames-design.md`
- 2026-08-19 [CODE] `docs/superpowers/plans/2026-08-19-partner-custom-hostnames.md`

# Receipts
- 2026-08-19 [TOOL] Duplicate-email owner-workspace regression test and deployment pass; deployment continues to bypass unrelated pre-existing Convex TypeScript errors.
- 2026-08-19 [TOOL] Managed-workspace detection and customer invitation-block tests pass; app TypeScript, focused ESLint, and `git diff --check` pass; Convex dev deployment `outstanding-rabbit-215` reports functions ready.
- 2026-08-19 [TOOL] Live access check: `kwanrealtyofficial@gmail.com` has active partner access and passes the active PostHog rollout for both linked WorkOS identities; `leykwan132@gmail.com` has the rollout flag but no active partner access.
- 2026-08-19 [TOOL] Normal Desktop checkout merge artifacts were reconciled; local TypeScript and focused partner tests pass, and Convex dev deployment `outstanding-rabbit-215` reports functions ready.
- 2026-08-19 [TOOL] Local handoff is clean: `codex/white-label-partner-portal` is assigned only to `/Users/leykwanchoo/Desktop/Projects/chat-saas`; incoming worktree-only formatting/logging changes were reconciled without feature loss, and Convex deployment reports functions ready.
- 2026-08-19 [TOOL] Reapplying the obsolete handoff stash recreated only duplicate partner code, a duplicate schema index, and temporary logs; these were reconciled, with focused partner tests and TypeScript passing from the normal checkout.
- 2026-08-19 [TOOL] The repaired conflict state passes 8 focused tests and `tsc --noEmit`; no merge markers remain under `convex/` or `src/`, and both staged and unstaged diff checks pass.
- 2026-08-19 [TOOL] Partner Programme UI/API contract, partner access, conflict-regression, and feature-flag tests pass (11 tests); focused ESLint, `tsc --noEmit`, and staged/unstaged diff checks pass on Node v22.22.0.
- 2026-08-19 [TOOL] Overview styling/empty-state contract passes with focused ESLint, `tsc --noEmit`, and `git diff --check` on Node v22.22.0.
- 2026-08-19 [TOOL] Partner Programme flat-surface regression contract passes (3 tests); focused ESLint, `tsc --noEmit`, and staged/unstaged diff checks pass on Node v22.22.0.
- 2026-08-19 [TOOL] Partner Programme subtle-container regression contract passes (3 tests); focused ESLint, `tsc --noEmit`, and staged/unstaged diff checks pass on Node v22.22.0.
- 2026-08-19 [TOOL] Partner dropdown typography regression contract passes (4 tests); focused ESLint, `tsc --noEmit`, and staged/unstaged diff checks pass on Node v22.22.0.
- 2026-08-19 [TOOL] Six-metric Overview contract passes (5 tests); focused ESLint, `tsc --noEmit`, and staged/unstaged diff checks pass on Node v22.22.0. Convex deployment was not authorized by the environment after network authorization failed.
- 2026-08-19 [TOOL] Customer modal-action and table contract passes (6 tests); focused ESLint, `tsc --noEmit`, and staged/unstaged diff checks pass on Node v22.22.0.
- 2026-08-19 [TOOL] Square customer-action button contract passes (7 tests); focused ESLint, `tsc --noEmit`, and staged/unstaged diff checks pass on Node v22.22.0.
- 2026-08-19 [TOOL] Usage-insights Overview and Customer-only table contract passes (7 tests); focused ESLint, `tsc --noEmit`, and staged/unstaged diff checks pass on Node v22.22.0.
- 2026-08-19 [TOOL] Compact icon-first customer-action button contract passes (7 tests); focused ESLint, `tsc --noEmit`, and staged/unstaged diff checks pass on Node v22.22.0.
- 2026-08-19 [TOOL] Side-navigation, expanded Overview, plan-inclusions, and customer-action spacing contract passes (9 tests); focused ESLint, `tsc --noEmit`, and staged/unstaged diff checks pass on Node v22.22.0.
- 2026-08-19 [TOOL] Ghost side-navigation and six-metric Overview contract passes (9 tests); focused ESLint, `tsc --noEmit`, and staged/unstaged diff checks pass on Node v22.22.0.
- 2026-08-19 [TOOL] Customer action-card symmetric-padding contract passes (9 tests); focused ESLint, `tsc --noEmit`, and staged/unstaged diff checks pass on Node v22.22.0.
- 2026-08-19 [TOOL] Partner Overview response status-contract regression test (10 tests) and `tsc --noEmit` pass on Node v22.22.0 after explicitly returning the active discriminator for rows selected by the active-only index.
- 2026-08-19 [TOOL] Regenerated Convex API types and reran `tsc --noEmit` on Node v22.22.0; the reported `portal.getOverview` status-discriminator error no longer reproduces.
- 2026-08-19 [CODE] Hardened `portal.getOverview` by preserving each active-row status as the explicit `"active"` literal, avoiding Convex validator inference widening it to `string`; local generated-types TypeScript check passes. Convex deployment verification remains blocked pending explicit authorization because it uploads the repository.
- 2026-08-19 [CODE] Branding now exposes only a `Set up custom domain` button; its modal owns domain entry, muted gated ownership/DCV/TLS/cutover steps, explicit Done controls, DNS-record copying, and connected-domain preview/copy actions. Focused partner and hostname tests pass (20 tests), as do `tsc --noEmit` and diff validation.
- 2026-08-19 [CODE] Removed the redundant Branding save control; logo uploads now persist immediately. Focused Partner Programme tests, TypeScript, and diff validation pass.
- 2026-08-19 [CODE] Custom-hostname creation now authorizes an email-less WorkOS identity through its server-derived WorkOS user ID; temporary identity logging was removed. Regression test, TypeScript, and diff validation pass.
- 2026-08-19 [CODE] Auth context now exposes the normalized email persisted on the server-side user record to Node actions; hostname create/restart use it, matching the portal access path when WorkOS JWTs omit email. All console output was removed from the partner/hostname/auth paths. Focused suite passes (19 tests), with TypeScript and diff validation.
- 2026-08-19 [CODE] Added loading indicators to hostname/DNS confirmation controls and an explicitly confirmed Start over flow that deletes the prior Cloudflare custom hostname before removing the corresponding partner setup record. Focused suite passes (23 tests), alongside TypeScript and diff validation.
- 2026-08-19 [CODE] Expanded the custom-domain modal, labeled every DNS record field, replaced outline confirmations with solid Done actions, and retained completed steps with green checks and the connected hostname visible. Focused Partner Programme tests and TypeScript pass.
- 2026-08-19 [CODE] Refined custom-domain records into individually surfaced Type/Name/Value fields with icon-only value copy controls; rounded completion checks and moved Start over beside the hostname. Focused Partner Programme tests, TypeScript, and diff validation pass.
- 2026-08-19 [CODE] Reflowed each DNS record into one weighted responsive row with copy controls for Type, Name, and Value, added DNS-provider guidance, and surfaced the hostname beside its outlined restart control. Focused Partner Programme tests, TypeScript, and diff validation pass.
- 2026-08-19 [CODE] Replaced the fixed Type width with a content-sized grid track, keeping TXT and its copy control on one line while preserving available width for Name and Value. Focused Partner Programme tests, TypeScript, and diff validation pass.
- 2026-08-19 [CODE] Balanced the DNS record row by making Name and Value equal-width after the compact Type column. Focused Partner Programme tests, TypeScript, and diff validation pass.
- 2026-08-19 [CODE] Added an inline spinner to the ownership DNS polling status. Focused Partner Programme tests, TypeScript, and diff validation pass.
- 2026-08-20 [TOOL] Certificate issuance-status regression test, `tsc --noEmit`, and `git diff --check` pass on Node v22.22.0.
- 2026-08-20 [TOOL] Incoming `origin/main` at `3f44e70` includes PR #69, which persists workflow node positions after drag; its application code merged automatically.
- 2026-08-20 [CODE] Fixed personal-workspace plan resolution, manual schedule availability without shifts, stale route/sidebar tests, Growth-plan overview test fixtures, and Vitest exclusion of the separately executed Google Ads Node test; Node v22 typecheck, diff validation, and the full `bun run test` suite pass (502 Vitest files / 1,715 tests; 63 Node tests).
- 2026-08-20 [TOOL] Merged `origin/main` commit `208213f` (agent-scoped channel isolation); no application conflicts occurred, TypeScript and `bun run test` pass, and the only conflict was the continuity ledger.
- 2026-08-23 [TOOL] Merging `origin/main` at `5b551d8` produced only a continuity-ledger conflict. Full tests have 9 stale-expectation failures: eight still inspect the removed in-page widget after the intentional iframe redesign, and one expects closed web conversations to be reused despite the intentional new-session behavior.
