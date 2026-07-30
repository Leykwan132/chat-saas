# Restored Adjust Plan and Canceled Checkout Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore one root-owned Adjust Plan picker with contextual entrypoint labels, routing active subscriptions to Stripe Portal and canceled or missing subscriptions to Checkout.

**Architecture:** Replace the temporary Manage Plan context with an Adjust Plan provider at the authenticated application root. Pure helpers decide Portal versus Checkout from the latest subscription status, while separate presentation components render the plan picker and team Free warning so no dialogs are nested.

**Tech Stack:** React 19, TypeScript, React Router, Convex React, Stripe Checkout and Billing Portal, Vitest, shadcn Dialog and Button.

## Global Constraints

- Use Node v22 for every script and test.
- The credit meter action is exactly `Upgrade`.
- Settings → Plan uses exactly `Adjust plan`.
- Locked-feature cards and non-current plan cards use exactly `Change plan`.
- Active and trialing subscriptions use Stripe Portal.
- Canceled, cancelled, and missing subscriptions use Checkout for a selected paid plan.
- Other Stripe statuses use Portal and must not create a parallel subscription.
- Team Free selection shows one destructive warning before Portal.
- Public Pricing and onboarding retain Checkout.
- Stripe webhooks remain the billing source of truth.
- Keep every code file at or below 300 lines.
- Do not add comments.
- Do not modify or deploy production.

## File Structure

- Create `src/components/billing/adjustPlanFlow.ts` for status routing, warning decisions, and return-path construction.
- Create `src/components/billing/adjustPlanFlow.test.ts` for exhaustive routing decisions.
- Create `src/components/billing/adjustPlanContext.ts` for the stable `openAdjustPlan()` contract.
- Create `src/components/billing/AdjustPlanPickerDialog.tsx` for the controlled full-screen plan comparison.
- Create `src/components/billing/TeamFreePlanWarningDialog.tsx` for the controlled destructive warning.
- Create `src/components/billing/AdjustPlanProvider.tsx` for billing queries, dialog state, Portal/Checkout calls, loading, and errors.
- Create `src/components/billing/adjustPlanActions.test.ts` for entrypoint labels and retired Manage Plan contracts.
- Modify `src/router/AppRouteComponents.tsx` to mount `AdjustPlanProvider`.
- Modify signed-in plan and feature-limit callers to use `useAdjustPlan()`.
- Delete `src/components/billing/ManagePlanProvider.tsx`, `managePlanContext.ts`, `managePlanFlow.ts`, and `managePlanFlow.test.ts`.
- Do not modify Convex backend functions; `api.stripe.createPortal` and `api.stripe.createCheckout` remain stable.

---

### Task 1: Subscription-status routing decisions

**Files:**
- Create: `src/components/billing/adjustPlanFlow.ts`
- Create: `src/components/billing/adjustPlanFlow.test.ts`
- Delete after migration: `src/components/billing/managePlanFlow.ts`
- Delete after migration: `src/components/billing/managePlanFlow.test.ts`

**Interfaces:**
- Produces: `resolvePlanChangeDestination(status: string | null | undefined): "portal" | "checkout"`
- Produces: `shouldWarnBeforeFreeSelection(isTeam: boolean, selectedPlan: PlanKey): boolean`
- Produces: `buildAdjustPlanReturnPath(pathname: string, search: string): string`

- [ ] **Step 1: Write the failing routing tests**

```ts
import { describe, expect, test } from 'vitest';
import {
  buildAdjustPlanReturnPath,
  resolvePlanChangeDestination,
  shouldWarnBeforeFreeSelection,
} from './adjustPlanFlow';

describe('adjust plan flow', () => {
  test.each(['active', 'trialing', 'past_due', 'unpaid', 'incomplete'])(
    '%s subscriptions use Portal',
    (status) => {
      expect(resolvePlanChangeDestination(status)).toBe('portal');
    },
  );

  test.each(['canceled', 'cancelled', null, undefined])(
    '%s subscriptions use Checkout',
    (status) => {
      expect(resolvePlanChangeDestination(status)).toBe('checkout');
    },
  );

  test('only a team selecting Free receives the destructive warning', () => {
    expect(shouldWarnBeforeFreeSelection(true, 'free')).toBe(true);
    expect(shouldWarnBeforeFreeSelection(false, 'free')).toBe(false);
    expect(shouldWarnBeforeFreeSelection(true, 'growth')).toBe(false);
  });

  test('Stripe returns to the complete signed-in location', () => {
    expect(
      buildAdjustPlanReturnPath(
        '/dashboard/agent_123/settings',
        '?section=plan',
      ),
    ).toBe('/dashboard/agent_123/settings?section=plan');
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/components/billing/adjustPlanFlow.test.ts
```

