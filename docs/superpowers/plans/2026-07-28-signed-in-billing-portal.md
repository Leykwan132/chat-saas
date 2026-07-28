# Signed-in Billing Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every signed-in upgrade and downgrade action with one **Manage plan** entrypoint that opens Stripe's customer portal, with a single pre-portal warning for team workspaces.

**Architecture:** A root-level `ManagePlanProvider` owns portal creation, loading, errors, and the team warning so no consumer can stack billing dialogs. Existing signed-in consumers call one `openManagePlan()` interface, while public pricing and onboarding retain Checkout. Stripe subscription updates to a configured Free price enter the same idempotent team cleanup path as subscription deletion.

**Tech Stack:** React 19, TypeScript, React Router, Convex, `@convex-dev/stripe`, Stripe Billing Portal, Vitest, shadcn Dialog and Button.

## Global Constraints

- Use Node v22 for every script and test.
- Every signed-in plan-change action is labeled `Manage plan`.
- Public pricing and onboarding continue using Checkout.
- Personal workspaces open Stripe's customer portal directly.
- Team workspaces first show one warning with `Go back` and `Continue anyway`.
- No billing dialog may be mounted inside another billing dialog.
- Stripe webhooks remain the source of truth; no local plan changes occur before a webhook.
- A Free-price subscription update and a subscription deletion share the existing idempotent destructive team cleanup lifecycle.
- Keep every code file at or below 300 lines.
- Preserve stable Convex function entrypoints and do not change production data.
- Do not add comments unless the behavior cannot be made self-explanatory.

## File Structure

- Create `src/components/billing/managePlanContext.ts` for the stable `openManagePlan()` context contract.
- Create `src/components/billing/managePlanFlow.ts` for pure team-warning routing decisions.
- Create `src/components/billing/ManagePlanProvider.tsx` for portal-session creation, one root warning dialog, loading, errors, and redirect.
- Create `src/components/billing/managePlanFlow.test.ts` for direct-vs-warning behavior.
- Create `src/components/billing/ManagePlanProvider.test.ts` for the provider, exact warning copy/actions, and no nested plan picker contract.
- Modify signed-in consumers to use `useManagePlan()` and the exact `Manage plan` label.
- Reduce `src/components/UpgradeModal.tsx` to its embedded locked-feature card and route its action through `openManagePlan()`.
- Delete the obsolete signed-in `AdjustPlanDialog`, its nested confirmation dialog, and the old upgrade-modal context after all imports are removed.
- Create `convex/stripeBillingSessions.ts` for Checkout and customer-portal action helpers extracted from the oversized `convex/stripe.ts`.
- Create `convex/stripeSubscriptionEvents.ts` for subscription-update and deletion transaction helpers.
- Keep `api.stripe.createCheckout`, `api.stripe.createPortal`, `internal.stripe.handleSubscriptionUpdatedInternal`, and `internal.stripe.handleSubscriptionDeletedInternal` registered at their current paths through thin wrappers.
- Extend `convex/teamSubscriptionDeletion.test.ts` with the paid-to-Free `customer.subscription.updated` regression.

---

### Task 1: Root-level Manage Plan flow

**Files:**
- Create: `src/components/billing/managePlanContext.ts`
- Create: `src/components/billing/managePlanFlow.ts`
- Create: `src/components/billing/managePlanFlow.test.ts`
- Create: `src/components/billing/ManagePlanProvider.tsx`
- Create: `src/components/billing/ManagePlanProvider.test.ts`
- Modify: `src/router/AppRouteComponents.tsx`

**Interfaces:**
- Produces: `useManagePlan(): { openManagePlan: () => void; isManagePlanLoading: boolean }`
- Produces: `resolveManagePlanStep(isTeam: boolean): "open_portal" | "warn_team"`
- Consumes: `api.plans.getPlanAndUsage`, `api.stripe.createPortal`, `window.location.pathname`, and `window.location.search`

- [ ] **Step 1: Write the failing decision test**

```ts
import { expect, test } from "vitest";
import { resolveManagePlanStep } from "./managePlanFlow";

test("personal workspaces open the billing portal directly", () => {
  expect(resolveManagePlanStep(false)).toBe("open_portal");
});

test("team workspaces warn before opening the billing portal", () => {
  expect(resolveManagePlanStep(true)).toBe("warn_team");
});
```

