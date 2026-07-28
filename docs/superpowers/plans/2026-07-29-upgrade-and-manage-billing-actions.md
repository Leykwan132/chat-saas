# Upgrade and Manage Billing Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the credit-meter settings cog with a Rocket and add a direct Manage billing action beside Adjust plan.

**Architecture:** Keep billing side effects in the root Adjust Plan provider. Extract the Portal-session redirect boundary into a small tested helper, expose a direct `openBillingPortal` context action, and consume it only from Settings → Plan.

**Tech Stack:** React 19, TypeScript, Convex actions, Stripe Customer Portal, Lucide React, Vitest

## Global Constraints

- `Upgrade` continues to open the Adjust Plan picker.
- `Adjust plan` continues to open the Adjust Plan picker.
- `Manage billing` bypasses the picker and opens Stripe Customer Portal.
- Checkout, team-Free warnings, cancellation routing, public Pricing, and onboarding remain unchanged.
- Use Node.js 22 for every script and test.
- Keep every code file below 300 lines.

---

### Task 1: Direct Billing Portal Action

**Files:**
- Create: `src/components/billing/billingPortalNavigation.ts`
- Create: `src/components/billing/billingPortalNavigation.test.ts`
- Modify: `src/components/billing/adjustPlanContext.ts`
- Modify: `src/components/billing/AdjustPlanProvider.tsx`

**Interfaces:**
- Produces: `openBillingPortalNavigation(options): Promise<void>`
- Produces: `AdjustPlanContextValue.openBillingPortal: () => void`
- Consumes: existing `api.stripe.createPortal` action and provider return-path builder

- [ ] **Step 1: Write the failing Portal navigation test**

```ts
import { expect, test, vi } from 'vitest';
import { openBillingPortalNavigation } from './billingPortalNavigation';

test('opens the returned Stripe billing portal URL', async () => {
  const assign = vi.fn();

  await openBillingPortalNavigation({
    createPortal: async ({ returnPath }) => ({
      url: `https://billing.stripe.test?return=${encodeURIComponent(returnPath)}`,
    }),
    returnPath: '/workspace/settings?section=plan',
    assign,
  });

  expect(assign).toHaveBeenCalledWith(
    'https://billing.stripe.test?return=%2Fworkspace%2Fsettings%3Fsection%3Dplan',
  );
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/components/billing/billingPortalNavigation.test.ts
```

Expected: FAIL because `billingPortalNavigation` does not exist.

- [ ] **Step 3: Implement the Portal navigation boundary**

```ts
type CreatePortal = (args: {
  returnPath: string;
}) => Promise<{ url?: string | null } | null>;

export async function openBillingPortalNavigation({
  createPortal,
  returnPath,
  assign,
}: {
  createPortal: CreatePortal;
  returnPath: string;
  assign: (url: string) => void;
}) {
  const session = await createPortal({ returnPath });
  if (!session?.url) {
    throw new Error('Could not load billing portal.');
  }
  assign(session.url);
}
```

Update the provider's existing Portal callback to use the helper. Expose `openBillingPortal`, enforce the same billing-profile and owner checks as `openAdjustPlan`, and call the existing Portal callback with the current plan solely to reuse its loading state.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/components/billing/billingPortalNavigation.test.ts src/components/billing/adjustPlanFlow.test.ts
```

Expected: 2 test files pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/billing/billingPortalNavigation.ts src/components/billing/billingPortalNavigation.test.ts src/components/billing/adjustPlanContext.ts src/components/billing/AdjustPlanProvider.tsx
git commit -m "Expose direct billing portal action"
```

### Task 2: Upgrade and Settings Presentation

**Files:**
- Modify: `src/components/CreditMeter.tsx`
- Modify: `src/components/PlanTab.tsx`

**Interfaces:**
- Consumes: `useAdjustPlan().openBillingPortal`
- Preserves: `useAdjustPlan().openAdjustPlan`

- [ ] **Step 1: Replace the Upgrade icon**

Change the Lucide import from `Settings` to `Rocket`, then render:

```tsx
<Rocket className="size-2.5" />
```

Keep the existing `Upgrade` label, button style, and `openAdjustPlan` click handler.

- [ ] **Step 2: Add the secondary Manage billing action**

Read `openBillingPortal` from `useAdjustPlan()`. Beside the primary Adjust plan button, render:

```tsx
<Button
  type="button"
  size="sm"
  variant="outline"
  onClick={openBillingPortal}
  disabled={isAdjustPlanLoading}
>
  {isAdjustPlanLoading ? <Spinner /> : null}
  Manage billing
</Button>
```

- [ ] **Step 3: Run focused verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx vitest run src/components/billing/billingPortalNavigation.test.ts src/components/billing/adjustPlanFlow.test.ts src/components/PlanTab.test.ts
```

Expected: 3 test files pass.

- [ ] **Step 4: Run static verification**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bunx eslint src/components/billing/billingPortalNavigation.ts src/components/billing/billingPortalNavigation.test.ts src/components/billing/adjustPlanContext.ts src/components/billing/AdjustPlanProvider.tsx src/components/CreditMeter.tsx src/components/PlanTab.tsx
source ~/.nvm/nvm.sh && nvm use 22 >/dev/null && bun run build
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/CreditMeter.tsx src/components/PlanTab.tsx
git commit -m "Clarify upgrade and billing actions"
```