Expected: FAIL because `adjustPlanFlow.ts` does not exist.

- [ ] **Step 3: Implement the routing helpers**

```ts
import type { PlanKey } from '../../../shared/planCatalog';

export type PlanChangeDestination = 'portal' | 'checkout';

export function resolvePlanChangeDestination(
  status: string | null | undefined,
): PlanChangeDestination {
  if (!status || status === 'canceled' || status === 'cancelled') {
    return 'checkout';
  }
  return 'portal';
}

export function shouldWarnBeforeFreeSelection(
  isTeam: boolean,
  selectedPlan: PlanKey,
): boolean {
  return isTeam && selectedPlan === 'free';
}

export function buildAdjustPlanReturnPath(
  pathname: string,
  search: string,
): string {
  return `${pathname}${search}`;
}
```

- [ ] **Step 4: Run the test and verify GREEN**

Run the command from Step 2.

Expected: 1 file and all routing cases pass.

- [ ] **Step 5: Commit Task 1**

```bash
git add src/components/billing/adjustPlanFlow.ts src/components/billing/adjustPlanFlow.test.ts
git commit -m "Add Adjust Plan routing decisions"
```

---

### Task 2: Root-owned Adjust Plan picker and team warning

**Files:**
- Create: `src/components/billing/adjustPlanContext.ts`
- Create: `src/components/billing/AdjustPlanPickerDialog.tsx`
- Create: `src/components/billing/TeamFreePlanWarningDialog.tsx`
- Create: `src/components/billing/AdjustPlanProvider.tsx`
- Create: `src/components/billing/AdjustPlanProvider.test.ts`
- Modify: `src/components/billing/managePlanContext.ts`
- Modify: `src/router/AppRouteComponents.tsx`
- Delete: `src/components/billing/ManagePlanProvider.tsx`

**Interfaces:**
- Consumes: `resolvePlanChangeDestination`, `shouldWarnBeforeFreeSelection`, and `buildAdjustPlanReturnPath` from Task 1.
- Produces: `useAdjustPlan(): { openAdjustPlan: () => void; isAdjustPlanLoading: boolean }`
- Consumes: `api.plans.getPlanAndUsage`, `api.stripe.createPortal`, and `api.stripe.createCheckout`.

- [ ] **Step 1: Write the failing provider contract**

```ts
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const providerSource = readFileSync(
  new URL('./AdjustPlanProvider.tsx', import.meta.url),
  'utf8',
);
const pickerSource = readFileSync(
  new URL('./AdjustPlanPickerDialog.tsx', import.meta.url),
  'utf8',
);
const warningSource = readFileSync(
  new URL('./TeamFreePlanWarningDialog.tsx', import.meta.url),
  'utf8',
);
const rootSource = readFileSync(
  new URL('../../router/AppRouteComponents.tsx', import.meta.url),
  'utf8',
);

test('owns one plan picker and routes Stripe sessions from the root', () => {
  expect(providerSource).toContain('api.stripe.createPortal');
  expect(providerSource).toContain('api.stripe.createCheckout');
  expect(providerSource).toContain('resolvePlanChangeDestination');
  expect(providerSource).toContain('shouldWarnBeforeFreeSelection');
  expect(providerSource).toContain('<AdjustPlanPickerDialog');
  expect(providerSource).toContain('<TeamFreePlanWarningDialog');
  expect(rootSource).toContain('<AdjustPlanProvider>');
  expect(rootSource).not.toContain('<ManagePlanProvider>');
});

test('keeps the picker and warning as separate controlled dialogs', () => {
  expect(pickerSource).toContain('Choose your plan');
  expect(pickerSource).toContain('Change plan');
  expect(pickerSource).not.toContain('TeamFreePlanWarningDialog');
  expect(warningSource).toContain('Confirm downgrade');
  expect(warningSource).toContain('Go back');
  expect(warningSource).toContain('Continue anyway');
  expect(warningSource).not.toContain('AdjustPlanPickerDialog');
});
```