- [ ] **Step 2: Run the decision test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/components/billing/managePlanFlow.test.ts
```

Expected: FAIL because `managePlanFlow.ts` does not exist.

- [ ] **Step 3: Implement the minimal decision helper**

```ts
export type ManagePlanStep = "open_portal" | "warn_team";

export function resolveManagePlanStep(isTeam: boolean): ManagePlanStep {
  return isTeam ? "warn_team" : "open_portal";
}
```

- [ ] **Step 4: Run the decision test and verify GREEN**

Run the command from Step 2.

Expected: 1 file and 2 tests pass.

- [ ] **Step 5: Write the failing provider contract**

The test reads `ManagePlanProvider.tsx` and `AppRouteComponents.tsx` and asserts:

```ts
expect(providerSource).toContain("api.stripe.createPortal");
expect(providerSource).toContain("resolveManagePlanStep(planAndUsage.isTeam)");
expect(providerSource).toContain("Manage your team plan");
expect(providerSource).toContain("Continue anyway");
expect(providerSource).toContain("Go back");
expect(providerSource).toContain("conversations and contacts");
expect(providerSource).toContain("agents and their threads");
expect(providerSource).toContain("connected channels");
expect(providerSource).not.toContain("AdjustPlanDialog");
expect(rootSource).toContain("<ManagePlanProvider>");
expect(rootSource).not.toContain("<UpgradeModalProvider>");
```

- [ ] **Step 6: Run the provider contract and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/components/billing/ManagePlanProvider.test.ts
```

Expected: FAIL because the provider and root integration do not exist.

- [ ] **Step 7: Implement the provider and stable context**

`managePlanContext.ts` exports a context whose only mutation entrypoint is:

```ts
export type ManagePlanContextValue = {
  openManagePlan: () => void;
  isManagePlanLoading: boolean;
};
```

`ManagePlanProvider.tsx`:

- queries `api.plans.getPlanAndUsage`;
- calls `api.stripe.createPortal` with the current signed-in path as `returnPath`;
- opens the portal immediately for Personal;
- opens one root-level warning dialog for Team;
- closes the dialog without a request on `Go back`;
- calls the same portal function on `Continue anyway`;
- prevents duplicate requests while loading;
- preserves the dialog and shows a toast if portal creation fails;
- renders no `AdjustPlanDialog` or plan picker.

Replace `UpgradeModalProvider` with `ManagePlanProvider` in `AppRootLayout`.

- [ ] **Step 8: Run both Task 1 tests and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/components/billing/managePlanFlow.test.ts src/components/billing/ManagePlanProvider.test.ts
```

Expected: both files pass with no warnings.

- [ ] **Step 9: Commit Task 1**

```bash
git add src/components/billing/managePlanContext.ts src/components/billing/managePlanFlow.ts src/components/billing/managePlanFlow.test.ts src/components/billing/ManagePlanProvider.tsx src/components/billing/ManagePlanProvider.test.ts src/router/AppRouteComponents.tsx
git commit -m "Add shared Manage plan portal flow"
```

### Task 2: Migrate every signed-in plan action

**Files:**
- Create: `src/components/billing/signedInPlanActions.test.ts`
- Modify: `src/components/PlanTab.tsx`
- Modify: `src/components/CreditMeter.tsx`
- Modify: `src/components/UpgradeModal.tsx`
- Modify: `src/components/PlanFeatureGate.tsx`
- Modify: `src/components/channels/WebWidgetSettingsPanel.tsx`
- Modify: `src/components/CreateTeamDialog.tsx`
- Modify: `src/components/TeamSwitcher.tsx`
- Modify: `src/components/TeamsAccountSubmenu.tsx`
- Modify: `src/components/teams/TeamsTableSection.tsx`
- Modify: `src/pages/CreateTeamPage.tsx`
- Modify: `src/pages/ChannelsPage.tsx`
- Modify: `src/pages/WorkspacePage.tsx`
- Modify: `src/lib/teamCreationGate.ts`
- Modify: `src/config/upgradeScenarios.ts`
- Delete: `src/components/AdjustPlanDialog.tsx`
- Delete: `src/components/billing/ConfirmTeamDowngradeDialog.tsx`
- Delete: `src/components/billing/ConfirmTeamDowngradeDialog.test.tsx`
- Delete: `src/components/upgradeModalContext.ts`
- Delete: `src/components/upgradeModalContext.test.ts`
- Delete: `src/components/upgradeModalOpen.test.ts`

**Interfaces:**
- Consumes: `useManagePlan()` from Task 1.
- Preserves: feature-gate explanatory cards and plan-limit messaging.
- Removes: signed-in Checkout selection, custom Free downgrade invocation, and nested billing dialogs.

- [ ] **Step 1: Write the failing signed-in action contract**

The new test scans the signed-in files and asserts:

```ts
for (const source of signedInActionSources) {
  expect(source).not.toContain("AdjustPlanDialog");
  expect(source).not.toContain("openUpgradeModal");
  expect(source).not.toContain("useUpgradeModal");
}