- [ ] **Step 2: Run the provider contract and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/components/billing/AdjustPlanProvider.test.ts
```

Expected: FAIL because the provider and presentation files do not exist.

- [ ] **Step 3: Create the stable Adjust Plan context**

```ts
import { createContext, useContext } from 'react';

export type AdjustPlanContextValue = {
  openAdjustPlan: () => void;
  isAdjustPlanLoading: boolean;
};

export const AdjustPlanContext = createContext<
  AdjustPlanContextValue | undefined
>(undefined);

export function useAdjustPlan() {
  const context = useContext(AdjustPlanContext);
  if (!context) {
    throw new Error('useAdjustPlan must be used within AdjustPlanProvider');
  }
  return context;
}
```

- [ ] **Step 4: Create the controlled picker**

Implement `AdjustPlanPickerDialog` with this public contract:

```ts
type AdjustPlanPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: PlanKey;
  billingInterval: BillingInterval;
  onBillingIntervalChange: (interval: BillingInterval) => void;
  loadingPlan: PlanKey | null;
  onSelectPlan: (plan: PlanKey) => void;
};
```

Use the full-screen layout from commit `7ca663f9`'s `src/components/AdjustPlanDialog.tsx`, but keep it presentation-only:

```tsx
<SubscriptionPlanPicker
  variant="pricing"
  density="compact"
  compactSpacing="roomy"
  enterpriseLayout="column"
  includeEnterprise
  billingInterval={billingInterval}
  onBillingIntervalChange={onBillingIntervalChange}
  currentPlanId={currentPlan}
  disabled={loadingPlan !== null}
  renderPlanAction={(planCard) => {
    if (planCard.isEnterprise) {
      return <EnterprisePlanAction label="Contact our sales" />;
    }
    const planId = planCard.id as PlanKey;
    const isCurrent = planId === currentPlan;
    return (
      <SubscriptionPlanActionButton
        planId={planId}
        emphasizeRecommended={planId === 'growth'}
        isCurrentPlan={isCurrent}
        label={isCurrent ? 'Current plan' : 'Change plan'}
        disabled={isCurrent || loadingPlan !== null}
        loading={loadingPlan === planId}
        onClick={() => onSelectPlan(planId)}
      />
    );
  }}
/>
```

- [ ] **Step 5: Create the controlled team warning**

Use the existing three consequence rows and this public contract:

```ts
type TeamFreePlanWarningDialogProps = {
  open: boolean;
  loading: boolean;
  onGoBack: () => void;
  onContinue: () => void;
};
```

The footer is exactly:

```tsx
<DialogFooter>
  <Button variant="ghost" disabled={loading} onClick={onGoBack}>
    Go back
  </Button>
  <Button disabled={loading} onClick={onContinue}>
    {loading ? <Spinner /> : null}
    Continue anyway
  </Button>
</DialogFooter>
```

- [ ] **Step 6: Implement the provider routing**

The provider queries the billing state once and owns all dialog state:

```ts
const [pickerOpen, setPickerOpen] = useState(false);
const [warningOpen, setWarningOpen] = useState(false);
const [billingInterval, setBillingInterval] =
  useState<BillingInterval>('monthly');
const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);
```

The shared opener validates billing ownership:

```ts
const openAdjustPlan = useCallback(() => {
  if (!planAndUsage) {
    toast.error('Your billing profile is not available yet.');
    return;
  }
  if (!planAndUsage.canManageBilling) {
    toast.error('Only the workspace owner can adjust this plan.');
    return;
  }
  setPickerOpen(true);
}, [planAndUsage]);
```

Paid plan selection routes by the latest status:

```ts
const selectPlan = useCallback(
  (selectedPlan: PlanKey) => {
    if (!planAndUsage || selectedPlan === planAndUsage.plan) return;
    if (
      shouldWarnBeforeFreeSelection(
        planAndUsage.isTeam,
        selectedPlan,
      )
    ) {
      setPickerOpen(false);
      setWarningOpen(true);
      return;
    }
    if (
      selectedPlan !== 'free' &&
      resolvePlanChangeDestination(
        planAndUsage.stripeSubscriptionStatus,
      ) === 'checkout'
    ) {
      void openCheckout(selectedPlan);
      return;
    }
    void openPortal();
  },
  [openCheckout, openPortal, planAndUsage],
);
```

Checkout calls the existing paid-subscription action:

```ts
const session = await createCheckout({
  plan: selectedPlan,
  interval: billingInterval,
  mode: 'subscription',
  cancelPath: buildAdjustPlanReturnPath(
    window.location.pathname,
    window.location.search,
  ),
});
```

Portal uses the same return path. `onGoBack` closes the warning and reopens the picker. `onContinue` calls Portal while the warning remains visible; a successful request redirects, while a failure leaves the warning available for retry. Failed picker requests likewise keep the picker open and show a toast. `finally` clears `loadingPlan`.

- [ ] **Step 7: Mount the provider and remove the temporary provider**

In `AppRouteComponents.tsx`:

```tsx
<AdjustPlanProvider>
  <PostHogIdentifier />
  <ScrollToTop />
  <Outlet />
  <Toaster />
</AdjustPlanProvider>
```

Delete `ManagePlanProvider.tsx`. Keep existing callers working until Task 3 by changing `managePlanContext.ts` to this compatibility adapter:

```ts
import { useAdjustPlan } from './adjustPlanContext';

export function useManagePlan() {
  const { openAdjustPlan, isAdjustPlanLoading } = useAdjustPlan();
  return {
    openManagePlan: openAdjustPlan,
    isManagePlanLoading: isAdjustPlanLoading,
  };
}
```

- [ ] **Step 8: Run Task 1 and Task 2 tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/components/billing/adjustPlanFlow.test.ts src/components/billing/AdjustPlanProvider.test.ts
```

Expected: 2 files pass.

- [ ] **Step 9: Commit Task 2**

```bash
git add src/components/billing/adjustPlanContext.ts src/components/billing/AdjustPlanPickerDialog.tsx src/components/billing/TeamFreePlanWarningDialog.tsx src/components/billing/AdjustPlanProvider.tsx src/components/billing/AdjustPlanProvider.test.ts src/components/billing/managePlanContext.ts src/components/billing/ManagePlanProvider.tsx src/router/AppRouteComponents.tsx
git commit -m "Restore root Adjust Plan experience"
```

---

### Task 3: Contextual labels and signed-in caller migration

**Files:**
- Create: `src/components/billing/adjustPlanActions.test.ts`
- Modify: `src/components/CreditMeter.tsx`
- Modify: `src/components/PlanTab.tsx`
- Modify: `src/components/UpgradeModal.tsx`
- Modify: `src/components/analytics/PlanUsageCard.tsx`
- Modify: `src/components/analytics/PlanUsageCard.test.ts`
- Modify: `src/components/CreateTeamDialog.tsx`
- Modify: `src/components/TeamSwitcher.tsx`
- Modify: `src/components/TeamsAccountSubmenu.tsx`
- Modify: `src/components/teams/TeamsTableSection.tsx`
- Modify: `src/components/channels/WebWidgetSettingsPanel.tsx`
- Modify: `src/pages/CreateTeamPage.tsx`
- Modify: `src/pages/ChannelsPage.tsx`
- Modify: `src/pages/WorkspacePage.tsx`
- Modify: `src/lib/teamCreationGate.ts`
- Modify: `src/lib/agentCreationLimit.ts`
- Delete: `src/components/billing/ManagePlanProvider.tsx`
- Delete: `src/components/billing/managePlanContext.ts`
- Delete: `src/components/billing/managePlanFlow.ts`
- Delete: `src/components/billing/managePlanFlow.test.ts`

**Interfaces:**
- Consumes: `useAdjustPlan()` from Task 2.
- Produces: every signed-in plan action opens the shared picker.
- Preserves: extra-credit Checkout, public Pricing Checkout, and onboarding Checkout.

- [ ] **Step 1: Write the failing action-label contract**