expect(planTabSource).toContain("Manage plan");
expect(planTabSource).toContain("openManagePlan");
expect(planTabSource).not.toContain("Adjust plan");
expect(planTabSource).not.toContain("Billing portal");
expect(creditMeterSource).toContain("Manage plan");
expect(upgradeCardSource).toContain("Manage plan");
expect(upgradeCardSource).toContain("openManagePlan");
expect(webWidgetSource).toContain("openManagePlan");
```

The test checks the button-bearing signed-in sources and rejects user-facing action literals matching:

```ts
/\b(Upgrade plan|Upgrade to|Downgrade to|Adjust plan|Billing portal)\b/
```

Marketing sentences, onboarding, public pricing, and backend reason text are outside this action-label assertion.

- [ ] **Step 2: Run the action contract and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/components/billing/signedInPlanActions.test.ts
```

Expected: FAIL on the current Adjust Plan, Billing portal, Upgrade plan, and upgrade-modal paths.

- [ ] **Step 3: Migrate Plan settings and credit surfaces**

In `PlanTab.tsx`:

- remove local Adjust Plan state and `AdjustPlanDialog`;
- replace the two plan controls with one `Manage plan` button;
- call `openManagePlan`;
- disable the button from `isManagePlanLoading`.

In `CreditMeter.tsx`:

- remove local dialog state and `AdjustPlanDialog`;
- change `Upgrade plan` to `Manage plan`;
- call `openManagePlan`.

In `WebWidgetSettingsPanel.tsx`:

- remove local Adjust Plan state and component;
- pass `openManagePlan` to `WebWidgetBrandingSection`.

- [ ] **Step 4: Migrate feature gates and team-limit entrypoints**

Reduce `UpgradeModal.tsx` to the embedded feature card and make its action:

```tsx
const { openManagePlan, isManagePlanLoading } = useManagePlan();

<Button onClick={openManagePlan} disabled={isManagePlanLoading}>
  {isManagePlanLoading ? <Spinner /> : null}
  Manage plan
</Button>
```

Keep the explanatory title, description, and feature marquee used by `PlanFeatureGate`.

Replace every `useUpgradeModal`/`openUpgradeModal` caller with `useManagePlan`/`openManagePlan`. Rename `handleCreateTeamGate`'s optional callback to `openManagePlan`, and change its toast action label from `Upgrade` to `Manage plan`.

Remove `buttonLabel` from `UpgradeScenarioConfig`; the embedded card owns the common label.

- [ ] **Step 5: Delete obsolete modal files and verify no imports remain**

Run:

```bash
rg -n "AdjustPlanDialog|ConfirmTeamDowngradeDialog|upgradeModalContext|UpgradeModalProvider|useUpgradeModal|openUpgradeModal" src
```

Expected: no matches.

- [ ] **Step 6: Run the action contract and affected UI tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/components/billing/signedInPlanActions.test.ts src/components/analytics/PlanUsageCard.test.ts src/lib/creditMeterProgress.test.ts
```

Expected: all three files pass.

- [ ] **Step 7: Commit Task 2**

Stage only the files listed in Task 2, then commit:

```bash
git commit -m "Route signed-in plan actions to Stripe portal"
```

### Task 3: Handle portal changes to Free from Stripe updates

**Files:**
- Create: `convex/stripeBillingSessions.ts`
- Create: `convex/stripeSubscriptionEvents.ts`
- Modify: `convex/stripe.ts`
- Modify: `convex/teamSubscriptionDeletion.test.ts`

**Interfaces:**
- Preserves: `api.stripe.createCheckout`
- Preserves: `api.stripe.createPortal`
- Preserves: `internal.stripe.handleSubscriptionUpdatedInternal`
- Preserves: `internal.stripe.handleSubscriptionDeletedInternal`
- Produces: `handleSubscriptionUpdated(ctx, args): Promise<void>`
- Produces: `handleSubscriptionDeleted(ctx, args): Promise<{ accepted: true; duplicate: boolean }>`

- [ ] **Step 1: Write the failing portal-Free webhook regression**

Add a test fixture with:

- an organizational team whose `stripeSubscriptionId` is `sub_team`;
- an owner currently on the Growth price with an active 15,000-credit period;
- a Personal workspace;
- the owner actively inside the organizational team.

Invoke:

```ts
await t.mutation(internal.stripe.handleSubscriptionUpdatedInternal, {
  orgId: "org_team",
  stripeSubscriptionId: "sub_team",
  stripeCustomerId: "cus_owner",
  status: "active",
  priceId: "price_free_monthly",
  currentPeriodEnd: 1_900_000_000,
});
```

Assert:

```ts
expect(team?.deletionStatus).toBe("deleting");
expect(owner?.activeTeamId).toBe(personalTeamId);
expect(owner?.stripeSubscriptionId).toBe("sub_team");
expect(owner?.stripePriceId).toBe("price_free_monthly");
expect(owner?.stripeSubscriptionStatus).toBe("active");
expect(creditPeriod?.planKey).toBe("free");
expect(creditPeriod?.grantedCredits).toBe(50);
expect(jobs).toHaveLength(1);
```

Invoke the same update again and assert the second delivery creates no second job or credit reset.

- [ ] **Step 2: Run the webhook regression and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && STRIPE_PRICE_FREE_MONTHLY=price_free_monthly STRIPE_PRICE_FREE_ANNUAL=price_free_annual STRIPE_PRICE_STARTER_MONTHLY=price_starter_monthly STRIPE_PRICE_STARTER_ANNUAL=price_starter_annual STRIPE_PRICE_GROWTH_MONTHLY=price_growth_monthly STRIPE_PRICE_GROWTH_ANNUAL=price_growth_annual STRIPE_PRICE_BUSINESS_MONTHLY=price_business_monthly STRIPE_PRICE_BUSINESS_ANNUAL=price_business_annual bunx vitest run convex/teamSubscriptionDeletion.test.ts
```

Expected: FAIL because an active Free-price update currently synchronizes billing without requesting team deletion.

- [ ] **Step 3: Extract billing-session helpers while preserving action paths**

Define these exact argument types in `stripeBillingSessions.ts`:

```ts
export type CreateCheckoutArgs = {
  plan?: string;
  interval?: "monthly" | "annual";
  mode: "subscription" | "payment";
  extraCreditsPackId?: "credits_2000" | "credits_5000" | "credits_15000";
  orgId?: string | null;
  cancelPath?: string;
};

export type CreatePortalArgs = {
  orgId?: string | null;
  returnPath?: string;
};
```

Move the statements from the current `createCheckout` and `createPortal` handlers into exported `createCheckoutForBillingUser(ctx, args)` and `createPortalForBillingUser(ctx, args)` functions in the same order. Move their private `stripeClient`, `BillingUserRecord`, and `isPaidPlanKey` dependencies with them. Do not change session parameters, metadata, authentication, customer lookup, URLs, or promotion-code behavior.

Keep the current public action validators and exports in `stripe.ts`, changing only their handlers:

```ts
handler: async (ctx, args) =>
  await createCheckoutForBillingUser(ctx, args),
```

```ts
handler: async (ctx, args) =>
  await createPortalForBillingUser(ctx, args),
```

This preserves generated API paths while reducing `stripe.ts` below 300 lines.

- [ ] **Step 4: Extract subscription event transactions**

Move the current subscription update/deletion transaction bodies into `stripeSubscriptionEvents.ts`. Keep thin registered wrappers in `stripe.ts`.

In the update helper:

1. resolve `plan` from status and price;
2. synchronize the owner subscription fields;
3. ensure the current credit period exists;
4. when the workspace is organizational, the subscription is active/trialing, and `plan === "free"`, call:

```ts
await requestTeamDeletion(ctx, {
  workosOrgId: args.orgId,
  stripeSubscriptionId: args.stripeSubscriptionId,
  source: "stripe",
  preserveOwnerSubscription: true,
});
return;
```

5. retain the existing paid-plan credit-increase behavior for non-Free updates.

The team subscription ID must be synchronized before requesting deletion so the stale-event guard accepts the current subscription. Repeated updates rely on the existing deletion-status and tombstone idempotency.