```ts
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), 'utf8');

const creditMeter = read('../CreditMeter.tsx');
const planTab = read('../PlanTab.tsx');
const upgradeCard = read('../UpgradeModal.tsx');
const usageCard = read('../analytics/PlanUsageCard.tsx');
const migratedSources = [
  creditMeter,
  planTab,
  upgradeCard,
  usageCard,
  read('../CreateTeamDialog.tsx'),
  read('../TeamSwitcher.tsx'),
  read('../TeamsAccountSubmenu.tsx'),
  read('../teams/TeamsTableSection.tsx'),
  read('../channels/WebWidgetSettingsPanel.tsx'),
  read('../../pages/CreateTeamPage.tsx'),
  read('../../pages/ChannelsPage.tsx'),
  read('../../pages/WorkspacePage.tsx'),
];

test('uses contextual plan labels', () => {
  expect(creditMeter).toContain('Upgrade');
  expect(planTab).toContain('Adjust plan');
  expect(upgradeCard).toContain('Change plan');
  expect(usageCard).toContain('Adjust plan');
});

test('routes signed-in callers through the Adjust Plan context', () => {
  for (const source of migratedSources) {
    expect(source).not.toContain('useManagePlan');
    expect(source).not.toContain('openManagePlan');
    expect(source).not.toContain('Manage plan');
  }
  expect(migratedSources.some((source) =>
    source.includes('useAdjustPlan'),
  )).toBe(true);
});
```

- [ ] **Step 2: Run the contract and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/components/billing/adjustPlanActions.test.ts
```

Expected: FAIL on existing Manage Plan imports and labels.

- [ ] **Step 3: Migrate the primary labels**

Use `const { openAdjustPlan, isAdjustPlanLoading } = useAdjustPlan()` where loading UI exists.

Apply these exact labels:

```tsx
<button onClick={openAdjustPlan}>
  <Settings className="size-2.5" />
  Upgrade
</button>
```

```tsx
<Button onClick={openAdjustPlan} disabled={isAdjustPlanLoading}>
  {isAdjustPlanLoading ? <Spinner /> : null}
  Adjust plan
</Button>
```

```tsx
<Button onClick={openAdjustPlan} disabled={isAdjustPlanLoading}>
  {isAdjustPlanLoading ? <Spinner /> : null}
  Change plan
</Button>
```

`CreditMeter` uses the first, `PlanTab` and `PlanUsageCard` use the second, and `UpgradeCard` uses the third.

- [ ] **Step 4: Migrate all remaining signed-in callers**

Replace `useManagePlan`, `openManagePlan`, and callback parameters with `useAdjustPlan`, `openAdjustPlan`, and `openAdjustPlan`.

For team and agent limit toast fallbacks, use:

```ts
action: {
  label: 'Change plan',
  onClick: () => navigate(planPath),
}
```

These fallbacks remain only for callers that cannot access React context directly.

- [ ] **Step 5: Remove the temporary Manage Plan files**

Run:

```bash
rg -n "ManagePlanProvider|managePlanContext|managePlanFlow|useManagePlan|openManagePlan|Manage plan" src
```

Expected: no matches.

Delete:

```text
src/components/billing/ManagePlanProvider.tsx
src/components/billing/managePlanContext.ts
src/components/billing/managePlanFlow.ts
src/components/billing/managePlanFlow.test.ts
```

- [ ] **Step 6: Run the action and affected presentation tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/components/billing/adjustPlanActions.test.ts src/components/billing/adjustPlanFlow.test.ts src/components/billing/AdjustPlanProvider.test.ts src/components/analytics/PlanUsageCard.test.ts src/components/PlanTab.test.ts
```

Expected: 5 files pass.

- [ ] **Step 7: Commit Task 3**