- [ ] **Step 5: Run subscription lifecycle tests and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && STRIPE_PRICE_FREE_MONTHLY=price_free_monthly STRIPE_PRICE_FREE_ANNUAL=price_free_annual STRIPE_PRICE_STARTER_MONTHLY=price_starter_monthly STRIPE_PRICE_STARTER_ANNUAL=price_starter_annual STRIPE_PRICE_GROWTH_MONTHLY=price_growth_monthly STRIPE_PRICE_GROWTH_ANNUAL=price_growth_annual STRIPE_PRICE_BUSINESS_MONTHLY=price_business_monthly STRIPE_PRICE_BUSINESS_ANNUAL=price_business_annual bunx vitest run convex/teamSubscriptionDeletion.test.ts convex/freePlanDowngrade.test.ts convex/freePlanSubscriptionUpdate.test.ts
```

Expected: all lifecycle tests pass, including the new update-to-Free regression and the existing deletion regression.

- [ ] **Step 6: Verify stable Convex exports and module size**

Run:

```bash
rg -n "export const (createCheckout|createPortal|handleSubscriptionUpdatedInternal|handleSubscriptionDeletedInternal)" convex/stripe.ts
wc -l convex/stripe.ts convex/stripeBillingSessions.ts convex/stripeSubscriptionEvents.ts
```

Expected: all four stable exports remain in `convex/stripe.ts`; every listed code file is at or below 300 lines.

- [ ] **Step 7: Commit Task 3**

```bash
git add convex/stripe.ts convex/stripeBillingSessions.ts convex/stripeSubscriptionEvents.ts convex/teamSubscriptionDeletion.test.ts
git commit -m "Handle Stripe portal changes to Free"
```

### Task 4: Boundary and release verification

**Files:**
- Modify: `CONTINUITY.md`
- Test: all files created or modified in Tasks 1–3

**Interfaces:**
- Verifies: signed-in portal-only behavior.
- Verifies: onboarding/public Checkout behavior remains intact.
- Verifies: configured-development Convex upload only.

- [ ] **Step 1: Prove Checkout remains limited to initial subscription creation and top-ups**

Run:

```bash
rg -n "api\\.stripe\\.createCheckout|api\\.freeCheckout\\.create" src
```

Expected: subscription Checkout callers remain in onboarding/public pricing; signed-in Plan settings and feature-limit surfaces do not create subscription Checkout sessions. Extra-credit Checkout remains in Plan settings.

- [ ] **Step 2: Run focused frontend and backend tests**

Run the union of the Task 1–3 tests under Node v22. All tests must pass without warnings.

- [ ] **Step 3: Run static verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx eslint src/components/billing/managePlanContext.ts src/components/billing/managePlanFlow.ts src/components/billing/ManagePlanProvider.tsx src/components/PlanTab.tsx src/components/CreditMeter.tsx src/components/UpgradeModal.tsx src/components/PlanFeatureGate.tsx src/components/channels/WebWidgetSettingsPanel.tsx && bunx tsc -b --pretty false && git diff --check
```

Expected: exit 0.

- [ ] **Step 4: Regenerate and upload the configured development Convex functions**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx convex codegen && bunx convex dev --once
```

Expected: code generation, typechecking, and the configured development upload succeed. Do not pass `--prod`.

- [ ] **Step 5: Verify the rendered flows**

With the local app authenticated:

1. In Personal, click **Manage plan** and confirm Stripe opens without an application warning.
2. In Team, click **Manage plan** and confirm exactly one warning appears.
3. Click **Go back** and confirm no redirect occurs.
4. Reopen it, click **Continue anyway**, and confirm Stripe opens.
5. Confirm no Adjust Plan dialog or second overlay appears.
6. Confirm Stripe's portal configuration presents subscription plan changes, including the configured Free monthly and annual prices.

- [ ] **Step 6: Update continuity without publishing a changelog entry**

Record:

- the common signed-in `Manage plan` behavior;
- the resolved nested-modal incident;
- the update-to-Free webhook cleanup behavior;
- focused test, TypeScript, and development-upload receipts;
- production remained untouched.

Do not update `kilobot-docs/docs/releases/changelog.mdx` because production availability is not confirmed.

- [ ] **Step 7: Commit verification records**

```bash
git add CONTINUITY.md
git commit -m "Record Manage plan verification"
```

- [ ] **Step 8: Final repository check**

Run:

```bash
git status --short
git log -5 --oneline
```

Expected: only pre-existing user-owned changes remain unstaged; the implementation commits are local and not pushed.