```bash
git add src/components/CreditMeter.tsx src/components/PlanTab.tsx src/components/UpgradeModal.tsx src/components/analytics/PlanUsageCard.tsx src/components/analytics/PlanUsageCard.test.ts src/components/CreateTeamDialog.tsx src/components/TeamSwitcher.tsx src/components/TeamsAccountSubmenu.tsx src/components/teams/TeamsTableSection.tsx src/components/channels/WebWidgetSettingsPanel.tsx src/components/billing/adjustPlanActions.test.ts src/components/billing/managePlanContext.ts src/components/billing/managePlanFlow.ts src/components/billing/managePlanFlow.test.ts src/pages/CreateTeamPage.tsx src/pages/ChannelsPage.tsx src/pages/WorkspacePage.tsx src/lib/teamCreationGate.ts src/lib/agentCreationLimit.ts
git commit -m "Route signed-in actions through Adjust Plan"
```

---

### Task 4: Boundary and release verification

**Files:**
- Modify: `CONTINUITY.md`
- Test: all files created or modified in Tasks 1–3.

**Interfaces:**
- Verifies: status-based Checkout versus Portal routing.
- Verifies: contextual labels and one-dialog behavior.
- Verifies: public and onboarding Checkout boundaries remain unchanged.

- [ ] **Step 1: Prove Checkout boundaries**

Run:

```bash
rg -n "api\\.stripe\\.createCheckout|api\\.freeCheckout\\.create" src
```

Expected:

- `AdjustPlanProvider.tsx` creates paid Checkout only for canceled, cancelled, or missing subscriptions.
- `PlanTab.tsx` uses Checkout only for extra-credit payments.
- Pricing and onboarding retain initial-subscription Checkout.
- No locked-feature or team-limit caller creates Checkout directly.

- [ ] **Step 2: Run focused tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/components/billing/adjustPlanActions.test.ts src/components/billing/adjustPlanFlow.test.ts src/components/billing/AdjustPlanProvider.test.ts src/components/analytics/PlanUsageCard.test.ts src/components/PlanTab.test.ts convex/teamFreePriceUpdate.test.ts convex/teamSubscriptionDeletion.test.ts
```

Expected: all focused frontend and existing destructive-Free backend tests pass.

- [ ] **Step 3: Run static verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx eslint src/components/billing/adjustPlanContext.ts src/components/billing/adjustPlanFlow.ts src/components/billing/AdjustPlanProvider.tsx src/components/billing/AdjustPlanPickerDialog.tsx src/components/billing/TeamFreePlanWarningDialog.tsx src/components/CreditMeter.tsx src/components/PlanTab.tsx src/components/UpgradeModal.tsx src/components/analytics/PlanUsageCard.tsx
```

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bun run build
```

Run:

```bash
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 4: Verify module sizes and retired paths**

Run:

```bash
wc -l src/components/billing/adjustPlanContext.ts src/components/billing/adjustPlanFlow.ts src/components/billing/AdjustPlanProvider.tsx src/components/billing/AdjustPlanPickerDialog.tsx src/components/billing/TeamFreePlanWarningDialog.tsx
```

Expected: every code file is at or below 300 lines.

Run:

```bash
rg -n "ManagePlanProvider|managePlanContext|managePlanFlow|useManagePlan|openManagePlan|Manage plan" src
```

Expected: no matches.

- [ ] **Step 5: Verify authenticated rendered flows**

With a signed-in local session:

1. Click **Upgrade** above the credit meter and confirm the Adjust Plan picker opens.
2. Click **Adjust plan** in Settings and confirm the same picker opens.
3. Open a locked feature and click **Change plan**; confirm the same picker opens.
4. With an active or trialing subscription, click a non-current plan and confirm Stripe Portal opens.
5. With a canceled subscription, click a paid plan and confirm Checkout opens for that selected plan and interval.
6. In a team, select Free and confirm the picker closes before one warning appears.
7. Click **Go back** and confirm the picker returns without a Stripe redirect.
8. Reopen the warning, click **Continue anyway**, and confirm Portal opens.

- [ ] **Step 6: Update continuity**

Record the contextual labels, restored root picker, canceled/missing Checkout routing, active Portal routing, focused verification, authenticated-browser result, branch name, and that production remains untouched. Do not add a public changelog entry because production availability is unconfirmed.

- [ ] **Step 7: Commit verification records**

```bash
git add CONTINUITY.md
git commit -m "Record restored Adjust Plan verification"
```

- [ ] **Step 8: Final repository check**

Run:

```bash
git status --short
git log -6 --oneline
```

Expected: the branch is clean, local, and unpushed.
